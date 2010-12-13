export APP_ID=$(shell grep id appinfo.json | cut -d\" -f4)
VERSION=$(shell grep version appinfo.json | cut -d\" -f4)

.PHONY: run
run:
	palm-package .
	palm-install ${APP_ID}_${VERSION}_all.ipk
	palm-launch ${APP_ID}

.PHONY: service
service:
	$(MAKE) -C src

.PHONY: clobber
clobber:
	$(MAKE) -C src clobber
