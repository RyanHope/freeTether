#include "luna_methods.h"
#include "luna_service.h"

bool restart_bluetooth(LSHandle* lshandle, LSMessage *message, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  system("stop bluetooth");
  system("start bluetooth");

  LSMessageReply(lshandle,message,"{\"returnValue\":true}",&lserror);

  if (LSErrorIsSet(&lserror)) {
    LSErrorPrint(&lserror, stderr);
    LSErrorFree(&lserror);
  }

  return true;
}
