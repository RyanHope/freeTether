#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <malloc.h>
#include <syslog.h>
#include <glib.h>
#include <netinet/in.h>
#include "luna_methods.h"
#include "luna_service.h"
#include "freetether.h"
#include "usb_gadget.h"

// TODO: fix to store all the info in ifaceInfo, to get it back to mojo via sysInfo subscription.
// Change to a main thread state machine, and have callbacks awake the thread to indicate state change?
// I believe this is how MHS does it.  The current implementation of keeping track of states via async callbacks and hopskotch 
// is a little messy and hard to follow.
// Supposed to just track the states based on subscriptions, so make sure all subscriptions/values are handled
//
//TODO: split out generic linked list, use for clients list too

#define DBUS_MOBILE_HOTSPOT "luna://com.palm.mobilehotspot"
#define DBUS_NETROUTE "luna://com.palm.netroute"
#define DBUS_DHCP "luna://com.palm.dhcp"

struct dhcp {
  struct client *leases;
  pthread_mutex_t mutex;
};
struct dhcp dhcp_leases = {NULL, PTHREAD_MUTEX_INITIALIZER};

// TODO: Smooth/verify subscriptions and cancellability
struct subscription {
  LSFilterFunc callback;
  bool subscribed;
  LSMessageToken token;
};

struct subscription dhcp_server = {lease_callback, false, 0};
struct subscription interface_status = {iface_status_callback, false, 0};
struct subscription bluetooth = {bt_callback, false, 0};
struct subscription btmonitor = {btmon_callback, false, 0};

static char *ipstate_str() {
  switch(ifaceInfo.ip_state) {
    case REMOVED:
      return "REMOVED";
      break;
    case ASSIGN_REQUESTED:
      return "ASSIGN REQUESTED";
      break;
    case ASSIGNED:
      return "ASSIGNED";
      break;
    case REMOVE_REQUESTED:
      return "REMOVE REQUESTED";
      break;
    default:
      return "ERROR";
      break;
  }
}

static char *dhcpstate_str() {
  switch(ifaceInfo.dhcp_state) {
    case STOPPED:
      return "STOPPED";
      break;
    case START_REQUESTED:
      return "START REQUESTED";
      break;
    case STARTED:
      return "STARTED";
      break;
    case STOP_REQUESTED:
      return "STOP REQUESTED";
      break;
    default:
      return "ERROR";
      break;
  }
}

static char *ifacestate_str(struct interface *iface) {
  switch(iface->iface_state) {
    case DESTROYED:
      return "DESTROYED";
      break;
    case CREATE_REQUESTED:
      return "CREATE REQUESTED";
      break;
    case CREATED:
      return "CREATED";
      break;
    case DESTROY_REQUESTED:
      return "DESTROY REQUESTED";
      break;
  }
}

static char *bridgestate_str(struct interface *iface) {
  switch(iface->bridge_state) {
    case UNBRIDGED:
      return "UNBRIDGED";
      break;
    case BRIDGED:
      return "BRIDGED";
      break;
    default:
      return "ERROR";
      break;
  }
}

static char *linkstate_str(struct interface *iface) {
  switch(iface->link_state) {
    case UNKNOWN:
      return "UNKNOWN";
      break;
    case UP:
      return "UP";
      break;
    case DOWN:
      return "DOWN";
      break;
    default:
      return "ERROR";
      break;
  }
}

static char *generate_sysinfo_json() {
  struct interface *iface;
  char *payload;

  syslog(LOG_DEBUG, "MUTEX ifaceInfo take gsi");
  pthread_mutex_lock(&ifaceInfo.mutex);
  iface = ifaceInfo.ifaces;
  asprintf(&payload,
      "\"sysInfo\": { "\
        "\"ifbridge\": \"%s\", "\
        "\"IPv4Address\": \"%s\", "\
        "\"IPv4Subnet\": \"%s\", "\
        "\"IPv4PoolStart\": \"%s\", "\
        "\"MaxLeases\": %d, "\
        "\"LeaseTime\": %d, "\
        "\"stateIPv4\": \"%s\", "\
        "\"stateDHCPServer\": \"%s\", "\
        "\"interfaces\": [",
        ifaceInfo.bridge, ifaceInfo.ip, ifaceInfo.subnet, ifaceInfo.poolstart, ifaceInfo.maxLeases, 
        ifaceInfo.leaseTime, ipstate_str(), dhcpstate_str());

  while (iface) {
    asprintf(&payload, "%s { "\
        "\"ifname\": \"%s\", "\
        "\"stateInterface\": \"%s\", "\
        "\"stateInterfaceBridged\": \"%s\", "\
        "\"stateLink\": \"%s\", "\
        "\"type\": \"%s\"",
        payload, iface->ifname, ifacestate_str(iface), bridgestate_str(iface), linkstate_str(iface), 
        iface->type);

    if (!strcmp(iface->type, "wifi")) {
      asprintf(&payload, "%s, \"SSID\": \"%s\", \"Security\": \"%s\"",
          payload, iface->ap->ssid, iface->ap->security);
      }

    if (iface->next)
      asprintf(&payload, "%s },", payload);
    else
      asprintf(&payload, "%s }", payload);

    iface = iface->next;
  }
  syslog(LOG_DEBUG, "MUTEX ifaceInfo give gsi");
  pthread_mutex_unlock(&ifaceInfo.mutex);

  asprintf(&payload, "%s ] }", payload);

  return payload;
}

static void sysinfo_response() {
  LSError lserror;
  LSErrorInit(&lserror);
  char *payload;

  payload = generate_sysinfo_json();
  asprintf(&payload, "{\"returnValue\": true, %s }", payload);

  if (payload) {
    LSSubscriptionRespond(serviceHandle, "/sysInfo", payload, &lserror);
    free(payload);
  }
}

