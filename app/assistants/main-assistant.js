function MainAssistant() {
	
	this.cmSubscription = network.cmGetStatus(
		this.cmHandler.bindAsEventListener(this),
		this.errorHandler.bindAsEventListener(this)
	);
	
	this.getIPforwardSubscription = freeTetherD.getIPforward(
		this.getIPforwardHandler.bindAsEventListener(this),
		this.errorHandler.bindAsEventListener(this)
	);
	
	this.wanIPmodel = {
		disabled: true
    };
	this.wifiIPmodel = {
		disabled: false
    };
	this.usbIPmodel = {
		disabled: false
    };
	this.btIPmodel = {
		disabled: false
    };
	
	this.ipForwardingModel = {
		value: false,
		disabled: false
	};
	
	this.natModel = {
		value: true,
		disabled: false
	};
	
	freeTetherD.natEnable(false, false);
	
	this.versionElement = false;
	
}

MainAssistant.prototype.setup = function() {
	
	this.versionElement = this.controller.get('version');
	this.versionElement.innerHTML = "v" + Mojo.Controller.appInfo.version;
	
	this.wanGroup = this.controller.get('wanGroup');
	this.wifiGroup = this.controller.get('wifiGroup');
	this.usbGroup = this.controller.get('usbGroup');
	this.btGroup = this.controller.get('btGroup');
	
	this.wanIP = this.controller.get('wanIP');
	this.wifiIP = this.controller.get('wifiIP');
	this.usbIP = this.controller.get('usbIP');
	this.btIP = this.controller.get('btIP');

	this.wifiGroup.style.display = 'none';
	this.usbGroup.style.display = 'none';
	this.btGroup.style.display = 'none';
			
	this.menuModel = {
		visible:true,
		items: [
			{},
			{label:$L('Views'), 
			toggleCmd:'show-wan', 
			items:[
				{label:$L('Main'), command:'show-wan'}, 
				{label:$L('USB'), icon:'icon-usb', command:'show-usb'},
				{label:$L('WIFI'), icon:'icon-wifi', command:'show-wifi'}, 
				{label:$L('BT'), icon:'icon-bt', command:'show-bt'}
			]},
			{},
		]
	};
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.menuModel);

	this.controller.setupWidget("wanIP",
		this.attributes = {
			multiline: false,
			enterSubmits: true,
			focus: false
		},
		this.model = this.wanIPmodel
	);
	this.controller.setupWidget("wifiIP",
		this.attributes = {
			multiline: false,
			enterSubmits: true,
			holdToEdit: true,
			focus: false
		},
		this.model = this.wifiIPmodel
	);
	Mojo.Event.listen(this.wifiIP, Mojo.Event.propertyChange, this.changeIPwifi.bindAsEventListener(this));
	
	this.controller.setupWidget("usbIP",
		this.attributes = {
			multiline: false,
			enterSubmits: true,
			holdToEdit: true,
			focus: false
		},
		this.model = this.usbIPmodel
	);
	Mojo.Event.listen(this.usbIP, Mojo.Event.propertyChange, this.changeIPusb.bindAsEventListener(this));
	
	this.controller.setupWidget("btIP",
		this.attributes = {
			multiline: false,
			enterSubmits: true,
			holdToEdit: true,
			focus: false
		},
		this.model = this.btIPmodel
	);
	Mojo.Event.listen(this.btIP, Mojo.Event.propertyChange, this.changeIPbt.bindAsEventListener(this));
	
	this.controller.setupWidget('ipForwarding',
		this.attributes = {
			trueLabel:  'Enabled',
			falseLabel: 'Disabled',
			trueValue: 1,
			falseValue: 0,
			fieldName:  'ipForwarding'
		},
		this.model = this.ipForwardingModel
	);
	this.controller.listen('ipForwarding',	Mojo.Event.propertyChange, this.ipForwardingToggleChangeHandler);
	
	this.controller.setupWidget('nat',
		this.attributes = {
			trueLabel:  'Enabled',
			falseLabel: 'Disabled',
			trueValue: 1,
			falseValue: 0,
			fieldName:  'nat'
		},
		this.model = this.natModel
	);
	this.controller.listen('nat',	Mojo.Event.propertyChange, this.natToggleChangeHandler);

}

MainAssistant.prototype.validateIPAddress = function(inputString) {
	
	var re = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

	if (re.test(inputString)) {
		var parts = inputString.split(".");
		if (parseInt(parseFloat(parts[0])) == 0)
			return false;
	   for (var i=0; i<parts.length; i++) {
			if (parseInt(parseFloat(parts[i])) > 255)
				return false;
		}
		return true;
	}
	
}

