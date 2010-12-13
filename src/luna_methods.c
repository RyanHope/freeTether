#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <malloc.h>
#include <syslog.h>
#include "luna_methods.h"
#include "luna_service.h"

#define DBUS_MOBILE_HOTSPOT "luna://com.palm.mobilehotspot"
#define DBUS_NETROUTE "luna://com.palm.netroute"
#define DBUS_DHCP "luna://com.palm.dhcp"

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
  char *uri = malloc(strlen(DBUS_MOBILE_HOTSPOT) + strlen("/") + strlen(method) + 1);

  sprintf(uri, "%s/%s", DBUS_MOBILE_HOTSPOT, method);
  LSCall(priv_serviceHandle, uri, LSMessageGetPayload(msg), hotspot_callback, (void *)msg, NULL, &lserror);
}

bool sysInfo(LSHandle *sh, LSMessage *msg, void *ctx) {
  hotspot_relay(msg, "sysInfo");
  return true;
}

bool clientList(LSHandle *sh, LSMessage *msg, void *ctx) {
  hotspot_relay(msg, "clientList");
  return true;
}

bool configRead(LSHandle *sh, LSMessage *msg, void *ctx) {
  hotspot_relay(msg, "configRead");
  return true;
}

bool configWrite(LSHandle *sh, LSMessage *msg, void *ctx) {
  hotspot_relay(msg, "configWrite");
  return true;
}

bool deauthclient(LSHandle *sh, LSMessage *msg, void *ctx) {
  hotspot_relay(msg, "deauthclient");
  return true;
}

bool version(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  LSMessageReply(sh, msg, "{\"returnValue:\": true}", &lserror);
  return true;
}

// Hey man, what kind of hogwash crap stuffed together code is this?
// it's 3 AM leave me alone!

bool interfaceRemove(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  char *type = NULL;
  char *iface = NULL;

  object = json_parse_document(LSMessageGetPayload(msg));
  type = object->child->text;

  syslog(LOG_DEBUG, "type %s\n", type);
  if (!type) {
    LSMessageReply(sh, msg, "{\"returnValue\":true, \"errorCode\":-1, \"errorText\": \"No Interface type specified\"}", &lserror);
    return true;
  }

  if (!strcmp(type, "wifi")) {
    LSCall(priv_serviceHandle, "palm://com.palm.wifi/deleteAP", "{\"ifname\":\"uap0\"}", NULL, NULL, NULL, &lserror);
    LSCall(priv_serviceHandle, "palm://com.palm.wifi/setstate", "{\"state\":\"enabled\"}", NULL, NULL, NULL, &lserror);
  }

  // Only finalize and remove if there are no additional interfaces active
  LSCall(priv_serviceHandle, "palm://com.palm.dhcp/interfaceFinalize", "{\"interface\":\"bridge1\"}", NULL, NULL, NULL, &lserror);
  LSCall(priv_serviceHandle, "palm://com.palm.netroute/removeNetIf", "{\"ifName\":\"bridge1\"}", NULL, NULL, NULL, &lserror);

  LSMessageReply(sh, msg, "{\"returnValue\":true}", &lserror);

  return true;
}

bool interfaceAdd(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  char *type = NULL;
  char iface[10];
  char command[80];
  json_t *object;
  char *uri = NULL;

  object = json_parse_document(LSMessageGetPayload(msg));
  type = object->child->text;
  syslog(LOG_DEBUG, "type %s\n", type);
  if (!type) {
    LSMessageReply(sh, msg, "{\"returnValue\":true, \"errorCode\":-1, \"errorText\": \"No Interface type specified\"}", &lserror);
    return true;
  }

  if (!strcmp(type, "wifi")) {
    char *ssid = NULL;
    char *security = NULL;
    char *passphrase = NULL;
    char *payload = NULL;
    json_t *wifi = json_find_first_label(object, "wifi");
    json_get_string(wifi->child, "SSID", &ssid);
    json_get_string(wifi->child, "Security", &security);
    json_get_string(wifi->child, "Passphrase", &passphrase);
    syslog(LOG_DEBUG, "ssid %s, security %s, passphrase %s\n", ssid, security, passphrase);
    if (!ssid) {
      LSMessageReply(sh, msg, "{\"returnValue\":true, \"errorCode\":-1, \"errorText\": \"No SSID supplied\"}", &lserror);
      return true;
    }
    if (!security) {
      security = malloc(strlen("Open") + 1);
      strcpy(security, "Open");
    }
    strcpy(iface, "uap0");
    LSCall(priv_serviceHandle, "palm://com.palm.wifi/setstate", "{\"state\": \"disabled\"}", NULL, NULL, NULL, &lserror);
    asprintf(&payload, "{\"SSID\": \"%s\", \"Security\": \"%s\"", ssid, security);
    if (passphrase /* && not Open */) {
      asprintf(&payload, "%s, \"Passphrase\": %s", payload, passphrase);
    }
    asprintf(&payload, "%s}", payload);
    LSCall(priv_serviceHandle, "palm://com.palm.wifi/createAP", payload, NULL, NULL, NULL, &lserror);
    // TODO: MUST bring up uap0 but can't until createAP is finished loading in the AP module, so the rest of this stuff must happen in the callback, which will have ifname: uap0 in the payload
    // at 4AM we do lazy hacks
    sleep(2);
    system("ifconfig uap0 up");
  }
  else if (!strcmp(type, "bluetooth")) {
    json_get_string(object, "ifname", &iface);
    // Subscribe to com.palm.bluetooth/pan/subscribenotifications
  }
  else if (!strcmp(type, "usb")) {
    json_get_string(object, "ifname", &iface);
  }
  else {
    LSMessageReply(sh, msg, "{\"returnValue\":true, \"errorCode\":-1, \"errorText\": \"Invalid Interface type specified\"}", &lserror);
    return true;
  }

  if (!iface) {
    LSMessageReply(sh, msg, "{\"returnValue\":true, \"errorCode\":-1, \"errorText\": \"Invalid ifname specified\"}", &lserror);
    return true;
  }

  // TODO: Use libnetbridge directly
  system("brctl addbr bridge1");
  sprintf(command, "brctl addif bridge1 %s", iface);
  system(command);


  // TODO: callbacks, return values, error checking
  uri = malloc(strlen(DBUS_NETROUTE) + strlen("/addNetIf") + 1);
  sprintf(uri, "%s/addNetIf", DBUS_NETROUTE);
  LSCall(priv_serviceHandle, uri, "{\"ifName\":\"bridge1\", \"networkUsage\":[\"private\"], \"networkTechnology\":\"unknown\", \"networkScope\":\"lan\", \"ipv4\":{\"ip\":\"0x0b01020a\", \"netmask\":\"0x00ffffff\", \"gateway\":\"0x0b02010a\"}}", NULL, NULL, NULL, &lserror);

  uri = realloc(uri, strlen(DBUS_DHCP) + strlen("/interfaceInitialize") + 1);
  sprintf(uri, "%s/interfaceInitialize", DBUS_DHCP);
  LSCall(priv_serviceHandle, uri, "{\"interface\":\"bridge1\", \"mode\":\"server\", \"ipv4Address\":\"10.1.2.11\", \"ipv4Subnet\":\"255.255.255.0\", \"ipv4Router\":\"10.1.2.11\", \"dnsServers\":[\"10.1.2.11\"], \"ipv4RangeStart\":\"10.1.2.70\", \"maxLeases\":15, \"leaseTime\":7200}", NULL, NULL, NULL, &lserror);

  LSMessageReply(sh, msg, "{\"returnValue\":true}", &lserror);

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