static char *generate_clientlist_json() {
  bool first = true;
  struct interface *iface = NULL;
  struct client *client = NULL;
  char *payload;

  asprintf(&payload, "\"clients\": [");

  syslog(LOG_DEBUG, "MUTEX ifaceInfo take gci");
  pthread_mutex_lock(&ifaceInfo.mutex);
  for (client = ifaceInfo.connections; client; client = client->next) {
    syslog(LOG_DEBUG, "client mac %s\n", client->mac);
    if (!first)
      asprintf(&payload, "%s, ", payload);
    else
      first = false;

    asprintf(&payload, "%s { "\
        "\"ifname\": \"%s\", "\
        "\"type\": \"%s\", "\
        "\"mac\": \"%s\", "\
        "\"ipv4\": \"%s\", "\
        "\"leaseTime\": \"%s\", "\
        "\"leaseExpiry\": \"%s\"", 
        payload, 
        (client->iface && client->iface->ifname) ? client->iface->ifname : "",
        (client->iface && client->iface->type) ? client->iface->type : "",
        client->mac, client->ipv4, client->leaseTimeString, client->leaseExpiryString);

    if (client->hostname)
      asprintf(&payload, "%s, \"hostname\": \"%s\"}", payload, client->hostname);
    else
      asprintf(&payload, "%s }", payload);
  }
  syslog(LOG_DEBUG, "MUTEX ifaceInfo give gci");
  pthread_mutex_unlock(&ifaceInfo.mutex);

  asprintf(&payload, "%s ]", payload);

  return payload;
}

static void clientlist_response() {
  LSError lserror;
  LSErrorInit(&lserror);
  char *payload;

  payload = generate_clientlist_json();

  asprintf(&payload, "{\"returnValue\": true, %s }", payload);

  if (payload) {
    LSSubscriptionRespond(serviceHandle, "/clientList", payload, &lserror);
    free(payload);
  }
}

static void free_iface(struct interface *iface) {
  if (iface) {
    if (iface->ifname)
      free(iface->ifname);
    if (iface->type)
      free(iface->type);
    if (iface->ap) {
      if (iface->ap->ssid)
        free(iface->ap->ssid);
      if (iface->ap->security)
        free(iface->ap->security);
      if (iface->ap->passphrase)
        free(iface->ap->passphrase);
    }

    free(iface);
  }
}

struct interface *get_iface(char *type, char *ifname) {
  struct interface *iface = NULL;

  if (!ifname || !type)
    return NULL;

  syslog(LOG_DEBUG, "MUTEX ifaceInfo take get_iface");
  pthread_mutex_lock(&ifaceInfo.mutex);
  iface = ifaceInfo.ifaces;
  while (iface) {
    if (ifname && type) {
      if (iface->ifname && iface->type && !strcmp(iface->ifname, ifname) && !strcmp(iface->type, type))
        break;
    }
    else if (ifname) {
      if (iface->ifname && !strcmp(iface->ifname, ifname))
        break;
    }
    else {
      if (iface->type && !strcmp(iface->type, type))
        break;
    }
    iface = iface->next;
  }
  syslog(LOG_DEBUG, "MUTEX ifaceInfo give get_iface");
  pthread_mutex_unlock(&ifaceInfo.mutex);

  return iface;
}

static char *strupper(char *str) {
  int i;

  if (!str)
    return;

  for (i=0; i<strlen(str); i++) {
    str[i] = toupper(str[i]);
  }

  return str;
}

static char *strlower(char *str) {
  int i;

  if (!str)
    return;

  for (i=0; i<strlen(str); i++) {
    str[i] = tolower(str[i]);
  }

  return str;
}

void check_for_lease(struct client *client) {
  struct client *lease;
  if (!client || !client->mac)
    return;

  pthread_mutex_lock(&dhcp_leases.mutex);
  for (lease = dhcp_leases.leases; lease; lease = lease->next) {
    if (lease->mac && !strcmp(lease->mac, client->mac)) {
      syslog(LOG_DEBUG, "update lease mac %s, ipv4 %s, leaseTime %s, leaseExpiry %s, hostName %s\n", 
          lease->mac, lease->ipv4, lease->leaseTimeString, lease->leaseExpiryString, lease->hostname);
      UPDATE_CLIENT(hostname, lease->hostname);
      UPDATE_CLIENT(ipv4, lease->ipv4);
      UPDATE_CLIENT(leaseTimeString, lease->leaseTimeString);
      UPDATE_CLIENT(leaseExpiryString, lease->leaseExpiryString);
    }
  }
  pthread_mutex_unlock(&dhcp_leases.mutex);
}

struct client *add_connection(char *mac, char *hostname, char *ipv4, char *leaseTimeString, char *leaseExpiryString, 
    struct interface *iface, struct client **head) {
  struct client *iter = NULL;
  struct client *client = NULL;
  
  if (!mac || !head)
    return;

  client = calloc(1, sizeof (*client));

  if (!client) {
    syslog(LOG_ERR, "ERROR: Unable to allocate memory for client!");
    return;
  }

  syslog(LOG_DEBUG, "add client %p", client);

  client->mac = strdup(strupper(mac));
  UPDATE_CLIENT(hostname, hostname);
  UPDATE_CLIENT(ipv4, ipv4);
  UPDATE_CLIENT(leaseTimeString, leaseTimeString);
  UPDATE_CLIENT(leaseExpiryString, leaseExpiryString);
  if (iface)
    client->iface = iface;

  iter = *head;
  if (!iter) {
    *head = client;
  }
  else {
    for (; iter->next; iter = iter->next);

    iter->next = client;
  }

  return client;
}

bool update_connection(char *mac, char *hostname, char *ipv4, 
    char *leaseTimeString, char *leaseExpiryString, struct interface *iface) {
  bool found = false;
  struct client *client;
  bool listChanged = false;

  syslog(LOG_DEBUG, "UPDATE CONNECTiON %s, %s, %s, %s, %s, %p\n", 
      mac, hostname, ipv4, leaseTimeString, leaseExpiryString, iface);

  if (!mac)
    return;

  syslog(LOG_DEBUG, "MUTEX ifaceInfo take update_connection");
  pthread_mutex_lock(&ifaceInfo.mutex);
  for (client = ifaceInfo.connections; client; client = client->next) {
    syslog(LOG_DEBUG, "client %p, mac %s", client, client->mac);
    if (client->mac && !strcmp(mac, client->mac)) {
      if (hostname && client->hostname && strcmp(hostname, client->hostname)) {
        FREE(client->hostname);
        client->hostname = strdup(hostname);
        listChanged = true;
      }
      if (ipv4 && client->ipv4 && strcmp(ipv4, client->ipv4)) {
        FREE(client->ipv4);
        client->ipv4 = strdup(ipv4);
        listChanged = true;
      }
      if (leaseTimeString && client->leaseTimeString && strcmp(leaseTimeString, client->leaseTimeString)) {
        FREE(client->leaseTimeString);
        client->leaseTimeString = strdup(leaseTimeString);
        listChanged = true;
      }
      if (leaseExpiryString && client->leaseExpiryString && strcmp(leaseExpiryString, client->leaseExpiryString)) {
        FREE(client->leaseExpiryString);
        client->leaseExpiryString = strdup(leaseExpiryString);
        listChanged = true;
      }
      if (iface && iface != client->iface)
        client->iface = iface;
      found = true;
      break;
    }
  }
  syslog(LOG_DEBUG, "MUTEX ifaceInfo give update_connection");
  pthread_mutex_unlock(&ifaceInfo.mutex);

  if (!found && iface) {
    struct client *client;
    syslog(LOG_DEBUG, "  add new connection");
    syslog(LOG_DEBUG, "MUTEX ifaceInfo take update_connection 2");
    pthread_mutex_lock(&ifaceInfo.mutex);
    client = add_connection(mac, hostname, ipv4, leaseTimeString, 
        leaseExpiryString, iface, &ifaceInfo.connections);
    syslog(LOG_DEBUG, "MUTEX ifaceInfo give update_connection 2");
    pthread_mutex_unlock(&ifaceInfo.mutex);
    if (client) {
      syslog(LOG_DEBUG, "update lease for client %p", client);
      check_for_lease(client);
    }
    listChanged = true;
  }

  return listChanged;
}

