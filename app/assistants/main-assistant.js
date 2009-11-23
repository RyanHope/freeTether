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
	
	this.ipForwardingModel = {
		value: false,
		disabled: false
	};
	
	this.natModel = {
		value: true,
		disabled: false
	};
	
	freeTetherD.natEnable(false, false);
	
}

MainAssistant.prototype.setup = function() {
	
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
			enterSubmits: false,
			focus: false
		},
		this.model = this.wanIPmodel
	);
	
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

MainAssistant.prototype.debugPayload = function(payload) {
	
	alert('------');
	for (p in payload) 
		alert(p + ': ' + payload[p]);
		
}

MainAssistant.prototype.cmHandler = function(payload) {
	
	connectionInfo = payload;
	
	this.wanIPmodel.value = payload.wan.ipAddress;
	this.controller.modelChanged(this.wanIPmodel);
			
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
	else
		freeTetherD.natDisable(false, false);
}

MainAssistant.prototype.errorHandler = function(payload) {
	this.debugPayload(payload);
}

MainAssistant.prototype.handleCommand = function(event) {
	
	if(event.type == Mojo.Event.command) {
		
		switch (event.command)
		{
		}
	}
	
}

MainAssistant.prototype.activate = function(event) {
	
}


MainAssistant.prototype.deactivate = function(event) {
	
}

MainAssistant.prototype.cleanup = function(event) {
	
}
