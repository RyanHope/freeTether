function MainAssistant() {

  switch (Mojo.Environment.DeviceInfo.modelNameAscii) {
    case 'Veer':
    case 'Pre3':
      this.WIFI_IFNAME = "eth0";
      break;
    default:
      this.WIFI_IFNAME = "uap0";
      break;
  }

  this.DEFAULT_NETWORK = 'freeTether';
  this.DEFAULT_SECURITY = 'Open';
  this.BT_IFNAME = "bsl0";
  this.USB_IFNAME = "usb0:1";

  this.statusSubscription = null;
      
  this.ifToggle = {
    wifi: {value: false, disabled: false},
    bluetooth: {value: false, disabled: false},
    usb: {value: false, disabled: false}
  }
  
  this.ifSpinner = {
    wifi: {spinning: false},
    bluetooth: {spinning: false},
    usb: {spinning: false}
  }
	
  this.clientListModel = {items: [], "listTitle": $L("Connected Devices")};

}

MainAssistant.prototype.setup = function() {

	this.controller.document.body.className = 'palm-dark';
	
	this.dhcpIcon = this.controller.get('dhcp-icon');
	this.ipForwardIcon = this.controller.get('ip-forward-icon');

	this.toggles = this.controller.get('toggles');
	this.toggles.style.display = '';
	
	this.connections = this.controller.get('connections');
  this.connections.style.display = 'none';
	
	this.controller.listen('wifi-row', Mojo.Event.tap, this.ifaceRowTapped.bindAsEventListener(this, 'wifiPrefs'));
	this.controller.listen('bt-row', Mojo.Event.tap, this.ifaceRowTapped.bindAsEventListener(this, 'btPrefs'));
	this.controller.listen('usb-row', Mojo.Event.tap, this.ifaceRowTapped.bindAsEventListener(this, 'usbPrefs'));
	this.controller.listen('dhcp-row', Mojo.Event.tap, this.ifaceRowTapped.bindAsEventListener(this, 'tcpPrefs'));

  this.clientList = this.controller.get('clientList');
	  
	this.controller.setupWidget(
		'wifi',
		{
      trueLabel:  'On',
      falseLabel: 'Off',
      fieldName:  'value',
		},
		this.ifToggle.wifi
	);

	this.controller.setupWidget(
		'bluetooth',
		{
      trueLabel:  'On',
      falseLabel: 'Off',
      fieldName:  'value',
		},
		this.ifToggle.bluetooth
	);
	
	this.controller.setupWidget(
		'usb',
		{
      trueLabel:  'On',
      falseLabel: 'Off',
      fieldName:  'value',
		},
		this.ifToggle.usb
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
          label: "General Prefs",
          command: 'do-general'
        },
        {
          label: "WiFi Prefs",
          command: 'do-wifi'
        },
        {
          label: "Bluetooth Prefs",
          command: 'do-bt'
        },
        //{
          //label: "USB Prefs",
          //command: 'do-usb'
        //},
        {
          label: "TCP/IP Prefs",
          command: 'do-tcp'
        },
        {
          label: "Help",
          command: 'do-help'
        }
      ]
    }
  );

	this.controller.setupWidget(
		Mojo.Menu.viewMenu,
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
					{label:$L('Interfaces'), command:'toggles', width:160},
					{label:$L('Connections'), command:'connections', width:160}, 
				]},
				{},
			]
		}
	);
	
  this.controller.setupWidget(
   'clientList',
    {
      //swipeToDelete: true,
      itemTemplate: 'templates/device-item',
      listTemplate: 'templates/device-list',
    }, this.clientListModel);

	this.toggleChangeHandler = this.toggleChanged.bindAsEventListener(this);
	
	this.controller.listen('wifi', Mojo.Event.propertyChange, this.toggleChangeHandler);
	this.controller.listen('bluetooth', Mojo.Event.propertyChange, this.toggleChangeHandler);
	this.controller.listen('usb', Mojo.Event.propertyChange, this.toggleChangeHandler);
  this.controller.listen('clientList', Mojo.Event.listDelete, this.removeClient.bindAsEventListener(this));
  this.clientList.observe(Mojo.Event.listTap, this.clientInfo.bindAsEventListener(this));

	 
  this.serviceStatusSubscription = FreeTetherService.monitorServer("org.webosinternals.freetether", this.server.bind(this));
  this.sysInfoSubscription = FreeTetherService.getStatus({subscribe: true}, this.handleSysInfo.bind(this));
  this.clientListSubscription = FreeTetherService.getClientList({subscribe: true}, this.handleClientList.bind(this));
	this.ipForwardSubscription = FreeTetherService.getIPForward({subscribe: true}, this.handleIPForward.bind(this));
	
	this.controller.setupWidget('wifiSpinner', {}, this.ifSpinner.wifi);
	this.controller.setupWidget('btSpinner', {}, this.ifSpinner.bluetooth);
	this.controller.setupWidget('usbSpinner', {}, this.ifSpinner.usb);
	
	if (! prefs.get().invalidTCP) {
		FreeTetherService.setIP(prefs.get().gateway, prefs.get().subnet, prefs.get().dhcpStart, prefs.get().dhcpLeases, prefs.get().leaseTime);
		if (prefs.get().autoWiFi)
			this.addInterface('wifi');
		if (prefs.get().autoBT)
			this.addInterface('bluetooth');
		if (prefs.get().autoUSB)
			this.addInterface('usb');
	}
	
};