static void free_client(struct client *client) {
  if (client) {
    FREE(client->mac);
    FREE(client->hostname);
    FREE(client->ipv4);
    FREE(client->leaseTimeString);
    FREE(client->leaseExpiryString);
    if (client->iface)
      client->iface = NULL;

    free(client);
  }
}

void free_connections(struct client **head) {
  struct client *prev;
  struct client *client;

  if (!head)
    return;

  client = *head;
  while (client) {
    prev = client;
    client = client->next;
    free_client(prev);
  }

  *head = NULL;
}

void remove_connection(struct client *client) {
  struct client *iter;

  iter = ifaceInfo.connections;
  syslog(LOG_DEBUG, "remove client %p, iter %p", client, iter);
  if (!client || !iter)
    return;

  if (iter == client) {
    ifaceInfo.connections = client->next;
    free_client(client);
    return;
  }

  while (iter->next && client != iter->next) {
    iter = iter->next;
  }

  if (iter->next) {
    iter->next = client->next;
    free_client(client);
  }
}

bool remove_old_clients(char *type, json_t *clientList) {
  json_t *newClient;
  struct client *client;
  bool found = false;
  bool listChanged = false;

  if (!type)
    return;

  syslog(LOG_DEBUG, "MUTEX ifaceInfo take roc");
  pthread_mutex_lock(&ifaceInfo.mutex);
  for (client = ifaceInfo.connections; client; client = client->next) {
    found = false;
    if (client->iface && client->iface->type && !strcmp(client->iface->type, type)) {
      for (newClient = clientList; newClient; newClient = newClient->next) {
        char *mac;
        json_t *wifi_client = json_find_first_label(newClient, "clientInfo");

        if (wifi_client && wifi_client->child)
          json_get_string(wifi_client->child, "macAddress", &mac);
        else
          json_get_string(newClient, "macAddress", &mac);

        if (!strcmp(mac, client->mac)) {
          found = true;
          listChanged = true;
        }
      }

      if (!found)
        remove_connection(client);
    }
  }
  syslog(LOG_DEBUG, "MUTEX ifaceInfo give roc");
  pthread_mutex_unlock(&ifaceInfo.mutex);

  return listChanged;
}

bool remove_connections(struct interface *iface) {
  struct client *client;
  bool listChanged = false;

  if (iface && iface->type) {
    syslog(LOG_DEBUG, "MUTEX ifaceInfo take rm_cs");
    pthread_mutex_lock(&ifaceInfo.mutex);
    for (client = ifaceInfo.connections; client; client = client->next) {
      if (client->iface && client->iface->type && !strcmp(iface->type, client->iface->type)) {
        listChanged = true;
        remove_connection(client);
      }
    }
    syslog(LOG_DEBUG, "MUTEX ifaceInfo give rm_cs");
    pthread_mutex_unlock(&ifaceInfo.mutex);
  }

  return listChanged;
}

void update_clients(struct interface *iface, json_t *object) {
  bool listChanged = false;

  if (object && object->child && object->child->type == JSON_ARRAY && object->child->child) {
    json_t *client = object->child->child;

    if (remove_old_clients(iface->type, client))
      listChanged = true;

    while (client) {
      char *mac, *hostname = NULL;
      json_t *wifi_client = json_find_first_label(client, "clientInfo");

      if (wifi_client && wifi_client->child) {
        json_get_string(wifi_client->child, "macAddress", &mac);
      }
      else {
        json_get_string(client, "macAddress", &mac);
        json_get_string(client, "hostName", &hostname);
      }

      if (update_connection(mac, hostname, NULL, NULL, NULL, iface))
        listChanged = true;

      client = client->next;
    }
  }
  else {
    syslog(LOG_DEBUG, "Remove all clients of iface type %s", (iface) ? iface->type : "?");
    if (remove_connections(iface))
      listChanged = true;
  }

  if (listChanged)
    clientlist_response();
}

void update_leases(json_t *object) {
  syslog(LOG_DEBUG, "update leases");
  bool listChanged = false;
  if (object && object->child && object->child->type == JSON_ARRAY && object->child->child) {
    json_t *lease = NULL;

    pthread_mutex_lock(&dhcp_leases.mutex);
    free_connections(&dhcp_leases.leases);
    pthread_mutex_unlock(&dhcp_leases.mutex);
    for (lease = object->child->child; lease; lease = lease->next) {
      char *mac = NULL;
      char *ipv4 = NULL;
      char *leaseTimeString = NULL;
      char *leaseExpiryString = NULL;
      char *hostname = NULL;

      json_get_string(lease, "mac", &mac);
      json_get_string(lease, "ipv4", &ipv4);
      json_get_string(lease, "leaseTimeString", &leaseTimeString);
      json_get_string(lease, "leaseExpiryString", &leaseExpiryString);
      json_get_string(lease, "hostName", &hostname);

      syslog(LOG_DEBUG, "lease mac %s, ipv4 %s, leaseTime %s, leaseExpiry %s, hostName %s\n", 
          mac, ipv4, leaseTimeString, leaseExpiryString, hostname);
      // If no mac, ip or lease information, just skip
      if (!mac || !ipv4 || !leaseTimeString || !leaseExpiryString)
        continue;

      if (update_connection(mac, hostname, ipv4, leaseTimeString, leaseExpiryString, NULL))
        listChanged = true;
      pthread_mutex_lock(&dhcp_leases.mutex);
      add_connection(mac, hostname, ipv4, leaseTimeString, leaseExpiryString, NULL, &dhcp_leases.leases);
      pthread_mutex_unlock(&dhcp_leases.mutex);
    }
  }
  else {
    pthread_mutex_lock(&dhcp_leases.mutex);
    free_connections(&dhcp_leases.leases);
    pthread_mutex_unlock(&dhcp_leases.mutex);
  }

  if (listChanged)
    clientlist_response();
}

