#ifndef LUNA_SERVICE_H_
#define LUNA_SERVICE_H_

#include <stdbool.h>
#include <lunaservice.h>

LSPalmService	*serviceHandle;
LSHandle		*pub_serviceHandle;
LSHandle		*priv_serviceHandle;

bool luna_service_initialize(const char *dbusAddress);
void luna_service_start();
void luna_service_cleanup();

#endif /* LUNA_SERVICE_H_ */
