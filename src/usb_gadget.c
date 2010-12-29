#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <syslog.h>
#include <sys/inotify.h>

#include "luna_methods.h"
#include "luna_service.h"

#define USB_GADGET "/sys/class/usb_gadget/config_num"
#define BUF_SIZE (32*(sizeof(struct inotify_event)+16))

int monitor_usb_gadget;

void usb_gadget_cleanup() {
  monitor_usb_gadget = 0;
}

int get_usb_gadget_state() {
  FILE *fp;
  int state = -1;

  fp = fopen(USB_GADGET, "r");
  if (!fp) {
    syslog(LOG_ERR, "Error opening %s for reading", USB_GADGET);
    return -1;
  }

  fscanf(fp, "%d", &state);
  fclose(fp);

  return state;
}

bool get_usb_gadget(LSHandle* lshandle, LSMessage *message, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  int len = 0;

  bool subscribed = false;
  LSSubscriptionProcess(lshandle,message,&subscribed,&lserror);

  char *tmp = 0;
  len = asprintf(&tmp, "{\"returnValue\":true,\"state\":%d}", get_usb_gadget_state());
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

int set_usb_gadget_state(int state) {
  FILE *fp;
  int ret = -1;
  int count = 0;
  int i;

  fp = fopen(USB_GADGET, "w+");

  if (!fp) {
    syslog(LOG_ERR, "Cannot open %s for writing", USB_GADGET);
    return -1;
  }

  for (i=0; i<5; i++) {
    if (ret == 1)
      break;
    ret = fprintf(fp, "%d", state);
  }

  syslog(LOG_DEBUG, "Tried to write state %d times, final ret %d\n", i, ret);
  fclose(fp);

  return 0;
}

bool set_usb_gadget(LSHandle* lshandle, LSMessage *message, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  int len = 0;
  int state = 0;

  json_t *object;
  object = json_parse_document(LSMessageGetPayload(message));
  json_get_int(object, "state", &state);

  char *tmp = 0;
  len = set_usb_gadget_state(state);
  len = asprintf(&tmp, "{\"returnValue\":true,\"state\":%c}", len==1?state:-1);
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

void *usbgadgetmon_thread(void *ptr) {

  LSError lserror;
  LSErrorInit(&lserror);

  int fd = inotify_init();
  if (fd<0) {
    syslog(LOG_ERR, "inotify_init failed");
    return;
  }

  int wd = inotify_add_watch(fd, USB_GADGET, IN_CLOSE_WRITE);
  if (wd<0) {
    syslog(LOG_ERR, "inotify_add_watch failed");
    return;
  }

  char buf[BUF_SIZE], *tmp = 0;
  int len = 0, state = 0;
  FILE *fp;

  monitor_usb_gadget = 1;
  while (monitor_usb_gadget) {
    len = read (fd, buf, BUF_SIZE);
    if (len > 0) {
      fp = fopen(USB_GADGET, "r");
      if (fp) {
        fscanf(fp, "%d", &state);
        fclose(fp);
        syslog(LOG_DEBUG, "monitor thread state %d", state);
        len = asprintf(&tmp, "{\"returnValue\":true,\"state\":%d}", state);
        if (tmp) {
          LSSubscriptionRespond(serviceHandle,"/get_usb_gadget",tmp, &lserror);
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
