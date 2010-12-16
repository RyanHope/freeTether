#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <syslog.h>
#include <signal.h>

#include "freetether.h"
#include "luna_methods.h"

#ifndef APP_ID
#error Must define APP_ID macro
#endif

struct iface_info ifaceInfo;

static int sys_info_init() {
  memset(&ifaceInfo, 0, sizeof(ifaceInfo));
  pthread_mutex_init(&ifaceInfo.mutex, NULL); 
  pthread_cond_init (&ifaceInfo.state_change, NULL);

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
}

void sighandler(int sig) {
  cleanup();
  exit(0);
}

int main(int argc, char **argv) {
  pthread_t ipmon_tid;

  signal(SIGINT, sighandler);
  signal(SIGTERM, sighandler);
  signal(SIGQUIT, sighandler);
  signal(SIGHUP, sighandler);
  signal(SIGKILL, sighandler);

  openlog(APP_ID, LOG_PID, LOG_USER);

  // TODO: use c not system
  system("mount --bind /bin/true /usr/bin/mobilehotspotd && killall -9 mobilehotspot");

  if (!sys_info_init() && luna_service_initialize(APP_ID)) {
    pthread_create(&ipmon_tid, NULL, ipmon_thread, NULL);
    luna_service_start();
  }

  return 0;
}