bool is_subscription(LSMessage *msg) {
  json_t *object;
  bool subscribed = false;

  if (LSMessageIsSubscription(msg))
    return true;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "subscribed", &subscribed);

  return subscribed;
}

bool lease_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  bool returnValue = false;
  json_t *leases;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  syslog(LOG_DEBUG, "lease callback ret %d", returnValue);
  if (returnValue) {
    if (!dhcp_server.subscribed)
      leases = json_find_first_label(object, "interfaceList");
    else
      leases = json_find_first_label(object, "leases");

    if (is_subscription(msg))
      dhcp_server.subscribed = true;

    if (leases && leases->child && leases->child->child) {
      update_leases(json_find_first_label(leases->child->child, "leases"));
    }
    else {
      pthread_mutex_lock(&dhcp_leases.mutex);
      free_connections(&dhcp_leases.leases);
      pthread_mutex_unlock(&dhcp_leases.mutex);
    }
  }
  else {
    // if (is_subscription(msg))
    dhcp_server.subscribed = false;
    syslog(LOG_DEBUG, "MUTEX ifaceInfo take l_cb");
    pthread_mutex_lock(&ifaceInfo.mutex);
    ifaceInfo.dhcp_state = STOPPED;
    syslog(LOG_DEBUG, "MUTEX ifaceInfo give l_cb");
    pthread_mutex_unlock(&ifaceInfo.mutex);
  }

  //sysinfo_response();
  return true;
}


bool remove_netif_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  bool returnValue = FALSE;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  if (returnValue) {
    syslog(LOG_DEBUG, "MUTEX ifaceInfo take rn_cb");
    pthread_mutex_lock(&ifaceInfo.mutex);
    if (ifaceInfo.ip_state == REMOVE_REQUESTED)
      ifaceInfo.ip_state = REMOVED;
    syslog(LOG_DEBUG, "MUTEX ifaceInfo give rn_cb");
    pthread_mutex_unlock(&ifaceInfo.mutex);
    sysinfo_response();
  }

  return true;
}

bool dhcp_final_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  bool returnValue = FALSE;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  if (returnValue) {
    syslog(LOG_DEBUG, "MUTEX ifaceInfo take df_cb");
    pthread_mutex_lock(&ifaceInfo.mutex);
    ifaceInfo.dhcp_state = STOPPED;
    syslog(LOG_DEBUG, "MUTEX ifaceInfo give df_cb");
    pthread_mutex_unlock(&ifaceInfo.mutex);

    if (ifaceInfo.ip_state != REMOVED) {
      char *payload = NULL;

      asprintf(&payload, "{\"ifName\": \"%s\"}", ifaceInfo.bridge);
      if (!payload)
        return false;

      syslog(LOG_DEBUG, "MUTEX ifaceInfo take df_cb 2");
      pthread_mutex_lock(&ifaceInfo.mutex);
      ifaceInfo.ip_state = REMOVE_REQUESTED;
      syslog(LOG_DEBUG, "MUTEX ifaceInfo give df_cb 2");
      pthread_mutex_unlock(&ifaceInfo.mutex);

      if (get_ip_forward_state())
        toggle_ip_forward_state();

      LSCall(priv_serviceHandle, "palm://com.palm.netroute/removeNetIf", payload, 
          remove_netif_callback, NULL, NULL, &lserror);

      free(payload);
    }
    sysinfo_response();
    syslog(LOG_DEBUG, "FINISHED, bye bye for now");
  }
  else {
    /* Fix the handling of return false everywhere */
  }

  return true;
}

bool dhcp_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  if (ifaceInfo.dhcp_state == START_REQUESTED) {
    syslog(LOG_DEBUG, "MUTEX ifaceInfo take d_cb");
    pthread_mutex_lock(&ifaceInfo.mutex);
    ifaceInfo.dhcp_state = STARTED;
    syslog(LOG_DEBUG, "MUTEX ifaceInfo give d_cb");
    pthread_mutex_unlock(&ifaceInfo.mutex);

    if (!get_ip_forward_state())
      toggle_ip_forward_state();

    if (!dhcp_server.subscribed)
      LS_PRIV_SUBSCRIBE("dhcp/server/leaseInformation", dhcp_server, NULL);

    sysinfo_response();
  }

  return true;
}

bool netif_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  bool returnValue = false;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  if (returnValue) {
    if (ifaceInfo.ip_state == ASSIGN_REQUESTED) {
      syslog(LOG_DEBUG, "MUTEX ifaceInfo take n_cb");
      pthread_mutex_lock(&ifaceInfo.mutex);
      ifaceInfo.ip_state = ASSIGNED;
      if (ifaceInfo.dhcp_state != STARTED)
        ifaceInfo.dhcp_state = START_REQUESTED;
      syslog(LOG_DEBUG, "MUTEX ifaceInfo give n_cb");
      pthread_mutex_unlock(&ifaceInfo.mutex);

      // TODO: less hard coding
      if (ifaceInfo.dhcp_state == START_REQUESTED) {
        char *payload;
        asprintf(&payload, "{ "\
            "\"interface\": \"%s\", "\
            "\"mode\":\"server\", "\
            "\"ipv4Address\":\"%s\", "\
            "\"ipv4Subnet\":\"%s\", "\
            "\"ipv4Router\":\"%s\", "\
            "\"dnsServers\":[\"%s\"], "\
            "\"ipv4RangeStart\":\"%s\", "\
            "\"maxLeases\":%d, "\
            "\"leaseTime\":%d}",
            ifaceInfo.bridge, ifaceInfo.ip, ifaceInfo.subnet, ifaceInfo.ip, ifaceInfo.ip, ifaceInfo.poolstart, ifaceInfo.maxLeases, ifaceInfo.leaseTime);

        LSCall(priv_serviceHandle, "luna://com.palm.dhcp/interfaceInitialize", payload,
            dhcp_callback, NULL, NULL, &lserror);
        free(payload);

#if 0
        LSCall(priv_serviceHandle, "luna://com.palm.dhcp/interfaceInitialize", "{ " \
              "\"interface\":\"bridge0\", "\
              "\"mode\":\"server\", "\
              "\"ipv4Address\":\"10.1.1.11\", "\
              "\"ipv4Subnet\":\"255.255.255.0\", "\
              "\"ipv4Router\":\"10.1.1.11\", "\
              "\"dnsServers\":[\"10.1.1.11\"], "\
              "\"ipv4RangeStart\":\"10.1.1.50\", "\
              "\"maxLeases\":15, "\
              "\"leaseTime\":7200}", 
              dhcp_callback, NULL, NULL, &lserror);
#endif
      }
    }
  }
  else {
    syslog(LOG_DEBUG, "MUTEX ifaceInfo take n_cb 2");
    pthread_mutex_lock(&ifaceInfo.mutex);
    ifaceInfo.ip_state = REMOVED;
    syslog(LOG_DEBUG, "MUTEX ifaceInfo give n_cb 2");
    pthread_mutex_unlock(&ifaceInfo.mutex);
  }

  sysinfo_response();
  return true;
}

