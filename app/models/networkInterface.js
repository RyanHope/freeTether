function networkInterface(name, description) {
	
	this.name			= name;
	this.description	= description;
	this.state			= false;
	this.address		= false;
	this.broadcast		= false;
	this.netmask		= false;
	this.cidr			= false;
	this.tx				= false;
	this.rx				= false;
	
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
		state:			this.state,
		address:		this.address,
		broadcast:		this.broadcast,
		netmask:		this.netmask,
		cidr:			this.cidr,
		tx:				this.tx,
		rx:				this.rx,
	};
		
	return obj;
	
}