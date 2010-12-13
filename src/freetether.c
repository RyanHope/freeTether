#include <stdlib.h>
#include <stdio.h>
#include <syslog.h>
#include <signal.h>
#include <sys/mount.h>

#include "freetether.h"

#ifndef APP_ID
#error Must define APP_ID macro
#endif

#ifndef DEBUG
#define DEBUG 0
#endif

void cleanup() {
	umount(tmpDir);
	rmdir(tmpDir);
	umount(IP_FORWARD);
	free(tmpDir);
	free(tmpIPforwardPath);
}

void sighandler(int sig) {
	cleanup();
	exit(0);
}

int setupTmpDir() {

	char template[] = "/tmp/freeTether.XXXXXX";
	char *d = mkdtemp(template);

	if (d==NULL) {
		if (DEBUG) syslog(LOG_ERR, "Failed creating tmp directory %s", template);
		return 1;
	} else {
		tmpDir = strdup(d);
		syslog(LOG_INFO, "Temporary directory %s created", tmpDir);
		if (mount("/dev/null", IP_FORWARD, NULL, MS_BIND, NULL)) {
			if (DEBUG) syslog(LOG_ERR, "Failed binding %s to %s", tmpIPforwardPath, IP_FORWARD);
			return 1;
		} else {
			syslog(LOG_INFO, "Procfs now available at %s", tmpDir);
			tmpIPforwardPath = 0;
			if (asprintf(&tmpIPforwardPath,"%s/sys/net/ipv4/ip_forward",tmpDir) == -1) {
				if (DEBUG) syslog(LOG_ERR, "Failed creating tmp ip_forward path");
				return 1;
			}
		}
	}

	return 0;

}

int main(int argc, char **argv) {

	signal(SIGINT, sighandler);
	signal(SIGTERM, sighandler);
	signal(SIGQUIT, sighandler);
	signal(SIGHUP, sighandler);
	signal(SIGKILL, sighandler);

	openlog(APP_ID, LOG_PID, LOG_USER);

	setupTmpDir();

	if (luna_service_initialize(APP_ID))
		luna_service_start();

	return 0;
}
