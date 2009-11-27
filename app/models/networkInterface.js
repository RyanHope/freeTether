function networkInterface(name, description) {
	
	this.name			= name;
	this.description	= description;
	this.state			= false;
	this.address		= false;
	
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
		key:			networkInterfaces.interfaces.get(this.name),
		name:			this.name,
		description:	this.description,
	};
		
	return obj;
	
}