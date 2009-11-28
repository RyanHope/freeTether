function networkInterfaces() {
		
	this.listAssistant		= false; 
	
	this.interfaces	= $H();
	this.interfaces.set('ppp0', new networkInterface('ppp0', ''));
	this.interfaces.set('usb0', new networkInterface('usb0', 'USB'));
	this.interfaces.set('eth0', new networkInterface('eth0', 'Wireless'));
	this.interfaces.set('bsl0', new networkInterface('bsl0', 'Bluetooth'));
			
}

networkInterfaces.prototype.debugPayload = function(payload) {
	
	alert('------');
	for (p in payload) 
		alert(p + ': ' + payload[p]);
		
}

networkInterfaces.prototype.errorHandler = function(payload) {

	this.debugPayload(payload);
		
}

networkInterfaces.prototype.setListAssistant = function(assistant) {
	
	this.listAssistant = assistant;
	
}

networkInterfaces.prototype.getListObjects = function() {
	
	var returnArray = [];
	
	var iname = this.interfaces.keys();
	for (var i = 0; i < iname.length; i++)
	{
		/*
		 * XXX: Dirty hack!
		 */
		if (iname[i]=='ppp0')
			this.interfaces.get(iname[i]).description = carrier;
		returnArray.push(this.interfaces.get(iname[i]).getListObject());
	}
	
	return returnArray;
	
}