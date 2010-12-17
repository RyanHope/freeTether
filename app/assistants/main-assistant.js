function MainAssistant() {

	this.cookie = new preferenceCookie();
  this.service = new FreeTetherService();
	this.prefs = this.cookie.get();
  this.statusSubscription = null;
	
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
	 
  this.service.monitorServer("org.webosinternals.freetether", this.server.bind(this));
  this.sysInfoSubscription = this.service.sysInfo({subscribe: true}, this.updateOptions.bind(this));
};

MainAssistant.prototype.server = function(payload) {
        for (p in payload) {
          Mojo.Log.error(p + " : " + payload[p]);
        }
}

MainAssistant.prototype.updateOptions = function(payload) {
  if (!payload.returnValue) {
    this.wifiOptions.innerHTML = "ERROR<br>" + payload.errorText;
  }

  this.wifiOptions.innerHTML = 
    "bridge: " + payload.ifbridge + "<br>" + 
    "ip: " + payload.IPv4Address + "<br>" + 
    "ip state: " + payload.stateIPv4 + "<br>" + 
    "dhcp state: " + payload.stateDHCPServer + "<br>" + 
    "interfaces: " + "<br>"; 

  for (p in payload.interfaces) {
    this.wifiOptions.innerHTML = this.wifiOptions.innerHTML + 
      "  ifname: " + p.ifname + "<br>" + 
      "  iface state: " + p.stateInterface + "<br>" + 
      "  iface bridge state: " p.stateInterfaceBridge + "<br>" + 
      "  link state: " + p.stateLink + "<br>" + 
      "  type: " + p.type + "<br>" + 
      "  ssid: " + p.SSID + "<br>" + 
      "  security: " + p.Security + "<br>";
  }
}

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
  var f = function(payload) {
    for (p in payload) {
      Mojo.Log.error(p + " : " + payload[p]);
      if (typeof(p) === Object) {
        for (s in payload[p]) {
          Mojo.Log.error(s + " : " + payload[p][s]);
        }
      }
    }
  };

	this.prefs[event.target.id] = event.value;
	this.cookie.put(this.prefs);
  switch(event.target.id) {
    case 'tetherWiFi':
      //if (!this.statusSubscription)
        //this.statusSubscription = this.service.getStatus({"subscribe":true},f);
      if (event.value) {
        this.service.addInterface({
          wifi: {
            SSID: "WebOS Testing",
            Security: "Open",
            interfaceIdleTimeout: true
          }
        }, f);
      }
      else {
        this.service.removeInterface({
          wifi: {
            SSID:"WebOS Testing",
          }
        }, f);
      }
      break;
    case 'tetherBT':
      if (event.value) {
        this.service.addInterface({bluetooth});
      }
      else {
        this.service.removeInterface({bluetooth: {ifname: "bsl0"}});
      }
      break;
    case 'tetherUSB':
      if (event.value) {
        this.service.addInterface({usb: {ifname: "usb0:1"});
      }
      else {
        this.service.removeInterface({usb: {ifname: "usb0:1"}});
      }
      break;
  }
}

MainAssistant.prototype.activate = function(event) {

};

MainAssistant.prototype.deactivate = function(event) {

};

MainAssistant.prototype.cleanup = function(event) {

};