MainAssistant.prototype.removeClient = function(event) {
  Mojo.Log.error("REMOVE CLIENT " + event.item.name);
}

MainAssistant.prototype.clientInfo = function(event) {
  if (!event.item.empty)
    this.controller.stageController.pushScene('client', event.item);
}

MainAssistant.prototype.server = function(payload) {
        for (p in payload) {
          Mojo.Log.error(p + " : " + payload[p]);
        }
}

MainAssistant.prototype.addNewClients = function(clients) {
  var client = {};
  var found = false;

  for (var i=0; i<clients.length; i++) {
    found = false;
    client = clients[i];
    for (var j=0; j<this.clientListModel.items.length; j++) {
      if (client.mac === this.clientListModel.items[j].mac) {
        found = true;
        break;
      }
    }

    if (found) {
      Mojo.Log.error("update " + objectToString(client));
      if (!this.clientListModel.items[j].type != client.type)
        this.clientListModel.items[j].type = client.type || "usb";
      if (this.clientListModel.items[j].name != client.hostname)
        this.clientListModel.items[j].name = client.hostname || client.mac;
      if (this.clientListModel.items[j].mac != client.mac)
        this.clientListModel.items[j].mac = client.mac;
      if (this.clientListModel.items[j].ipv4 != client.ipv4)
        this.clientListModel.items[j].ipv4 = client.ipv4;
      if (this.clientListModel.items[j].leaseTime != client.leaseTime)
        this.clientListModel.items[j].leaseTime = client.leaseTime;
      if (this.clientListModel.items[j].leaseExpiry != client.leaseExpiry)
        this.clientListModel.items[j].leaseExpiry = client.leaseExpiry;
    }
    else {
      var newClient = {};
      newClient.type = client.type || "usb";
      newClient.name = client.hostname || client.mac;
      newClient.mac = client.mac;
      newClient.ipv4 = client.ipv4;
      newClient.leaseTime = client.leaseTime;
      newClient.leaseExpiry = client.leaseExpiry;
      if (this.clientListModel.items.length && this.clientListModel.items[0].empty)
        this.clientListModel.items.clear();
      this.clientListModel.items.push(newClient);
    }
  }
}

