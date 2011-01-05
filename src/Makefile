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
LDFLAGS := -g -L. -L${STAGING_DIR}/usr/lib -llunaservice -lmjson -lglib-2.0 -lpthread -lrt

OBJECTS=freetether.o luna_service.o luna_methods.o ip_forward.o usb_gadget.o bluetooth.o
HEADERS=freetether.h luna_service.h luna_methods.h

all: freetether

$(OBJECTS): $(HEADERS)
freetether: $(OBJECTS)

clobber:
	rm -f freetether $(OBJECTS)
