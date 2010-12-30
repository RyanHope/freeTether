function MainAssistant() {

	this.cookie = new preferenceCookie();
  this.service = new FreeTetherService();
	this.prefs = this.cookie.get();
  this.statusSubscription = null;
  
  this.securityModel =
  {
    value: this.prefs.security,
    choices: []
  };
  
  this.usbChoices = [
    {label:$L('UMS'),                     value:1},
    {label:$L('UMS + NOVACOM'),           value:2},
    {label:$L('PASSTHRU'),                value:3},
    {label:$L('USBNET + PASSTHRU'),       value:4},
    {label:$L('USBNET + UMS + NOVACOM'),  value:5},
  ];
  if (Mojo.Environment.DeviceInfo.platformVersionMajor == 2)
    this.usbChoices.push({label:$L('PASSTHRU + NOVACOM'),value:6})
  
  this.usbModel = {value: 0};  
  this.panModel = {value: false};
  this.wifiToggle = {value: false};
  this.btToggle = {value: false};
  this.usbToggle = {value: false};
	
}

MainAssistant.prototype.setup = function() {

	this.controller.document.body.className = 'palm-dark';

	this.toggles = this.controller.get('toggles');
	this.toggles.style.display = '';
	
	this.connections = this.controller.get('connections');
  this.connections.style.display = 'none';
  
	this.options = this.controller.get('options');
	this.options.style.display = 'none';
	
	this.network              = this.controller.get('network');
	this.passphrase           = this.controller.get('passphrase');
	this.security             = this.controller.get('security');
	
	this.securityRow         = this.controller.get('security-row');
	this.passphraseRow       = this.controller.get('passphrase-row');
	
	this.usbGadget           = this.controller.get('usbGadget');
  this.panProfile          = this.controller.get('panProfile');
	
	this.securityChangedHandler  = this.securityChanged.bindAsEventListener(this);
	this.usbChangedHandler       = this.usbChanged.bindAsEventListener(this);
	this.textChanged             = this.textChanged.bindAsEventListener(this);
	
  this.controller.setupWidget(
    'network',
    {
      multiline: false,
      enterSubmits: false,
      hintText: 'Required',
      modelProperty: 'network',
      textCase: Mojo.Widget.steModeLowerCase,
      focusMode: Mojo.Widget.focusSelectMode
    },
    this.prefs
  );
  Mojo.Event.listen(this.network,      Mojo.Event.propertyChange,  this.textChanged);
  
  this.controller.setupWidget(
    'security',
    {
      label: 'Security',
      choices:
        [
          {label:'Open', value:'open'},
          {label:'WPA/WPA2 Personal', value:'wpa'},
        ],
        modelProperty: 'security'
      },
      this.prefs
    );
    this.controller.listen('security', Mojo.Event.propertyChange, this.securityChangedHandler);
  
  this.controller.setupWidget(
    'passphrase',
    {
      multiline: false,
      enterSubmits: false,
      modelProperty: 'passphrase',
      textCase: Mojo.Widget.steModeLowerCase,
      focusMode: Mojo.Widget.focusSelectMode
    },
    this.prefs
  );
  Mojo.Event.listen(this.passphrase,      Mojo.Event.propertyChange,  this.textChanged);
  
  this.controller.setupWidget(
    'usbGadget',
    {
      label: '',
      choices: this.usbChoices,
      modelProperty: 'value',
      },
      this.usbModel
    );
    this.controller.listen('usbGadget', Mojo.Event.propertyChange, this.usbChangedHandler);
    
  this.controller.setupWidget(
    'panProfile',
    {
       trueLabel:  'Enabled',
       falseLabel: 'Disabled',
       modelProperty:  'value'
    },
    this.panModel
  );
	
	this.controller.setupWidget(
		'tetherWiFi',
		{
  			trueLabel:  'On',
 			falseLabel: 'Off',
  			fieldName:  'value'
		},
		this.wifiToggle
	);

	this.controller.setupWidget(
		'tetherBT',
		{
  			trueLabel:  'On',
 			falseLabel: 'Off',
  			fieldName:  'value'
		},
		this.btToggle
	);
	
	this.controller.setupWidget(
		'tetherUSB',
		{
  			trueLabel:  'On',
 			falseLabel: 'Off',
  			fieldName:  'value'
		},
		this.usbToggle
	);
	
	this.controller.setupWidget(
    Mojo.Menu.appMenu,
    {
      omitDefaultItems: true
    },
    {
      visible: true,
      items: [
        {
          label: "Help",
          command: 'do-help'
        }
      ]
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
				toggleCmd:'toggles',
				items:[
					{label:$L('Toggles'), icon:'icon-switch', command:'toggles'},
					{label:$L('Connections'), icon:'icon-connections', command:'connections'}, 
					{label:$L('Options'), icon:'icon-prefs', command:'options'}
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
  this.sysInfoSubscription = this.service.getStatus({subscribe: true}, this.updateOptions.bind(this));
  this.getUSBSubscription = this.service.getUSB({subscribe: true}, this.updateUSB.bind(this));
  this.btProfileSubscription = this.service.getPrefs({keys:['btprofiledisable'], subscribe: true}, this.updateBTProfile.bind(this));
};

MainAssistant.prototype.usbChanged = function(event) {
  this.service.setUSB({'state':event.value});
}

MainAssistant.prototype.securityChanged = function(event) {
  this.cookie.put(this.prefs);
  if (this.prefs.security == 'open') {
    this.passphraseRow.style.display = 'none';
    this.securityRow.className = 'palm-row last';
  } else {
    this.passphraseRow.style.display = '';
    this.securityRow.className = 'palm-row';
  }
}

MainAssistant.prototype.textChanged = function(event) {
  this.cookie.put(this.prefs);
}

MainAssistant.prototype.server = function(payload) {
        for (p in payload) {
          Mojo.Log.error(p + " : " + payload[p]);
        }
}

MainAssistant.prototype.updateBTProfile = function(payload) {
  this.panModel.pan = true;
  if (payload.returnValue) {
    Mojo.Log.error(payload.btprofiledisable)
    if (payload.btprofiledisable instanceof Array) {
      for(var i = 0; i < payload.btprofiledisable.length; i++) {
        if (payload.btprofiledisable[i] == 'PAN')
          this.panModel.pan = false;       
      }
    } else {
      if (payload.btprofiledisable == 'PAN')
        this.panModel.pan = false;
    }
    this.controller.modelChanged(this.panModel, this);
  }
}

MainAssistant.prototype.updateUSB = function(payload) {
  if (payload.returnValue) {
    this.usbModel.value = payload.state;
    this.controller.modelChanged(this.usbModel, this);
  }
}

MainAssistant.prototype.updateOptions = function(payload) {
  Mojo.Log.error("update options callback!");
  if (!payload.returnValue) {
    this.connections.innerHTML = "ERROR<br>" + payload.errorText;
    return;
  }

  this.connections.innerHTML = 
    "bridge: " + payload.sysInfo.ifbridge + "<br>" + 
    "ip: " + payload.sysInfo.IPv4Address + "<br>" + 
    "ip state: " + payload.sysInfo.stateIPv4 + "<br>" + 
    "dhcp state: " + payload.sysInfo.stateDHCPServer + "<br>" + 
    "interfaces: " + "<br>"; 

  Mojo.Log.error("hey interfaces " + payload.sysInfo.interfaces[0]);
  var i = 0;
  while (payload.sysInfo.interfaces[i]) {
    var p = payload.sysInfo.interfaces[i++];
    this.connections.innerHTML = this.connections.innerHTML + 
      "-- Interface " + i + " --<br>" + 
      "&nbsp&nbspifname: " + p.ifname + "<br>" + 
      "&nbsp&nbspiface state: " + p.stateInterface + "<br>" + 
      "&nbsp&nbspiface bridge state: " + p.stateInterfaceBridge + "<br>" + 
      "&nbsp&nbsplink state: " + p.stateLink + "<br>" + 
      "&nbsp&nbsptype: " + p.type + "<br>" + 
      "&nbsp&nbspssid: " + p.SSID + "<br>" + 
      "&nbsp&nbspsecurity: " + p.Security + "<br>";
  }
}

MainAssistant.prototype.handleCommand = function(event) {
	
	if(event.type == Mojo.Event.command) {
		
		switch (event.command)
		{
			case 'toggles':
				this.toggles.style.display = '';
				this.connections.style.display = 'none';
				this.options.style.display = 'none';
				this.controller.sceneScroller.mojo.revealTop()
				break;
				
     case 'connections':
        this.toggles.style.display = 'none';
        this.connections.style.display = '';
        this.options.style.display = 'none';
        this.controller.sceneScroller.mojo.revealTop()
        break;
				
			case 'options':
				this.toggles.style.display = 'none';
				this.connections.style.display = 'none';
				this.options.style.display = '';
				this.controller.sceneScroller.mojo.revealTop()
				break;
				
      case 'do-help':
        this.controller.stageController.pushScene('help');
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
        this.service.addInterface({bluetooth:{}});
      }
      else {
        this.service.removeInterface({bluetooth: {ifname: "bsl0"}});
      }
      break;
    case 'tetherUSB':
      if (event.value) {
        this.service.addInterface({usb: {ifname: "usb0:1"}});
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