MainAssistant.prototype.removeOldClients = function(clients) {
  var client = {};
  var found = false;

  for (var i=0; i<this.clientListModel.items.length; i++) {
    found = false;
    client = this.clientListModel.items[i];
    for (var j=0; j<clients.length; j++) {
      if (client.mac === clients[j].mac) {
        found = true;
        break;
      }
    }

    if (!found) {
      this.clientListModel.items = this.clientListModel.items.without(client);
    }
  }
}

MainAssistant.prototype.handleClientList = function(payload) {
  if (payload && payload.clients && payload.clients.length > 0) {
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

MainAssistant.prototype.handleIPForward = function(payload) {

  if (!payload || typeof(payload.state) !== 'number')
    return;
  
  var ipforwardClass = '';
  switch (payload.state) {
    case 0:
      ipforwardClass = 'icon status-offline';
      break;
    case 1:
      ipforwardClass = 'icon status-available';
      break;
  }
  this.ipForwardIcon.className = ipforwardClass;

}

MainAssistant.prototype.handleSysInfo = function(payload) {

  if (!payload || !payload.sysInfo)
    return;
  
  if (!payload.returnValue) {
    this.sysInfoSubscription = FreeTetherService.getStatus({subscribe: true}, this.handleSysInfo.bind(this));
    return;
  }
  var dhcpClass = '';
  switch (payload.sysInfo.stateDHCPServer) {
    case 'STOPPED':
      dhcpClass = 'icon status-offline';
      break;
    case 'STARTED':
      dhcpClass = 'icon status-available';
      break;
    case 'START REQUESTED':
    case 'STOP REQUESTED':
      dhcpClass = 'icon status-busy';
      break;
    case 'ERROR':
      dhcpClass = 'icon status-error';
      break;
  }
  this.dhcpIcon.className = dhcpClass;
 
  var enabledCount = 0;
  var interfaces = ['wifi','bluetooth','usb'];
  var len = payload.sysInfo.interfaces.length;
  var ifaces = {};

  for (var i=0; i<len; i++) {
    ifType = payload.sysInfo.interfaces[i].type;
    if (!ifType)
      continue;
    ifaces[ifType] = {};
    ifaces[ifType]['ifState'] = payload.sysInfo.interfaces[i].stateInterface;
    ifaces[ifType]['brState'] = payload.sysInfo.interfaces[i].stateInterfaceBridged;
    ifaces[ifType]['lkState'] = payload.sysInfo.interfaces[i].stateLink;
  }

  interfaces.each(function(ifType){
    if (!ifaces[ifType]) {
      this.ifToggle[ifType].value = false;
      this.ifSpinner[ifType].spinning = false;
    }
    else {
      if (ifaces[ifType].ifState === 'CREATED' && ifaces[ifType].brState === 'BRIDGED' && ifaces[ifType].lkState === 'UP') {
        this.ifToggle[ifType].value = true;
        this.ifSpinner[ifType].spinning = false;
      }
      if (ifaces[ifType].ifState === 'CREATE REQUESTED') { 
      Mojo.Log.error("CREATE REQUEST");
        this.ifToggle[ifType].value = true;
        this.ifSpinner[ifType].spinning = true;
      }
      if (ifaces[ifType].ifState === 'DESTROY REQUESTED') {
      Mojo.Log.error("DESTROY REQUEST");
        this.ifToggle[ifType].value = false;
        this.ifSpinner[ifType].spinning = true;
      }
    }
    this.controller.modelChanged(this.ifSpinner[ifType], this);
    this.controller.modelChanged(this.ifToggle[ifType], this);
  }, this);
  
  cookieTMP = new preferenceCookie();
  prefsTMP = cookieTMP.get();
  
  if (this.ifToggle['wifi'].value || this.ifToggle['bluetooth'].value || this.ifToggle['usb'].value)
    prefsTMP.noEditIP = true;
  else
    prefsTMP.noEditIP = false;
    
  if (this.ifToggle['wifi'].value)
    prefsTMP.noEditWiFi = true;
  else
    prefsTMP.noEditWiFi = false;
    
  if (this.ifToggle['bluetooth'].value)
    prefsTMP.noEditBT = true;
  else
    prefsTMP.noEditBT = false;
    
  if (this.ifToggle['usb'].value)
    prefsTMP.noEditUSB = true;
  else
    prefsTMP.noEditUSB = false;
    
  cookieTMP.put(prefsTMP);
  var tmp = prefs.get(true);

}

MainAssistant.prototype.handleCommand = function(event) {
	
	if(event.type == Mojo.Event.command) {
		
		switch (event.command)
		{
			case 'toggles':
				this.toggles.style.display = '';
				this.connections.style.display = 'none';
				this.controller.sceneScroller.mojo.revealTop()
				break;
				
     case 'connections':
        this.toggles.style.display = 'none';
        this.connections.style.display = '';
        this.controller.sceneScroller.mojo.revealTop()
        break;
				
      case 'do-help':
        this.controller.stageController.pushScene('help');
        break;
        
	  case 'do-general':
        this.controller.stageController.pushScene('generalPrefs');
        break;
		
      case 'do-wifi':
        this.controller.stageController.pushScene('wifiPrefs');
        break;

      case 'do-bt':
        this.controller.stageController.pushScene('btPrefs');
        break;

      //case 'do-usb':
        //this.controller.stageController.pushScene('usbPrefs');
        //break;
      
      case 'do-tcp':
        this.controller.stageController.pushScene('tcpPrefs');
        break;
        
		}
			
	}
	
}

MainAssistant.prototype.addInterface = function(type) {
  var payload = {};
  payload[type] = {};

  switch(type) {
    case 'wifi':
      payload[type].SSID = prefs.get().network || this.DEFAULT_NETWORK;
      payload[type].Security = prefs.get().security || this.DEFAULT_SECURITY;
      
      // THIS NEEDS TO BE FIXED
      if (payload[type].Security !== 'Open') 
        payload[type].Passphrase = prefs.get().passphrase || "";

      //payload[type].interfaceIdleTimeout = true;
      break;
    case 'bluetooth':
      payload[type].ifname = this.BT_IFNAME;
      break;
    case 'usb':
      payload[type].ifname = this.USB_IFNAME;
      break;
  }
  
  FreeTetherService.addInterface(payload);
}

MainAssistant.prototype.removeInterface = function(type) {
  var payload = {};
  payload[type] = {};

  switch(type) {
    case 'wifi':
      payload[type].ifname = this.WIFI_IFNAME;
      break;
    case 'bluetooth':
      payload[type].ifname = this.BT_IFNAME;
      break;
    case 'usb':
      payload[type].ifname = this.USB_IFNAME;
      break;
  }

  FreeTetherService.removeInterface(payload);
}

MainAssistant.prototype.toggleChanged = function(event) {

  if (event.value)
    this.addInterface(event.target.id);
  else
    this.removeInterface(event.target.id);

}

MainAssistant.prototype.ifaceRowTapped = function(event, item) {

  this.controller.stageController.pushScene(item);
  
}

MainAssistant.prototype.activate = function(event) {
	d = prefs.get().invalidTCP;
	for (var i in this.ifToggle)
		this.ifToggle[i]['disabled'] = d;
	if (d) {
		if (! this.controller.get('dhcp-server-txt').hasClassName('invalid')) {
			this.controller.get('dhcp-server-txt').addClassName('invalid');
		}
	} else {
		if (this.controller.get('dhcp-server-txt').hasClassName('invalid')) {
			this.controller.get('dhcp-server-txt').removeClassName('invalid');
		}
	}
};

MainAssistant.prototype.deactivate = function(event) {
  var tmp = prefs.get(true);
};

MainAssistant.prototype.cleanup = function(event) {
	Mojo.Log.error('MainAssistant#cleaup')
	this.removeInterface('wifi')
	this.removeInterface('usb')
	this.removeInterface('bluetooth')
	FreeTetherService.stop();
};
