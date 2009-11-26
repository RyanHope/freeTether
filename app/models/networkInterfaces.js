function networkInterfaces()
{
	
	this.listAssistant		= false;
	
	this.interfaceNames		= ['ppp0','usb0','eth0','bsl0'];
	
	this.networkInterfaces	= [];
	for (var i=0; i<this.interfaceNames.length; i++)
		this.networkInterfaces[this.interfaceNames[i]] = new networkInterface(this.interfaceNames[i]);
		
}

networkInterfaces.prototype.setListAssistant = function(assistant)
{
	this.listAssistant = assistant;
}

networkInterfaces.prototype.getListObjects = function()
{
	var returnArray = [];
	if (this.networkInterfaces.length > 0)
	{
		for (var i = 0; i < this.networkInterfaces.length; i++)
		{
			if (this.networkInterfaces[i]) 
			{
				returnArray.push(this.networkInterfaces[i].getListObject());
			}
		}
	}
	return returnArray;
}

networkInterfaces.prototype.getInterfaceArrayKey = function(name)
{
	if (this.networkInterfaces.length > 0)
	{
		for (var i = 0; i < this.networkInterfaces.length; i++)
		{
			if (this.networkInterfaces[i].name == name)
			{
				return i;
			}
		}
	}
	return false;
}

networkInterfaces.prototype.getInterfaceForId = function(name)
{
	if (this.networkInterfaces.length > 0)
	{
		for (var i = 0; i < this.networkInterfaces.length; i++)
		{
			if (this.networkInterfaces[i].name == name)
			{
				return this.networkInterfaces[i];
			}
		}
	}
	return false;
}
