#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <syslog.h>
#include <signal.h>
#include <sys/types.h>
#include <dirent.h>
#include <sys/mount.h>

#include "freetether.h"
#include "luna_methods.h"

#ifndef APP_ID
#error Must define APP_ID macro
#endif

struct iface_info ifaceInfo;

static int sys_info_init() {
  memset(&ifaceInfo, 0, sizeof(ifaceInfo));
  pthread_mutex_init(&ifaceInfo.mutex, NULL); 

  ifaceInfo.bridge = malloc(strlen(DEFAULT_BRIDGE) + 1);
  strcpy(ifaceInfo.bridge, DEFAULT_BRIDGE);
  ifaceInfo.ip = malloc(strlen(DEFAULT_IP) + 1);
  strcpy(ifaceInfo.ip, DEFAULT_IP);
  ifaceInfo.subnet = malloc(strlen(DEFAULT_SUBNET) + 1);
  strcpy(ifaceInfo.subnet, DEFAULT_SUBNET);
  ifaceInfo.poolstart = malloc(strlen(DEFAULT_POOLSTART) + 1);
  strcpy(ifaceInfo.poolstart, DEFAULT_POOLSTART);

  return 0;
}

void cleanup() {
  ip_forward_cleanup();
  if (is_mounted("/usr/bin/mobilehotspotd")==1)
    umount("/usr/bin/mobilehotspotd");
  system("ifconfig bridge0 down");
  system("brctl delbr bridge0");
}

void sighandler(int sig) {
  cleanup();
  exit(0);
}

int get_pid_by_name(const char* name) {
  int pid = 0;
  DIR *procdir;
  FILE *statusfile;
  struct dirent *procent;
  char statuspath[128];
  char pidname[16];
  procdir = opendir("/proc");
  if (procdir != NULL) {
    while (pid==0 && (procent = readdir(procdir)) != NULL) {
      if ((int)procent->d_name[0]>47 && (int)procent->d_name[0]<58) {
        snprintf(statuspath, 128, "/proc/%s/status", procent->d_name);
        statusfile = fopen(statuspath, "r");
        if (statusfile == NULL) {
          syslog(LOG_ERR, "error[fopen] in get_pid_by_name()");
          pid = -1;
        } else {
          fscanf(statusfile, "%*s%s", pidname);
          if (strcmp(name,pidname)==0) {
            pid = atoi(procent->d_name);
          }
          fclose(statusfile);
        }
      }
    }
    closedir(procdir);
  } else {
    syslog(LOG_ERR, "error[opendir] in get_pid_by_name()");
    pid = -1;
  }
  return pid;
}

int is_mounted(const char* dest) {
  int ret = 0;
  FILE *mountsfile;
  char tmpdest[4096];
  mountsfile = fopen("/proc/mounts", "r");
  if (mountsfile == NULL) {
    syslog(LOG_ERR, "error[fopen] in is_mounted()");
    ret = -1;
  } else {
    while (ret == 0 && fscanf(mountsfile, "%*s%s%*s%*d%*d", tmpdest) != EOF) {
      if (strcmp(dest,tmpdest)==0)
        ret = 1;
    }
    fclose(mountsfile);
  }
  return ret;
}

int main(int argc, char **argv) {

  syslog(LOG_DEBUG, "FREETETHER SERVICE START");
  pthread_t ipmon_tid;
  pthread_t usbgadgetmon_tid;

  signal(SIGINT, sighandler);
  signal(SIGTERM, sighandler);
  signal(SIGQUIT, sighandler);
  signal(SIGHUP, sighandler);
  signal(SIGKILL, sighandler);

  openlog(APP_ID, LOG_PID, LOG_USER);

  int ret = is_mounted("/usr/bin/mobilehotspotd");
  if (ret == -1) return -1;
  else if (ret == 0 && mount("/bin/true", "/usr/bin/mobilehotspotd", NULL, MS_BIND, NULL)) {
    syslog(LOG_ERR, "Failed binding /bin/true to /usr/bin/mobilehotspotd");
    return -1;
  }
  ret = get_pid_by_name("mobilehotspotd");
  if (ret == -1) return -1;
  else if (ret > 0) kill(ret, SIGKILL);

  if (!sys_info_init() && luna_service_initialize(APP_ID)) {
    pthread_create(&ipmon_tid, NULL, ipmon_thread, NULL);
    pthread_create(&usbgadgetmon_tid, NULL, usbgadgetmon_thread, NULL);
    luna_service_start();
  }

  return 0;
}
