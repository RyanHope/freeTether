#ifndef FREETETHER_H
#define FREETETHER_H

#include <pthread.h>

typedef enum {
  ASSIGN_REQUESTED,
  ASSIGNED,
  REMOVE_REQUESTED,
  REMOVED
} IP_STATE;

typedef enum {
  START_REQUESTED,
  STARTED,
  STOP_REQUESTED,
  STOPPED
} DHCP_STATE;

typedef enum {
  CREATE_REQUESTED,
  CREATED,
  DESTROY_REQUESTED,
  DESTROYED
} IFACE_STATE;

typedef enum {
  UNBRIDGED,
  BRIDGED,
} BRIDGE_STATE;

typedef enum {
  UNKNOWN,
  UP,
  DOWN
} LINK_STATE;

struct interface {
  char *ifname;
  IFACE_STATE iface_state;
  BRIDGE_STATE bridge_state;
  LINK_STATE link_state;
  char *type;
  char *ssid;
  char *security;
  char *passphrase;
  pthread_mutex_t mutex;
  struct interface *next;
};

struct iface_info {
  char bridge[16];
  char ip[16];
  char subnet[16];
  char poolstart[16];
  IP_STATE ip_state;
  DHCP_STATE dhcp_state;
  struct interface *ifaces;
  int num_ifaces;
  pthread_cond_t state_change;
  pthread_mutex_t mutex;
};

extern struct iface_info ifaceInfo;
#endif
