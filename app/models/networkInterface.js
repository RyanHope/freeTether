function networkInterface(name) {
	
	this.name		= name;
	this.state		= false;
	this.address	= false;
	
	this.ipModel = {
		disabled: false
    };
	
	this.stateModel = {
		value: false,
		disabled: false
	};
		
}

networkInterface.prototype.getListObject = function()
{
	
	var obj =
	{
		key:		networkInterfaces.getInterfaceArrayKey(this.name),
		name:		this.name,
	};
		
	return obj;
	
}