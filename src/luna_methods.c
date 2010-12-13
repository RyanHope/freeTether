#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <malloc.h>
#include "luna_methods.h"
#include "luna_service.h"

#define MOBILE_HOTSPOT "luna://com.palm.mobilehotspot"

bool hotspot_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  LSMessageRespond((LSMessage *)ctx, LSMessageGetPayload(msg), &lserror);

  if (!LSMessageIsSubscription((LSMessage *)ctx))
    LSMessageUnref((LSMessage *)ctx);

  return true;
}

void hotspot_relay(LSMessage *msg, char *method) {
  LSError lserror;
  LSErrorInit(&lserror);
  LSMessageRef(msg);
  char *uri = malloc(strlen(MOBILE_HOTSPOT) + strlen("/") + strlen(method));

  sprintf(uri, "%s/%s", MOBILE_HOTSPOT, method);
  LSCall(priv_serviceHandle, uri, LSMessageGetPayload(msg), hotspot_callback, (void *)msg, NULL, &lserror);
}

bool interfaceAdd(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSMessageRef(msg);
  hotspot_relay(msg, "interfaceAdd");
  return true;
}

bool interfaceRemove(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSMessageRef(msg);
  hotspot_relay(msg, "interfaceRemove");
  return true;
}

bool sysInfo(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSMessageRef(msg);
  hotspot_relay(msg, "sysInfo");
  return true;
}

bool clientList(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSMessageRef(msg);
  hotspot_relay(msg, "clientList");
  return true;
}

bool configRead(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSMessageRef(msg);
  hotspot_relay(msg, "configRead");
  return true;
}

bool configWrite(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSMessageRef(msg);
  hotspot_relay(msg, "configWrite");
  return true;
}

bool deauthclient(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSMessageRef(msg);
  hotspot_relay(msg, "deauthclient");
  return true;
}

bool version(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  LSMessageReply(sh, msg, "{\"returnValue:\": true}", &lserror);
  return true;
}

LSMethod luna_methods[] = { 
  {"version", version},
  {"interfaceAdd", interfaceAdd},
  {"interfaceRemove", interfaceRemove},
  {"sysInfo", sysInfo},
  {"clientList", clientList},
  {"configRead", configRead},
  {"configWrite", configWrite},
  {"deauthclient", deauthclient},
};

bool register_methods(LSPalmService *serviceHandle, LSError lserror) {
	return LSPalmServiceRegisterCategory(serviceHandle, "/", luna_methods,
			NULL, NULL, NULL, &lserror);
}
