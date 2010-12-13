function MainAssistant() {

	this.cookie = new preferenceCookie();
	this.prefs = this.cookie.get();
	
}

MainAssistant.prototype.setup = function() {

	this.controller.document.body.className = 'palm-dark';

	this.mainOptions					= this.controller.get('mainOptions');
	this.mainOptions.style.display		= '';
	this.wifiOptions					= this.controller.get('wifiOptions');
	this.wifiOptions.style.display		= 'none';
	this.btOptions						= this.controller.get('btOptions');
	this.btOptions.style.display		= 'none';
	this.usbOptions						= this.controller.get('usbOptions');
	this.usbOptions.style.display		= 'none';
	
	this.controller.setupWidget(
		'tetherWiFi',
		{
  			trueLabel:  'On',
 			falseLabel: 'Off',
  			fieldName:  'tetherWiFi'
		},
		{
			value : this.prefs.tetherWiFi,
 			disabled: false
		}
	);

	this.controller.setupWidget(
		'tetherBT',
		{
  			trueLabel:  'On',
 			falseLabel: 'Off',
  			fieldName:  'tetherBT'
		},
		{
			value : this.prefs.tetherBT,
 			disabled: false
		}
	);
	
	this.controller.setupWidget(
		'tetherUSB',
		{
  			trueLabel:  'On',
 			falseLabel: 'Off',
  			fieldName:  'tetherUSB'
		},
		{
			value : this.prefs.tetherUSB,
 			disabled: false
		}
	);

	this.controller.setupWidget(
		Mojo.Menu.commandMenu,
		{
			menuClass: 'no-fade'
		},
		{
			visible:true,
			items: [
				{},
				{label:$L('Views'), 
				toggleCmd:'mainOptions',
				items:[
					{label:$L('Main'), icon:'icon-switch', command:'mainOptions'}, 
					{label:$L('WiFi'), icon:'icon-wifi', command:'wifiOptions'},
					{label:$L('BT'),  icon:'icon-bt', command:'btOptions'},
					{label:$L('USB'), icon:'icon-usb', command:'usbOptions'}
				]},
				{},
			]
		}
	);
	
	this.toggleChangeHandler = this.toggleChanged.bindAsEventListener(this);
	
	this.controller.listen('tetherWiFi', Mojo.Event.propertyChange, this.toggleChangeHandler);
	this.controller.listen('tetherBT', Mojo.Event.propertyChange, this.toggleChangeHandler);
	this.controller.listen('tetherUSB', Mojo.Event.propertyChange, this.toggleChangeHandler);
	 
};

MainAssistant.prototype.handleCommand = function(event) {
	
	if(event.type == Mojo.Event.command) {
		
		switch (event.command)
		{
			case 'mainOptions':
				this.mainOptions.style.display = '';
				this.wifiOptions.style.display = 'none';
				this.btOptions.style.display = 'none';
				this.usbOptions.style.display = 'none';
				break;
				
			case 'wifiOptions':
				this.mainOptions.style.display = 'none';
				this.wifiOptions.style.display = '';
				this.btOptions.style.display = 'none';
				this.usbOptions.style.display = 'none';
				break;
			
			case 'btOptions':
				this.mainOptions.style.display = 'none';
				this.wifiOptions.style.display = 'none';
				this.btOptions.style.display = '';
				this.usbOptions.style.display = 'none';
				break;
				
			case 'usbOptions':
				this.mainOptions.style.display = 'none';
				this.wifiOptions.style.display = 'none';
				this.btOptions.style.display = 'none';
				this.usbOptions.style.display = '';
				break;
		}
			
	}
	
}

MainAssistant.prototype.toggleChanged = function(event) {
	this.prefs[event.target.id] = event.value;
	this.cookie.put(this.prefs);
}

MainAssistant.prototype.activate = function(event) {

};

MainAssistant.prototype.deactivate = function(event) {

};

MainAssistant.prototype.cleanup = function(event) {

};