void wifi_set_managed(char *ifname) {
	char command[80];
	sprintf(command, "iwconfig %s mode managed", ifname);
	system(command);
}

void remove_bridge(char *ifname) {
	char command[80];
	sprintf(command, "brctl delif bridge0 %s", ifname);
	system(command);
}

void add_bridge(struct interface *iface) {
  LSError lserror;
  LSErrorInit(&lserror);
  int ret;

  if (!iface)
    return;

#if 0
  // TODO: Check that bridge/interface doesn't already exist
  ret = br_add_bridge("bridge0");
  syslog(LOG_DEBUG, "add bridge %d\n", ret);
  ret = br_add_interface("bridge0", iface->ifname);
  syslog(LOG_DEBUG, "add interface %d\n", ret);
#endif

  system("brctl addbr bridge0");
  char command[80];
  sprintf(command, "brctl addif bridge0 %s", iface->ifname);
  system(command);

  // Have to up at least for uap0 it seems
  sprintf(command, "ifconfig %s up", iface->ifname);
  system(command);

  pthread_mutex_lock(&iface->mutex);
  iface->link_state = UP;
  iface->bridge_state = BRIDGED;
  pthread_mutex_unlock(&iface->mutex);
  sysinfo_response();

  if (ifaceInfo.ip_state != ASSIGNED) {
    syslog(LOG_DEBUG, "MUTEX ifaceInfo take ab");
    pthread_mutex_lock(&ifaceInfo.mutex);
    ifaceInfo.ip_state = ASSIGN_REQUESTED;
    syslog(LOG_DEBUG, "MUTEX ifaceInfo give ab");
    pthread_mutex_unlock(&ifaceInfo.mutex);

    in_addr_t ip = inet_addr(ifaceInfo.ip);
    in_addr_t subnet = inet_addr(ifaceInfo.subnet);
    in_addr_t gateway = inet_addr(ifaceInfo.ip);

    char *payload;
    asprintf(&payload, "{ " \
        "\"ifName\": \"%s\", " \
        "\"networkUsage\": [\"private\"], " \
        "\"networkTechnology\": \"unknown\", " \
        "\"networkScope\": \"lan\", " \
        "\"ifPriority\": 170, " \
        "\"doBringUpIf\": true, " \
        "\"ipv4\": " \
        "{ " \
            "\"ip\": \"0x%x\", " \
            "\"netmask\": \"0x%x\", " \
            "\"gateway\": \"0x%x\" " \
        "}" \
        "}",
        ifaceInfo.bridge, ip, subnet, gateway);
    LSCall(priv_serviceHandle, "luna://com.palm.netroute/addNetIf", payload,
        netif_callback, NULL, NULL, &lserror);
    free(payload);
#if 0
    LSCall(priv_serviceHandle, "luna://com.palm.netroute/addNetIf", 
      "{ " \
        "\"ifName\": \"bridge0\", " \
        "\"networkUsage\": [\"private\"], " \
        "\"networkTechnology\": \"unknown\", " \
        "\"networkScope\": \"lan\", " \
        "\"ifPriority\": 170, " \
        "\"doBringUpIf\": true, " \
        "\"ipv4\": " \
        "{ " \
            "\"ip\": \"0x0b01010a\", " \
            "\"netmask\": \"0x00ffffff\", " \
            "\"gateway\": \"0x0b01010a\" " \
        "}" \
        "}",
        netif_callback, NULL, NULL, &lserror);
#endif
  }
}

bool iface_status_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  bool returnValue = false;
  char *ifname = NULL;
  char *state = NULL;
  struct interface *iface = (struct interface *)ctx;
  LINK_STATE link_state = UNKNOWN;
  json_t *object;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  syslog(LOG_DEBUG, "iface status callback");
  if (returnValue) {
    if (is_subscription(msg))
      interface_status.subscribed = true;

    json_get_string(object, "ifname", &ifname);
    json_get_string(object, "state", &state);

    if (ifname && state) {
      if (!strcmp(state, "down"))
        link_state = DOWN;
      if (!strcmp(state, "up"))
        link_state = UP;

      pthread_mutex_lock(&iface->mutex);
      iface->link_state = link_state;
      pthread_mutex_unlock(&iface->mutex);

      if (link_state == UP && iface->bridge_state != BRIDGED)
        add_bridge(iface);

      if (link_state == DOWN)
        iface->bridge_state = UNBRIDGED;

      syslog(LOG_DEBUG, "update clients");
      update_clients(iface, json_find_first_label(object, "clientList"));
      sysinfo_response();
    }
  }
  else {
    interface_status.subscribed = false;
  }

  return true;
}

void remove_iface(struct interface *iface) {
  struct interface *iter;

  if (remove_connections(iface))
    clientlist_response();

  syslog(LOG_DEBUG, "MUTEX ifaceInfo take ri");
  pthread_mutex_lock(&ifaceInfo.mutex);
  iter = ifaceInfo.ifaces;
  syslog(LOG_DEBUG, "remove iface %p, iter %p", iface, iter);

  if (!iface || !iter) {
  syslog(LOG_DEBUG, "MUTEX ifaceInfo give1 ri");
    pthread_mutex_unlock(&ifaceInfo.mutex);
    return;
  }

  if (iter == iface) {

    if (!ifaceInfo.ifaces) {
      LSError lserror;
      LSErrorInit(&lserror);

      LSCall(priv_serviceHandle, "palm://com.palm.dhcp/interfaceFinalize",
          "{\"interface\":\"bridge0\"}", dhcp_final_callback, NULL, NULL, &lserror);
    }
    
    ifaceInfo.ifaces = iface->next;
    remove_bridge(iface->ifname);
    free_iface(iface);

    goto done;
  }

  while (iter->next && iface != iter->next) {
    iter = iter->next;
  }

  if (iter->next) {
    iter->next = iface->next;
    remove_bridge(iface->ifname);
    free_iface(iface);
  }

done:
  syslog(LOG_DEBUG, "MUTEX ifaceInfo give2 ri");
  pthread_mutex_unlock(&ifaceInfo.mutex);
  sysinfo_response();
}

