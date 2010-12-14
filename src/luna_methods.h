#ifndef LUNA_METHODS_H
#define LUNA_METHODS_H

#include <stdbool.h>
#include <lunaservice.h>

bool register_methods(LSPalmService *serviceHandle, LSError lserror);

#define LS_REPLY_ERROR(err) \
do { \
  char *text = NULL; \
  asprintf(&text, "{\"returnValue\":false, \"errorCode\":-1, \"errorText\":\"%s\"}", err); \
  if (!text) \
    LSMessageReply(sh, msg, "{\"returnValue\":false}", &lserror); \
  else { \
    LSMessageReply(sh, msg, text, &lserror); \
    free(text); \
  } \
} while (0)

#define LS_PRIV_SUBSCRIBE(method, cb) \
  LSCall(priv_serviceHandle, "luna://com.palm."method, "{\"subscribe\":true}", cb, NULL, NULL, &lserror)

#endif /* LUNA_METHODS_H */
