freeTetherD.identifier = 'luna://us.ryanhope.freeTetherD';

function freeTetherD() {}

freeTetherD.getCarrier = function(onSuccess, onFailure)
{
	var request = new Mojo.Service.Request(freeTetherD.identifier,
	{
		method: 'get_carrier',
		parameters: {},
		onSuccess: onSuccess,
		onFailure: onFailure
	});

	return request;
}

freeTetherD.getIPforward = function(onSuccess, onFailure)
{
	var request = new Mojo.Service.Request(freeTetherD.identifier,
	{
		method: 'get_ip_forward',
		parameters: {
			"subscribe":true
		},
		onSuccess: onSuccess,
		onFailure: onFailure
	});

	return request;
}

freeTetherD.toggleIPforward = function(onSuccess, onFailure)
{
	var request = new Mojo.Service.Request(freeTetherD.identifier,
	{
		method: 'toggle_ip_forward',
		parameters: {},
		onSuccess: onSuccess,
		onFailure: onFailure
	});

	return request;
}

freeTetherD.natEnable = function(onSuccess, onFailure)
{
	var request = new Mojo.Service.Request(freeTetherD.identifier,
	{
		method: 'enable_nat',
		parameters: {},
		onSuccess: onSuccess,
		onFailure: onFailure
	});

	return request;
}

freeTetherD.natDisable = function(onSuccess, onFailure)
{
	var request = new Mojo.Service.Request(freeTetherD.identifier,
	{
		method: 'disable_nat',
		parameters: {},
		onSuccess: onSuccess,
		onFailure: onFailure
	});

	return request;
}

freeTetherD.getInterface = function(iface, onSuccess, onFailure)
{
	var request = new Mojo.Service.Request(freeTetherD.identifier,
	{
		method: 'get_interface',
		parameters: {"interface":iface},
		onSuccess: onSuccess,
		onFailure: onFailure
	});

	return request;
}

freeTetherD.getIP = function(iface, onSuccess, onFailure)
{
	var request = new Mojo.Service.Request(freeTetherD.identifier,
	{
		method: 'get_ip_address',
		parameters: {"interface":iface},
		onSuccess: onSuccess,
		onFailure: onFailure
	});

	return request;
}

freeTetherD.setIP = function(iface, addy, onSuccess, onFailure)
{
	var request = new Mojo.Service.Request(freeTetherD.identifier,
	{
		method: 'set_ip_address',
		parameters: {
			"interface": iface,
			"address": addy,
		},
		onSuccess: onSuccess,
		onFailure: onFailure
	});

	return request;
}