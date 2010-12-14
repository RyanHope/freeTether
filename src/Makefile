VERSION = unknown

STAGING_DIR?=${ROOT}
#CC=arm-none-linux-gnueabi-gcc

CPPFLAGS := -g -DVERSION=\"${VERSION}\" \
					-I${STAGING_DIR}/usr/include/glib-2.0 \
					-I${STAGING_DIR}/usr/lib/glib-2.0/include \
					-I${STAGING_DIR}/usr/include \
					-I${STAGING_DIR}/usr/include/liblunaservice \
					-I${STAGING_DIR}/usr/include/mjson \
					-I. \
					-DAPP_ID=\"${APP_ID}\"
LDFLAGS := -g -L. -L${STAGING_DIR}/usr/lib -llunaservice -lmjson -lglib-2.0 -lpthread -lrt -lnetbridge

OBJECTS=freetether.o luna_service.o luna_methods.o

all: freetether

freetether: $(OBJECTS)

clobber:
	rm -f freetether $(OBJECTS)
