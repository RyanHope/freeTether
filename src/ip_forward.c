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

void ip_forward_cleanup() {
  monitor_ip_forward = 0;
}

int get_ip_forward_state() {
  FILE *fp;
  int state = -1;

  fp = fopen(IP_FORWARD, "r");
  if (!fp) {
    syslog(LOG_ERR, "Error opening %s for reading", IP_FORWARD);
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
  len = asprintf(&tmp, "{\"returnValue\":true,\"state\":%c}", (char)get_ip_forward_state());
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

  fp = fopen(IP_FORWARD, "w+");

  if (!fp) {
    syslog(LOG_ERR, "Cannot open %s for writing", IP_FORWARD);
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
  // TODO: seg faulting
  return NULL;

  LSError lserror;
  LSErrorInit(&lserror);

  int fd = inotify_init();
  if (fd<0) {
    syslog(LOG_ERR, "inotify_init failed");
    return;
  }

  int wd = inotify_add_watch(fd, IP_FORWARD, IN_MODIFY);
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
      fp = fopen(IP_FORWARD, "r");
      if (fp) {
        fscanf(fp, "%d", state);
        fclose(fp);
        syslog(LOG_DEBUG, "monitor thread state %d", state);
        len = asprintf(&tmp, "{\"state\":%d}", state);
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
