#include <stdio.h>
#include <string.h>
#include "freetether.h"

#ifndef APP_ID
#error Must define APP_ID macro
#endif

struct iface_info ifaceInfo;

static void sys_info_init() {
  memset(&ifaceInfo, 0, sizeof(ifaceInfo));
  pthread_mutex_init(&ifaceInfo.mutex, NULL); 
  pthread_cond_init (&ifaceInfo.state_change, NULL);
}

static void *iface_thread(void *arg) {
  while (1) {
    pthread_cond_wait(&ifaceInfo.state_change, &ifaceInfo.mutex);
    pthread_mutex_unlock(&ifaceInfo.mutex);
  }

  return NULL;
}

int main(int argc, char **argv) {
  pthread_t tid;

  sys_info_init();
  pthread_create(&tid, NULL, iface_thread, NULL);
  if (luna_service_initialize(APP_ID))
    luna_service_start();

  return 0;
}
