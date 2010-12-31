function MainAssistant() {

  this.DEFAULT_NETWORK = 'freeTether';
  this.DEFAULT_SECURITY = 'Open';
  this.BT_IFNAME = "bsl0";
  this.USB_IFNAME = "usb0:1";

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
  this.clientListModel = {items: [], "listTitle": $L("Connected Devices")};

  this.activeInterfaces = [];

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

  this.clientList          = this.controller.get('clientList');
	
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
          {label:'Open', value:'Open'},
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
		'wifi',
		{
  			trueLabel:  'On',
 			falseLabel: 'Off',
  			fieldName:  'value'
		},
		this.wifiToggle
	);

	this.controller.setupWidget(
		'bluetooth',
		{
  			trueLabel:  'On',
 			falseLabel: 'Off',
  			fieldName:  'value'
		},
		this.btToggle
	);
	
	this.controller.setupWidget(
		'usb',
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
	
  this.controller.setupWidget(
   'clientList',
    {
      itemTemplate: 'templates/device-item',
      listTemplate: 'templates/device-list',
    }, this.clientListModel);

	this.toggleChangeHandler = this.toggleChanged.bindAsEventListener(this);
	
	this.controller.listen('wifi', Mojo.Event.propertyChange, this.toggleChangeHandler);
	this.controller.listen('bluetooth', Mojo.Event.propertyChange, this.toggleChangeHandler);
	this.controller.listen('usb', Mojo.Event.propertyChange, this.toggleChangeHandler);
	 
  this.service.monitorServer("org.webosinternals.freetether", this.server.bind(this));
  this.sysInfoSubscription = this.service.getStatus({subscribe: true}, this.handleSysInfo.bind(this));
  this.clientListSubscription = this.service.getClientList({subscribe: true}, this.handleClientList.bind(this));
  this.getUSBSubscription = this.service.getUSB({subscribe: true}, this.updateUSB.bind(this));
  this.btProfileSubscription = this.service.getPrefs({keys:['btprofiledisable'], subscribe: true}, this.updateBTProfile.bind(this));
};

MainAssistant.prototype.usbChanged = function(event) {
  this.service.setUSB({'state':event.value});
}

MainAssistant.prototype.securityChanged = function(event) {
  this.cookie.put(this.prefs);
  if (this.prefs.security == 'Open') {
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

MainAssistant.prototype.addNewClients = function(clients) {
  var client = {};
  var newClient = {};
  var found = false;

  for (var i=0; i<clients.length; i++) {
    found = false;
    client = clients[i];
    for (var j=0; j<this.clientListModel.items.length; j++) {
      Mojo.Log.error("check match " + client.mac + " vs. " + this.clientListModel.items[j].mac + " - j " + j);
      if (client.mac === this.clientListModel.items[j].mac && client.ipv4) {
        found = true;
        break;
      }
    }

    if (!found) {
      newClient.type = client.type;
      newClient.name = client.hostname || client.mac;
      newClient.mac = client.mac;
      newClient.ip = client.ipv4;
      Mojo.Log.error("add new client " + newClient.name);
      if (this.clientListModel.items[0].empty)
        this.clientListModel.items.clear();
      this.clientListModel.items.push(newClient);
    }
  }
}

MainAssistant.prototype.removeOldClients = function(clients) {
  var client = {};
  var found = false;

  for (var i=0; i<this.clientListModel.items; i++) {
    client = this.clientListModel.items[i];
    for (var j=0; j<clients; j++) {
      if (client.mac === clients[j].mac) {
        found = true;
        break;
      }
    }

    if (!found)
      this.clientListModel.items = this.clientListMode.items.without(client);
  }
}

MainAssistant.prototype.handleClientList = function(payload) {
  if (payload && payload.clients) {
    this.addNewClients(payload.clients);
    this.removeOldClients(payload.clients);
  }
  else {
    this.clientListModel.items.clear();
  }

  if (!this.clientListModel.items.length)
    this.clientListModel.items.push({"empty": true});

  this.controller.modelChanged(this.clientListModel, this);
}

MainAssistant.prototype.handleSysInfo = function(payload) {
  /*
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

  var i = 0;
  while (payload.sysInfo.interfaces[i]) {
    var p = payload.sysInfo.interfaces[i++];
    this.connections.innerHTML = this.connections.innerHTML + 
      "-- Interface " + i + " --<br>" + 
      "&nbspifname: " + p.ifname + "<br>" + 
      "&nbspiface state: " + p.stateInterface + "<br>" + 
      "&nbspiface bridge state: " + p.stateInterfaceBridge + "<br>" + 
      "&nbsplink state: " + p.stateLink + "<br>" + 
      "&nbsptype: " + p.type + "<br>" + 
      "&nbspssid: " + p.SSID + "<br>" + 
      "&nbspsecurity: " + p.Security + "<br>";

  }

  */

  if (!payload || !payload.sysInfo)
    return;

  var i = 0;
  this.activeInterfaces = [];
   while (payload.sysInfo.interfaces[i]) {
     this.activeInterfaces.push(Object.clone(payload.sysInfo.interfaces[i++]));
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

MainAssistant.prototype.addInterface = function(type) {
  var payload = {};
  payload[type] = {};

  switch(type) {
    case 'wifi':
      payload[type].SSID = this.prefs.network || this.DEFAULT_NETWORK;
      payload[type].Security = this.prefs.security || this.DEFAULT_SECURITY;
      
      if (payload[type].Security !== 'Open')
        payload[type].Passphrase = this.prefs.passphrase || "";

      //payload[type].interfaceIdleTimeout = true;
      break;
    case 'bluetooth':
      payload[type].ifname = this.BT_IFNAME;
      break;
    case 'usb':
      payload[type].ifname = this.USB_IFNAME;
      break;
  }

  this.service.addInterface(payload);
}

MainAssistant.prototype.removeInterface = function(type) {
  var iface = {};
  for (var i=0; i<this.activeInterfaces.length; i++) {
    iface = this.activeInterfaces[i];
    if (iface.type.toLowerCase() === type) {
      var payload = {};
      payload[type] = {};

      if (iface.SSID)
        payload[type].SSID = iface.SSID;
      if (iface.ifname)
        payload[type].ifname = iface.ifname;

      this.service.removeInterface(payload);
    }
  }
}

MainAssistant.prototype.toggleChanged = function(event) {
	this.prefs[event.target.id] = event.value;
	this.cookie.put(this.prefs);

  if (event.value) 
    this.addInterface(event.target.id);
  else
    this.removeInterface(event.target.id);

}

MainAssistant.prototype.activate = function(event) {

};

MainAssistant.prototype.deactivate = function(event) {

};

MainAssistant.prototype.cleanup = function(event) {

};
