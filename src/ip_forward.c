#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <syslog.h>
#include <sys/mount.h>
#include <sys/inotify.h>

#include "luna_methods.h"
#include "luna_service.h"

#define IP_FORWARD "/proc/sys/net/ipv4/ip_forward"

char *tmpDir;
char *tmpIPforwardPath;

int monitor_ip_forward;

int buf_size = 32*(sizeof(struct inotify_event)+16);

void ip_forward_cleanup() {
  umount(tmpDir);
  rmdir(tmpDir);
  umount(IP_FORWARD);
  free(tmpDir);
  free(tmpIPforwardPath);
}

int setupTmpDir() {

  char template[] = "/tmp/freeTether.XXXXXX";
  char *d = mkdtemp(template);

  if (d==NULL) {
    syslog(LOG_ERR, "Failed creating tmp directory %s", template);
    return 1;
  } else {
    tmpDir = strdup(d);
    syslog(LOG_INFO, "Temporary directory %s created", tmpDir);
    if (mount("/dev/null", IP_FORWARD, NULL, MS_BIND, NULL)) {
      syslog(LOG_ERR, "Failed binding %s to %s", tmpIPforwardPath, IP_FORWARD);
      return 1;
    } else {
      syslog(LOG_INFO, "Procfs now available at %s", tmpDir);
      tmpIPforwardPath = 0;
      if (asprintf(&tmpIPforwardPath,"%s/sys/net/ipv4/ip_forward",tmpDir) == -1) {
        syslog(LOG_ERR, "Failed creating tmp ip_forward path");
        return 1;
      }
    }
  }

  return 0;

}

bool get_ip_forward(LSHandle* lshandle, LSMessage *message, void *ctx) {

  LSError lserror;
  LSErrorInit(&lserror);

  FILE *fp;
  int len = 0, state = -1;

  fp = fopen(tmpIPforwardPath, "r");
  if (fp) {
    state = fgetc(fp);
    fclose(fp);
  }

  bool subscribed = false;
  LSSubscriptionProcess(lshandle,message,&subscribed,&lserror);

  char *tmp = 0;
  len = asprintf(&tmp, "{\"returnValue\":true,\"state\":%c}", (char)state);
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

bool toggle_ip_forward(LSHandle* lshandle, LSMessage *message, void *ctx) {

  LSError lserror;
  LSErrorInit(&lserror);

  FILE *fp;
  int len = 0, state = -1;

  fp = fopen(tmpIPforwardPath, "r");
  if (fp) {
    state = fgetc(fp);
    fclose(fp);
    fp = fopen(tmpIPforwardPath, "w");
    if (fp) {
      switch ((char)state) {
      case '0': fprintf(fp, "1"); break;
      case '1': fprintf(fp, "0"); break;
      }
      fclose(fp);
      fp = fopen(tmpIPforwardPath, "r");
      state = fgetc(fp);
      fclose(fp);
    }
  }

  char *tmp = 0;
  len = asprintf(&tmp, "{\"returnValue\":true,\"state\":%c}", (char)state);
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

  int wd = inotify_add_watch(fd, tmpIPforwardPath, IN_MODIFY);
  if (wd<0) {
    syslog(LOG_ERR, "inotify_add_watch failed");
    return;
  }

  char buf[buf_size], *tmp = 0;
  int len = 0, state = 0;
  FILE *fp;

  monitor_ip_forward = 1;
  while (monitor_ip_forward) {
    len = read (fd, buf, buf_size);
    if (len > 0) {
      fp = fopen(tmpIPforwardPath, "r");
      if (fp) {
        state = fgetc(fp);
        fclose(fp);
        len = asprintf(&tmp, "{\"state\":%c}", (char)state);
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
