#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <syslog.h>
#include <sys/mount.h>
#include <sys/inotify.h>

#include "luna_methods.h"
#include "luna_service.h"

#define IP_FORWARD "/proc/sys/net/ipv4/ip_forward"

#define BUF_SIZE (32*(sizeof(struct inotify_event)+16))

int monitor_ip_forward;
char *tmpProc;
char *tmp_ip_forward;

void ip_forward_cleanup() {
  monitor_ip_forward = 0;
  cleanup_fake_proc();
}

int get_ip_forward_state() {
  FILE *fp;
  int state = -1;

  fp = fopen(tmp_ip_forward, "r");
  if (!fp) {
    syslog(LOG_ERR, "Error opening %s for reading", tmp_ip_forward);
    return -1;
  }

  fscanf(fp, "%d", &state);
  fclose(fp);

  return state;
}

bool get_ip_forward(LSHandle* lshandle, LSMessage *message, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  int len = 0;

  bool subscribed = false;
  LSSubscriptionProcess(lshandle,message,&subscribed,&lserror);

  char *tmp = 0;
  len = asprintf(&tmp, "{\"returnValue\":true,\"state\":%d}", get_ip_forward_state());
  if (tmp)
    LSMessageReply(lshandle,message,tmp,&lserror);
  else
    LSMessageReply(lshandle,message,"{\"returnValue\":false}",&lserror);

  if (LSErrorIsSet(&lserror)) {
    LSErrorPrint(&lserror, stderr);
    LSErrorFree(&lserror);
  }

  return true;
}

int toggle_ip_forward_state() {
  FILE *fp;
  int ret = -1;
  int state;
  int count = 0;
  int i;

  fp = fopen(tmp_ip_forward, "w+");

  if (!fp) {
    syslog(LOG_ERR, "Cannot open %s for writing", tmp_ip_forward);
    return -1;
  }

  fscanf(fp, "%d", &state);
  state ^= 1;

  for (i=0; i<5; i++) {
    if (ret == 1)
      break;
    ret = fprintf(fp, "%d", state);
  }

  syslog(LOG_DEBUG, "Tried to write state %d times, final ret %d\n", i, ret);
  fclose(fp);

  return 0;
}

bool toggle_ip_forward(LSHandle* lshandle, LSMessage *message, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  int len = 0;

  char *tmp = 0;
  len = asprintf(&tmp, "{\"returnValue\":true,\"state\":%c}", (char)toggle_ip_forward_state());
  if (tmp)
    LSMessageReply(lshandle,message,tmp,&lserror);
  else
    LSMessageReply(lshandle,message,"{\"returnValue\":false}",&lserror);

  if (LSErrorIsSet(&lserror)) {
    LSErrorPrint(&lserror, stderr);
    LSErrorFree(&lserror);
  }

  return true;
}

void *ipmon_thread(void *ptr) {

  LSError lserror;
  LSErrorInit(&lserror);

  int fd = inotify_init();
  if (fd<0) {
    syslog(LOG_ERR, "inotify_init failed");
    return;
  }

  int wd = inotify_add_watch(fd, tmp_ip_forward, IN_CLOSE_WRITE);
  if (wd<0) {
    syslog(LOG_ERR, "inotify_add_watch failed");
    return;
  }

  char buf[BUF_SIZE], *tmp = 0;
  int len = 0, state = 0;
  FILE *fp;

  monitor_ip_forward = 1;
  while (monitor_ip_forward) {
    len = read (fd, buf, BUF_SIZE);
    if (len > 0) {
      fp = fopen(tmp_ip_forward, "r");
      if (fp) {
        fscanf(fp, "%d", &state);
        fclose(fp);
        syslog(LOG_DEBUG, "monitor thread state %d", state);
        len = asprintf(&tmp, "{\"returnValue\":true,\"state\":%d}", state);
        if (tmp) {
          LSSubscriptionRespond(serviceHandle,"/get_ip_forward",tmp, &lserror);
          free(tmp);
        }
      }
    }
  }

  if (LSErrorIsSet(&lserror)) {
    LSErrorPrint(&lserror, stderr);
    LSErrorFree(&lserror);
  }

}

void setup_fake_proc() {

  char template[] = "/tmp/freeTether.XXXXXX";
  tmpProc = strdup(mkdtemp(template));

  asprintf(&tmp_ip_forward,"%s/sys/net/ipv4/ip_forward", tmpProc);

  mount("/dev/null", IP_FORWARD, NULL, MS_BIND, NULL);
  mount("proc", tmpProc, "proc", 0, NULL);

}

void cleanup_fake_proc() {

  umount(tmpProc);
  umount(IP_FORWARD);

  free(tmp_ip_forward);

  rmdir(tmpProc);
  free(tmpProc);

}