MainAssistant.prototype.changeIPusb = function(event) {
	
	if (this.validateIPAddress(event.value)) {
		freeTetherD.setIP('usb0', event.value, this.getIPHandler.bindAsEventListener(this), this.errorHandler.bindAsEventListener(this));
	} else {
		this.usbIPmodel.value = event.oldValue;
		this.controller.modelChanged(this.usbIPmodel);	
	}
	
}

MainAssistant.prototype.changeIPwifi = function(event) {
	
	if (this.validateIPAddress(event.value)) {
		freeTetherD.setIP('eth0', event.value, this.getIPHandler.bindAsEventListener(this), this.errorHandler.bindAsEventListener(this));
	} else {
		this.wifiIPmodel.value = event.oldValue;
		this.controller.modelChanged(this.wifiIPmodel);	
	}
	
}

MainAssistant.prototype.changeIPbt = function(event) {
	
	if (this.validateIPAddress(event.value)) {
		freeTetherD.setIP('bsl0', event.value, this.getIPHandler.bindAsEventListener(this), this.errorHandler.bindAsEventListener(this));
	} else {
		this.usbIPmodel.value = event.oldValue;
		this.controller.modelChanged(this.bslIPmodel);	
	}
	
}

MainAssistant.prototype.getIPs = function() {
	
	freeTetherD.getIP('ppp0', this.getIPHandler.bindAsEventListener(this), this.errorHandler.bindAsEventListener(this));
	freeTetherD.getIP('usb0', this.getIPHandler.bindAsEventListener(this), this.errorHandler.bindAsEventListener(this));
	freeTetherD.getIP('eth0', this.getIPHandler.bindAsEventListener(this), this.errorHandler.bindAsEventListener(this));
	freeTetherD.getIP('bsl0', this.getIPHandler.bindAsEventListener(this), this.errorHandler.bindAsEventListener(this));
	
}

MainAssistant.prototype.debugPayload = function(payload) {
	
	alert('------');
	for (p in payload) 
		alert(p + ': ' + payload[p]);
		
}

MainAssistant.prototype.cmHandler = function(payload) {
	
	connectionInfo = payload;
	
	this.getIPs();
			
}

MainAssistant.prototype.getIPHandler = function(payload) {
	
	this.debugPayload(payload);
	
	var model = {};

	if (payload.interface == "ppp0")
		model = this.wanIPmodel;
	else if (payload.interface == "usb0")
		model = this.usbIPmodel;
	else if (payload.interface == "eth0")
		model = this.wifiIPmodel;
	else if (payload.interface == "bsl0")  
		model = this.btIPmodel;

	model.value = payload.address;
	this.controller.modelChanged(model);
			
}

MainAssistant.prototype.getIPforwardHandler = function(payload) {

	this.ipForwardingModel.value = payload.state;
	this.controller.modelChanged(this.ipForwardingModel);
		
}

MainAssistant.prototype.ipForwardingToggleChangeHandler = function(event) {
	freeTetherD.toggleIPforward(false, false);	
}

MainAssistant.prototype.natToggleChangeHandler = function(event) {
	if (event.value==1)
		freeTetherD.natEnable(false, false);
	else if (event.value==0)
		freeTetherD.natDisable(false, false);
}

MainAssistant.prototype.errorHandler = function(payload) {
	this.debugPayload(payload);
}

MainAssistant.prototype.handleCommand = function(event) {
	
	if(event.type == Mojo.Event.command) {
		
		if (event.command == 'show-wan') {
			this.wanGroup.style.display = '';
			this.wifiGroup.style.display = 'none';
			this.usbGroup.style.display = 'none';
			this.btGroup.style.display = 'none';
		} else if (event.command == 'show-wifi') {
			this.wanGroup.style.display = 'none';
			this.wifiGroup.style.display = '';
			this.usbGroup.style.display = 'none';
			this.btGroup.style.display = 'none';			
		} else if (event.command == 'show-usb') {
			this.wanGroup.style.display = 'none';
			this.wifiGroup.style.display = 'none';
			this.usbGroup.style.display = '';
			this.btGroup.style.display = 'none';
		} else if (event.command == 'show-bt') {
			this.wanGroup.style.display = 'none';
			this.wifiGroup.style.display = 'none';
			this.usbGroup.style.display = 'none';
			this.btGroup.style.display = '';
		}
		
	}
	
}

MainAssistant.prototype.activate = function(event) {
	
}


MainAssistant.prototype.deactivate = function(event) {
	
}

MainAssistant.prototype.cleanup = function(event) {
	
}
