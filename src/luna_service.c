#include <glib.h>
#include "luna_service.h"
#include "luna_methods.h"

GMainLoop *loop = NULL;

bool luna_service_initialize(const char *dbusAddress) {
	bool retVal = FALSE;
	LSError lserror;
	LSErrorInit(&lserror);

	loop = g_main_loop_new(NULL, FALSE);
	if (!loop)
		goto end;

	retVal = LSRegisterPalmService(dbusAddress, &serviceHandle, &lserror);
	if (retVal) {
		pub_serviceHandle = LSPalmServiceGetPublicConnection(serviceHandle);
		priv_serviceHandle = LSPalmServiceGetPrivateConnection(serviceHandle);
	} else
		goto end;

	register_methods(serviceHandle, lserror);
	//register_subscriptions(serviceHandle, lserror);

	LSGmainAttachPalmService(serviceHandle, loop, &lserror);

end: 
  if (LSErrorIsSet(&lserror)) {
		LSErrorPrint(&lserror, stderr);
		LSErrorFree(&lserror);
	}

	return retVal;
}

void luna_service_start() {
  LSError lserror;
  LSErrorInit(&lserror);

  start_subscriptions();
  g_main_loop_run(loop);
}
