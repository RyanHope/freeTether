export APP_ID=$(shell grep id appinfo.json | cut -d\" -f4)
VERSION=$(shell grep version appinfo.json | cut -d\" -f4)

.PHONY: service package run clobber

all: service package

service:
	$(MAKE) -C src

package:
	palm-package .

run:
	palm-install ${APP_ID}_${VERSION}_all.ipk
	palm-launch ${APP_ID}

clobber:
	$(MAKE) -C src clobber