bool delete_ap_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  struct interface *iface = (struct interface *)ctx;
  bool returnValue = false;
  char *ifname = NULL;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  if (iface->start_state == WIFI_ENABLED) {
    LSCall(priv_serviceHandle, "luna://com.palm.wifi/setstate", "{\"state\":\"enabled\"}",
        NULL, NULL, NULL, &lserror);
  }

  if (iface) {
    LS_SUB_CANCEL(interface_status);
    remove_iface(iface);
  }

  return true;
}

bool create_ap_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  struct interface *iface = NULL;
  bool returnValue = false;
  char *ifname = NULL;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);
  iface = (struct interface *)ctx;

  if (returnValue) {
    json_get_string(object, "ifname", &ifname);

    if (iface && ifname) {
      pthread_mutex_lock(&iface->mutex);
      iface->ifname = strdup(ifname);
      iface->iface_state = CREATED;
      pthread_mutex_unlock(&iface->mutex);
      if (!interface_status.subscribed)
        LS_PRIV_SUBSCRIBE("wifi/interfaceStatus", interface_status, ctx);
      sysinfo_response();
    }
  }
  else {
    if (iface->start_state == WIFI_ENABLED) {
      LSCall(priv_serviceHandle, "luna://com.palm.wifi/setstate", "{\"state\":\"enabled\"}",
          NULL, NULL, NULL, &lserror);
    }
    remove_iface(iface);
  }

  return true;
}

int delete_ap(char *type, char *ifname) {
  LSError lserror;
  LSErrorInit(&lserror);
  char *payload = NULL;
  struct interface *iface;

  iface = get_iface(type, ifname);
  syslog(LOG_DEBUG, "delete ap iface %p", iface);
  if (!iface)
    return -1;

  asprintf(&payload, "{\"ifname\": \"%s\"}", iface->ifname);
  if (!payload)
    return -1;

  pthread_mutex_lock(&iface->mutex);
  iface->iface_state = DESTROY_REQUESTED;
  pthread_mutex_unlock(&iface->mutex);
  sysinfo_response();

  LSCall(priv_serviceHandle, "luna://com.palm.wifi/deleteAP", payload, delete_ap_callback, 
      (void *)iface, NULL, &lserror);

  free(payload);

  return true;
}

bool interfaceRemove(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  char *type = NULL;
  char *ifname = NULL;

  object = json_parse_document(LSMessageGetPayload(msg));
  type = object->child->text;

  if (!type) {
    LS_REPLY_ERROR("No Interface type specified");
    return true;
  }

  json_t *type_label = json_find_first_label(object, type);
  json_get_string(type_label->child, "ifname", &ifname);

  if (!strcmp(type, "wifi"))
    delete_ap(type, ifname);
  else {
    struct interface *iface = get_iface(type, ifname);

    if (!strcmp(type, "bluetooth")) {
      pthread_mutex_lock(&iface->mutex);
      iface->iface_state = DESTROY_REQUESTED;
      pthread_mutex_unlock(&iface->mutex);
      sysinfo_response();

      syslog(LOG_DEBUG, "bt monitor start state was %d", (iface) ? iface->start_state : -1);
      if (iface && iface->start_state == BT_DISABLED) {
        LSCall(priv_serviceHandle, "palm://com.palm.btmonitor/monitor/radiooff", "{}", 
            NULL, NULL, NULL, &lserror);
      }
      LS_SUB_CANCEL(bluetooth);
      LS_SUB_CANCEL(btmonitor);
    }
    if (iface && !strcmp(type, "usb")) {
      pthread_mutex_lock(&iface->mutex);
      iface->iface_state = DESTROY_REQUESTED;
      pthread_mutex_unlock(&iface->mutex);
      sysinfo_response();
      set_usb_gadget_state(iface->start_state);
    }
    remove_iface(iface);
  }

  LSMessageReply(sh, msg, "{\"returnValue\":true}", &lserror);
  return true;
}

struct interface *request_interface(char *type, char *ifname, struct wifi_ap *ap) {
  LSError lserror;
  LSErrorInit(&lserror);
  struct interface *iface = NULL;
  struct interface *iter = NULL;
  char *payload = NULL;

  syslog(LOG_DEBUG, "request interface %s, %s\n", type, ifname);
  if ((ifname && get_iface(NULL, ifname)) || (type && get_iface(type, NULL))) {
    syslog(LOG_WARNING, "WARNING: Already requested interface type: %s, ifname: %s, not setting up again\n", type, ifname);
    return NULL;
  }

  iface = calloc(1, sizeof(*iface));
  if (!iface) {
    syslog(LOG_ERR, "ERROR: Unable to allocate space for additional interface!");
    return NULL;
  }

  syslog(LOG_DEBUG, "MUTEX ifaceInfo take reqi");
  pthread_mutex_lock(&ifaceInfo.mutex);
  pthread_mutex_init(&iface->mutex, NULL);
  iter = ifaceInfo.ifaces;
  if (!iter) {
    ifaceInfo.ifaces = iface;
  }
  else {
    while (iter->next) {
      iter = iter->next;
    }
    iter->next = iface;
  }
  syslog(LOG_DEBUG, "MUTEX ifaceInfo give reqi");
  pthread_mutex_unlock(&ifaceInfo.mutex);

  pthread_mutex_lock(&iface->mutex);
  iface->iface_state = CREATE_REQUESTED;

  if (type)
    iface->type = strdup(type);
  if (ifname)
    iface->ifname = strdup(ifname);
  if (ap)
    iface->ap = ap;

  pthread_mutex_unlock(&iface->mutex);

  sysinfo_response();
  return iface;
}

