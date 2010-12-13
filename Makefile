export APP_ID=$(shell grep id appinfo.json | cut -d\" -f4)
VERSION=$(shell grep version appinfo.json | cut -d\" -f4)
META_VERSION=1
IPKG=${APP_ID}_${VERSION}-${META_VERSION}_arm.ipk

.PHONY: install run clobber clean

all: service package

service:
	$(MAKE) -C src

${IPKG}: build/arm/CONTROL/control
	cp control/* build/arm/CONTROL/
	mkdir -p build/arm/usr/palm/applications/${APP_ID}
	cp -r app build/arm/usr/palm/applications/${APP_ID}
	cp *.json build/arm/usr/palm/applications/${APP_ID}
	cp *.html build/arm/usr/palm/applications/${APP_ID}
	cp *.png build/arm/usr/palm/applications/${APP_ID}
	cp -r images build/arm/usr/palm/applications/${APP_ID}
	cp -r stylesheets build/arm/usr/palm/applications/${APP_ID}
	cp -r dbus build/arm/usr/palm/applications/${APP_ID}
	mkdir -p build/arm/usr/palm/applications/${APP_ID}/bin
	install -m 755 src/freetether build/arm/usr/palm/applications/${APP_ID}/bin/${APP_ID}
	( cd build; TAR_OPTIONS="--wildcards --mode=g-s" ipkg-build -o 0 -g 0 -p arm )
	mv build/${APP_ID}_${VERSION}-${META_VERSION}_arm.ipk .

build/%/CONTROL/control:
	mkdir -p build/arm/CONTROL
	rm -f $@
	@echo "Package: ${APP_ID}" > $@
	@echo "Version: ${VERSION}-${META_VERSION}" >> $@
	@echo "Architecture: arm" >> $@
	@echo "Maintainer: Ryan Hope <rmh3093@gmail.com>, Eric Gaudet <emoney_33@yahoo.com>" >> $@
	@echo "Description: freeTether" >> $@
	@echo "Section: System Utilities" >> $@
	@echo "Priority: optional" >> $@
	@echo "Source: {}" >> $@

package: ${IPKG}

install: ${IPKG}
	palm-install ${IPKG}

run: install
	palm-launch ${APP_ID}

clobber:
	$(MAKE) -C src clobber
	rm -rf build ${IPKG}

clean: clobber
