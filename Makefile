export APP_ID=$(shell grep id appinfo.json | cut -d\" -f4)
VERSION=$(shell grep version appinfo.json | cut -d\" -f4)
META_VERSION=1

.PHONY: service package run clobber

all: package

service:
	$(MAKE) -C src

ipkgs/${APP_ID}_${VERSION}-${META_VERSION}_arm.ipk: service build/arm/CONTROL/control
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
	mkdir -p ipkgs
	( cd build; TAR_OPTIONS="--wildcards --mode=g-s" ipkg-build -o 0 -g 0 -p arm )
	mv build/${APP_ID}_${VERSION}-${META_VERSION}_arm.ipk $@
	#ipkg-make-index -v -p ipkgs/Packages ipkgs
	#rsync -av ipkgs/ /source/www/feeds/test

build/%/CONTROL/control:
	mkdir -p build/arm/CONTROL
	rm -f $@
	@echo "Package: ${APP_ID}" > $@
	@echo "Version: ${VERSION}-${META_VERSION}" >> $@
	@echo "Architecture: arm" >> $@
	@echo "Maintainer: Ryan Hope, Eric J Gaudet <emoney_33@yahoo.com>" >> $@
	@echo "Description: FreeTether" >> $@
	@echo "Section: System Utilities" >> $@
	@echo "Priority: optional" >> $@
	@echo "Source: {}" >> $@

package: ipkgs/${APP_ID}_${VERSION}-${META_VERSION}_arm.ipk

run:
	palm-install ${APP_ID}_${VERSION}_arm.ipk
	palm-launch ${APP_ID}

clobber:
	$(MAKE) -C src clobber
	rm -f build ipkgs