bool btmon_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  bool returnValue = false;
  struct interface *iface = (struct interface *)ctx;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  syslog(LOG_DEBUG, "btmon callback returnValue %d", returnValue);
  // returnValue isn't passed in subsequent subcription messages, not sure how else to 
  // distinguish non-existant from existant but false
  if (!json_find_first_label(object, "returnValue"))
    returnValue = true;

  if (returnValue) {
    char *radio = NULL;
    char *notification = NULL;

    if (is_subscription(msg))
      btmonitor.subscribed = true;

    json_get_string(object, "radio", &radio);
    json_get_string(object, "notification", &notification);
    syslog(LOG_DEBUG, "radio %s, notification %s", radio, notification);
    if (!bluetooth.subscribed && 
        ((radio && !strcmp(radio, "on")) ||
         (notification && !strcmp(notification, "notifnradioon")))) {
      syslog(LOG_DEBUG, "radio on iface %p", iface);
      LS_PRIV_SUBSCRIBE("bluetooth/pan/subscribenotifications", bluetooth, (struct interface *)iface);
    }
    if ((radio && !strcmp(radio, "turningoff")) ||
       (notification && !strcmp(notification, "notifnradioturningoff"))) {
      pthread_mutex_lock(&iface->mutex);
      iface->iface_state = DESTROY_REQUESTED;
      pthread_mutex_unlock(&iface->mutex);
      sysinfo_response();
    }
    if ((radio && !strcmp(radio, "off")) ||
       (notification && !strcmp(notification, "notifnradiooff"))) {
      LS_SUB_CANCEL(bluetooth);
      LS_SUB_CANCEL(btmonitor);
      remove_iface(iface);
      sysinfo_response();
    }
  }
  else {
    // if (is_subscription(msg))
    btmonitor.subscribed = false;
  }

  return true;
}

bool disable_wifi_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  bool returnValue = false;
  char *errorText = NULL;
  struct wifi_ap *ap;
  
  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  if (!returnValue)
    json_get_string(object, "errorText", &errorText);

  if (returnValue || (errorText && !strcmp(errorText, "AlreadyDisabled"))) {
    char *payload = NULL;
    struct interface *iface = NULL;

    ap = (struct wifi_ap *)ctx;
    iface = request_interface("wifi", NULL, ap);

    if (!iface)
      return false;

		pthread_mutex_lock(&iface->mutex);
    if (errorText && !strcmp(errorText, "AlreadyDisabled"))
      iface->start_state = WIFI_DISABLED;
    else
      iface->start_state = WIFI_ENABLED;
    pthread_mutex_unlock(&iface->mutex);

    asprintf(&payload, "{\"SSID\": \"%s\", \"Security\": \"%s\"", ap->ssid, ap->security);

    if (ap->passphrase /* && not Open ? */)
      asprintf(&payload, "%s, \"Passphrase\": \"%s\"", payload, ap->passphrase);

    asprintf(&payload, "%s}", payload);

    if (!payload)
      return false;

    LSCall(priv_serviceHandle, "palm://com.palm.wifi/createAP", payload, 
        create_ap_callback, (void *)iface, NULL, &lserror);

    free(payload);
  }
  
  return true;
}

bool bt_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  bool returnValue = false;
  char *ifname = NULL;
  char *status = NULL;
  struct interface *iface = (struct interface *)ctx;
  json_t *object;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  syslog(LOG_DEBUG, "bluetooth callback returnValue %d", returnValue);
  if (returnValue) {
    if (is_subscription(msg))
      bluetooth.subscribed = true;

    json_get_string(object, "ifname", &ifname);
    json_get_string(object, "status", &status);

    syslog(LOG_DEBUG, "ifname %s, status %s, iface %p", ifname, status, iface);
    if (ifname && status) {
      pthread_mutex_lock(&iface->mutex);
      iface->iface_state = CREATED;
      iface->ifname = strdup(ifname);
      pthread_mutex_unlock(&iface->mutex);
      sysinfo_response();

      if (iface->bridge_state != BRIDGED) {
        pthread_mutex_lock(&iface->mutex);
        iface->link_state = UP;
        pthread_mutex_unlock(&iface->mutex);
        add_bridge(iface);
      }

      update_clients(iface, json_find_first_label(object, "clientList"));
    }
  }
  else {
    // if (is_subscription(msg))
    bluetooth.subscribed = false;
  }

  return true;
}

bool enable_bt_callback(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  static bool returnValue;
  struct interface *iface;

  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_bool(object, "returnValue", &returnValue);

  syslog(LOG_DEBUG, "enable bt return %d", returnValue);

  iface = request_interface("bluetooth", NULL, NULL);
  pthread_mutex_lock(&iface->mutex);
  iface->start_state = (returnValue) ? BT_DISABLED : BT_ENABLED;
  pthread_mutex_unlock(&iface->mutex);

  if (!btmonitor.subscribed)
    LS_PRIV_SUBSCRIBE("btmonitor/monitor/subscribenotifications", btmonitor, (void *)iface);

  return true;
}

void enable_usb(struct interface *iface) {
  int state = get_usb_gadget_state();

  syslog(LOG_DEBUG, "enable usb gadget state %d", state);
  switch(state) {
    case RH_CONFIG_USBNET_UMS_NOVACOM:
    case RH_CONFIG_USBNET_PASSTHRU:
      break;
    case RH_CONFIG_UMS:
    case RH_CONFIG_UMS_NOVACOM:
      set_usb_gadget_state(RH_CONFIG_USBNET_UMS_NOVACOM);
      break;
    case RH_CONFIG_PASSTHRU:
    case RH_CONFIG_PASSTHRU_NOVACOM:
      set_usb_gadget_state(RH_CONFIG_USBNET_PASSTHRU);
      break;
    default:
      syslog(LOG_ERR, "Error unknown usb gadget state %d", state);
      return;
      break;
  }

  pthread_mutex_lock(&iface->mutex);
  iface->iface_state = CREATED;
  iface->link_state = UP;
  iface->start_state = state;
  pthread_mutex_unlock(&iface->mutex);

  sysinfo_response();
  add_bridge(iface);
}

