import struct, urllib2, zipfile, os, shutil, cStringIO, sys, tempfile, tarfile

def _get_file(url, zinfo, targetpath=None, strip=False):
    z_start = zinfo.header_offset + zipfile.sizeFileHeader + len(zinfo.filename) + len(zinfo.extra)
    z_end = z_start + zinfo.compress_size
    req = urllib2.Request(url)
    req.add_header("Range","bytes=%s-%s" % (z_start, z_end))
    f = urllib2.urlopen(req)
    data = f.read()
    tmp = cStringIO.StringIO(data)
    z = zipfile.ZipExtFile(fileobj=tmp, zipinfo=zinfo)
    if targetpath is None:
        targetpath = os.getcwd()
    if (targetpath[-1:] in (os.path.sep, os.path.altsep) and len(os.path.splitdrive(targetpath)[1]) > 1):
        targetpath = targetpath[:-1]
    if strip:
        targetpath = os.path.join(targetpath, zinfo.filename.split('/')[-1])
    else:
        if zinfo.filename[0] == '/':
            targetpath = os.path.join(targetpath, zinfo.filename[1:])
        else:
            targetpath = os.path.join(targetpath, zinfo.filename)
    targetpath = os.path.normpath(targetpath)
    upperdirs = os.path.dirname(targetpath)
    if upperdirs and not os.path.exists(upperdirs):
        os.makedirs(upperdirs)
    if zinfo.filename[-1] == '/':
        if not os.path.isdir(targetpath):
            os.mkdir(targetpath)
        return targetpath    
    target = file(targetpath, "wb")
    shutil.copyfileobj(z, target)
    z.close()
    target.close()
    return targetpath
    

def _get_centdir(url, endrec):
    req = urllib2.Request(url)
    req.add_header("Range","bytes=%s-%s" % (endrec[zipfile._ECD_OFFSET],
                                            endrec[zipfile._ECD_OFFSET]+endrec[zipfile._ECD_SIZE]))
    f = urllib2.urlopen(req)
    data = f.read()
    centdir_dict = {}
    total = 0
    #concat = endrec[zipfile._ECD_LOCATION] - endrec[zipfile._ECD_SIZE] - endrec[zipfile._ECD_OFFSET]
    while total < endrec[zipfile._ECD_SIZE]:
        centdir = data[total:total+zipfile.sizeCentralDir]
        centdir = struct.unpack(zipfile.structCentralDir, centdir)
        fn_start = total + zipfile.sizeCentralDir
        fn_end = fn_start + centdir[zipfile._CD_FILENAME_LENGTH]
        filename = data[fn_start:fn_end]
        x = zipfile.ZipInfo(filename)
        extra_end = fn_end + centdir[zipfile._CD_EXTRA_FIELD_LENGTH]
        x.extra = data[fn_end:extra_end]
        x.header_offset = centdir[zipfile._CD_LOCAL_HEADER_OFFSET]
        (x.create_version, x.create_system, x.extract_version, x.reserved,
            x.flag_bits, x.compress_type, t, d,
            x.CRC, x.compress_size, x.file_size) = centdir[1:12]
        x.volume, x.internal_attr, x.external_attr = centdir[15:18]
        x._raw_time = t
        x.date_time = ( (d>>9)+1980, (d>>5)&0xF, d&0x1F,
                                 t>>11, (t>>5)&0x3F, (t&0x1F) * 2 )
        x._decodeExtra()
        #x.header_offset = x.header_offset + concat
        x.filename = x._decodeFilename()
        total = (fn_end + centdir[zipfile._CD_EXTRA_FIELD_LENGTH] + centdir[zipfile._CD_COMMENT_LENGTH])
        centdir_dict[filename] = x
    return centdir_dict

def _get_endrec(url):
    req = urllib2.Request(url)   
    req.add_header("Range","bytes=-%s" % (zipfile.sizeEndCentDir))
    f = urllib2.urlopen(req)
    data = f.read()
    
    if data[0:4] == zipfile.stringEndArchive and data[-2:] == "\000\000":
        return list(struct.unpack(zipfile.structEndArchive, data))
    
def list_files(url, details=False):
    endrec = _get_endrec(url)
    centdir = _get_centdir(url, endrec)
    if details:
        return centdir
    else:
        return centdir.keys()

def http_unzip(url, filenames, targetpath, verbose=False, strip=False, callback=None):
    if callback:
        callback(0, 'FIND_ENDREC')
    endrec = _get_endrec(url)
    if callback:
		if endrec:
			callback(100, 'FIND_ENDREC_SUCCESS')
		else:
			callback(0, 'FIND_ENDREC_FAILED')
			return None
		callback(0, 'FIND_CENTDIR')
    centdir = _get_centdir(url, endrec)
    if callback:
		if centdir:
			callback(100, 'FIND_CENTDIR_SUCCESS')
		else:
			callback(0, 'FIND_CENTDIR_FAILED')
    files = []
    r = len(filenames)
    for i in range(0, r):
        if callback:
            callback(0, 'HTTPUNZIP %s' % (filenames[i]))
        f = _get_file(url, centdir[filenames[i]], targetpath, strip)
        if f:
            files.append(f)
            if verbose:
                print f
    return files
    
def print_progress(percent, msg):
	print percent, msg
    
if __name__ == '__main__':
	if len(sys.argv) == 2:
		path = os.path.join(tempfile.gettempdir(),'mhs')
		if not os.path.exists(path):
			os.mkdir(path)
		os.chdir(path)
		carrier = None
		if sys.argv[1].find('verizonwireless') != -1:
			carrier = 'resources/verizon.tar'
		elif sys.argv[1].find('att') != -1:
			carrier = 'resources/att.tar'
		http_unzip(sys.argv[1], [carrier, 'resources/webOS.tar'], path, verbose=True, callback=print_progress)
		tar = tarfile.open(os.path.join(path,carrier),"r:*")
		ipk = None
		for tarinfo in tar:
			if tarinfo.name.find('com.palm.app.mobilehotspot') != -1:
				ipk = tarinfo.name
				tar.extract(tarinfo)
				break
		tar.close()
		tar = tarfile.open(os.path.join(path,'resources/webOS.tar'),"r:*")
		for tarinfo in tar:
			if tarinfo.name.find('nova-cust-image-') != -1:
				tar.extract(tarinfo)
				tar2 = tarfile.open(os.path.join(path,tarinfo.name),"r:*")
				for tarinfo2 in tar2:
					if tarinfo2.name == './usr/bin/mobilehotspotd':
						tar2.extract(tarinfo2)
						break
				tar2.close()
				break
		tar.close()
		print os.system('novacom run file://bin/mount -- -o remount,rw /')
		print os.system('novacom put file://usr/bin/mobilehotspotd < usr/bin/mobilehotspotd')
		print os.system('novacom put file://tmp/'+ipk+' < '+ipk)
		print os.system('novacom run file://usr/bin/ipkg -- install /tmp/'+ipk)
		print os.system('novacom run file://usr/bin/luna-send -- -n 1 palm://com.palm.applicationManager/rescan {}')
		shutil.rmtree(path)
