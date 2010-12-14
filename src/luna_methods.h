#ifndef LUNA_METHODS_H
#define LUNA_METHODS_H

#include <stdbool.h>
#include <lunaservice.h>

bool register_methods(LSPalmService *serviceHandle, LSError lserror);

bool toggle_ip_forward(LSHandle* lshandle, LSMessage *message, void *ctx);
bool get_ip_forward(LSHandle* lshandle, LSMessage *message, void *ctx);

#define LS_REPLY_ERROR(err) \
  LSMessageReply(sh, msg, \
    "{\
    \"returnValue\":true, \
    \"errorCode\":-1, \
    \"errorText\": \"err\" \
    \"}", \
    &lserror)

#define LS_PRIV_SUBSCRIBE(method, cb) \
  LSCall(priv_serviceHandle, "luna://com.palm."method, "\"subscribe\": true", cb, NULL, NULL, &lserror)

#endif /* LUNA_METHODS_H */
