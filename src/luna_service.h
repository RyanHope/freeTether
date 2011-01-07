#ifndef LUNA_SERVICE_H_
#define LUNA_SERVICE_H_

#include <stdbool.h>
#include <lunaservice.h>

extern LSPalmService	*serviceHandle;
extern LSHandle		*pub_serviceHandle;
extern LSHandle		*priv_serviceHandle;
extern GMainLoop *loop;

bool luna_service_initialize(const char *dbusAddress);
void luna_service_start();
void luna_service_cleanup();

#endif /* LUNA_SERVICE_H_ */