bool interfaceAdd(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  char *type = NULL;
  char *ifname = NULL;
  char command[80];
  json_t *object;
  char *uri = NULL;

  // payload's first label is the type which can be wifi, bluetooth or usb
  object = json_parse_document(LSMessageGetPayload(msg));
  type = object->child->text;
  if (!type) {
    LS_REPLY_ERROR("No Interface type specified");
    return true;
  }

  if (!strcmp(type, "wifi")) {
    struct wifi_ap *ap;
    char *ssid = NULL;
    char *security = NULL;
    char *passphrase = NULL;
    char *payload = NULL;
    json_t *wifi = json_find_first_label(object, "wifi");

    json_get_string(wifi->child, "SSID", &ssid);
    json_get_string(wifi->child, "Security", &security);
    json_get_string(wifi->child, "Passphrase", &passphrase);

    if (!ssid) {
      LS_REPLY_ERROR("No SSID supplied");
      return true;
    }

    // TODO: Add check for valid security method
    if (!security) {
      security = malloc(strlen("Open") + 1);
      strcpy(security, "Open");
    }

    ap = calloc(1, sizeof(struct wifi_ap));
    if (!ap) {
      LS_REPLY_ERROR("Out of memory");
      return true;
    }

    if (ssid)
      ap->ssid = strdup(ssid);
    if (security)
      ap->security = strdup(security);
    if (passphrase)
      ap->passphrase = strdup(passphrase);

    LSCall(priv_serviceHandle, "palm://com.palm.wifi/setstate", "{\"state\": \"disabled\"}", 
        disable_wifi_callback, (void*)ap, NULL, &lserror);
  }
  else if (!strcmp(type, "bluetooth")) {
    LSCall(priv_serviceHandle, "palm://com.palm.btmonitor/monitor/radioon", 
        "{\"visible\":true, \"connectable\": true}", enable_bt_callback, NULL, NULL, &lserror);
  }
  else if (!strcmp(type, "usb")) {
    struct interface *iface = NULL;
    
    if (object->child && object->child->child && object->child->child->type == JSON_OBJECT)
      json_get_string(object->child->child, "ifname", &ifname);

    if (!ifname) {
      LS_REPLY_ERROR("Invalid ifname specified");
      return true;
    }

    iface = request_interface("usb", ifname, NULL);
    if (iface)
      enable_usb(iface);
  }
  else {
    LS_REPLY_ERROR("Invalid Interface type specified");
    return true;
  }

  LSMessageReply(sh, msg, "{\"returnValue\":true}", &lserror);
  return true;
}

bool sysInfo(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  char *payload;
  bool subscribed = false;

  payload = generate_sysinfo_json();
  asprintf(&payload, "{\"returnValue\": true, \"subscribed\": true, %s }", payload);

  LSSubscriptionProcess(sh, msg, &subscribed, &lserror);

  if (payload) {
    LSMessageReply(sh, msg, payload, &lserror);
    free(payload);
  }
  else {
    LSMessageReply(sh, msg, "{\"returnValue\": false}", &lserror);
  }

  if (LSErrorIsSet(&lserror)) {
    LSErrorPrint(&lserror, stderr);
    LSErrorFree(&lserror);
  }

  return true;
}

bool clientList(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  char *payload;
  bool subscribed = false;

  payload = generate_clientlist_json();
  asprintf(&payload, "{\"returnValue\": true, \"subscribed\": true, %s }", payload);

  LSSubscriptionProcess(sh, msg, &subscribed, &lserror);

  if (payload) {
    LSMessageReply(sh, msg, payload, &lserror);
    free(payload);
  }
  else {
    LSMessageReply(sh, msg, "{\"returnValue\": false}", &lserror);
  }

  if (LSErrorIsSet(&lserror)) {
    LSErrorPrint(&lserror, stderr);
    LSErrorFree(&lserror);
  }

  return true;
}

bool stop(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  json_t *object;
  object = json_parse_document(LSMessageGetPayload(msg));

  char *wifi = NULL;
  char *usb = NULL;
  char *bluetooth = NULL;

  json_get_string(object, "wifi", &wifi);
  json_get_string(object, "usb", &usb);
  json_get_string(object, "bluetooth", &bluetooth);
  
	struct interface *iface = get_iface("wifi", wifi);
	if (iface) {  
	  wifi_set_managed(wifi);
	  if (iface->start_state == WIFI_ENABLED) {
	    LSCall(priv_serviceHandle, "luna://com.palm.wifi/setstate", "{\"state\":\"enabled\"}",
	        NULL, NULL, NULL, &lserror);
	  }
  }

  LSMessageReply(sh, msg, "{\"returnValue:\": true}", &lserror);

  if (loop)
    g_main_loop_quit(loop);

  return true;
}
bool setIP(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);
  json_t *object;
  char *gateway = NULL;
  char *subnet = NULL;
  char *poolstart = NULL;
  int maxLeases = 0;
  int leaseTime = 0;
 
  object = json_parse_document(LSMessageGetPayload(msg));
  json_get_string(object, "gateway", &gateway);
  json_get_string(object, "subnet", &subnet);
  json_get_string(object, "poolstart", &poolstart);
  json_get_int(object, "maxLeases", &maxLeases);
  json_get_int(object, "leaseTime", &leaseTime);

  // TODO: Error check the ipv4 formats
  if (gateway) {
    FREE(ifaceInfo.ip);
    ifaceInfo.ip = strdup(gateway);
  }

  if (subnet) {
    FREE(ifaceInfo.subnet);
    ifaceInfo.subnet = strdup(subnet);
  }

  if (poolstart) {
    FREE(ifaceInfo.poolstart);
    ifaceInfo.poolstart = strdup(poolstart);
  }

  if (maxLeases)
    ifaceInfo.maxLeases = maxLeases;

  if (leaseTime)
    ifaceInfo.leaseTime = leaseTime;

  LSMessageReply(sh, msg, "{\"returnValue:\": true}", &lserror);
  sysinfo_response();
  return true;
}

bool version(LSHandle *sh, LSMessage *msg, void *ctx) {
  LSError lserror;
  LSErrorInit(&lserror);

  LSMessageReply(sh, msg, "{\"returnValue:\": true}", &lserror);
  return true;
}

LSMethod luna_methods[] = {
  {"restart_bluetooth", restart_bluetooth},
  {"get_usb_gadget", get_usb_gadget},
  {"set_usb_gadget", set_usb_gadget},
  {"get_ip_forward", get_ip_forward},
  {"toggle_ip_forward", toggle_ip_forward},
  {"version", version},
  {"interfaceAdd", interfaceAdd},
  {"interfaceRemove", interfaceRemove},
  {"sysInfo", sysInfo},
  {"clientList", clientList},
  {"setIP", setIP},
  {"stop", stop},
#if 0
  {"configRead", configRead},
  {"configWrite", configWrite},
  {"deauthclient", deauthclient},
#endif
  { NULL, NULL},
};

void early_subscription() {
  LSError lserror;
  LSErrorInit(&lserror);

  LS_PRIV_SUBSCRIBE("btmonitor/monitor/subscribenotifications", btmonitor, NULL);
}

bool register_methods(LSPalmService *serviceHandle, LSError lserror) {
	return LSPalmServiceRegisterCategory(serviceHandle, "/", luna_methods,
			NULL, NULL, NULL, &lserror);
}
