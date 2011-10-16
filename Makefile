APPID = org.webosinternals.freetether

.PHONY: install run clobber clean

all: package

service:
	$(MAKE) -C src

package: service
	palm-package -X excludes.txt .
	ar q ${APPID}_*.ipk pmPostInstall.script
	ar q ${APPID}_*.ipk pmPreRemove.script

install:
	palm-install ${APPID}_*.ipk

run: install
	palm-launch ${APPID}

put-svc:
	novacom run 'file:///usr/bin/killall -9 ${APPID}' || true
	novacom put file:///var/usr/sbin/${APPID} < src/freetether

clobber:
	$(MAKE) -C src clobber
	rm -rf build *.ipk

clean: clobber
