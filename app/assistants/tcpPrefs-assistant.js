function isValidIPAddress(ipaddr) {
   var re = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
   if (re.test(ipaddr)) {
      var parts = ipaddr.split(".");
      if (parseInt(parseFloat(parts[0])) == 0) { return false; }
      for (var i=0; i<parts.length; i++) {
         if (parseInt(parseFloat(parts[i])) > 255) { return false; }
      }
      return true;
   } else {
      return false;
   }
}

function TcpPrefsAssistant() {

  this.cookie = new preferenceCookie();
  this.prefs = this.cookie.get();
  
  this.validIPs = {
  	'ip-gateway': false,
  	'ip-subnet': false,
  	'ip-dhcp-start': false
  }
  
  
}

TcpPrefsAssistant.prototype.setup = function() {

  this.controller.setupWidget(
    'ip-gateway',
    {
      multiline: false,
      enterSubmits: false,
      modelProperty: 'gateway',
      textCase: Mojo.Widget.steModeLowerCase,
      focusMode: Mojo.Widget.focusSelectMode,
      disabledProperty: 'noEditIP'
    },
    this.prefs
  );
  
  this.controller.setupWidget(
    'ip-subnet',
    {
      multiline: false,
      enterSubmits: false,
      modelProperty: 'subnet',
      textCase: Mojo.Widget.steModeLowerCase,
      focusMode: Mojo.Widget.focusSelectMode,
      disabledProperty: 'noEditIP'
    },
    this.prefs
  );
  
  this.controller.setupWidget(
    'ip-dhcp-start',
    {
      multiline: false,
      enterSubmits: false,
      modelProperty: 'dhcpStart',
      textCase: Mojo.Widget.steModeLowerCase,
      focusMode: Mojo.Widget.focusSelectMode,
      disabledProperty: 'noEditIP'
    },
    this.prefs
  );
  
  this.controller.setupWidget(
    'dhcp-leases',
    {
      multiline: false,
      enterSubmits: false,
      modelProperty: 'dhcpLeases',
      textCase: Mojo.Widget.steModeLowerCase,
      focusMode: Mojo.Widget.focusSelectMode,
      disabledProperty: 'noEditIP'
    },
    this.prefs
  );

  this.controller.setupWidget(
    'lease-time',
    {
      multiline: false,
      enterSubmits: false,
      modelProperty: 'leaseTime',
      textCase: Mojo.Widget.steModeLowerCase,
      focusMode: Mojo.Widget.focusSelectMode,
      disabledProperty: 'noEditIP'
    },
    this.prefs
  );
  
  this.controller.listen(this.controller.get('ip-gateway'), Mojo.Event.propertyChange, this.ipChanged.bindAsEventListener(this));
  this.validIPs['ip-gateway'] = this.validateIP('ip-gateway', this.prefs.gateway)
  this.controller.listen(this.controller.get('ip-subnet'), Mojo.Event.propertyChange, this.ipChanged.bindAsEventListener(this));
  this.validIPs['ip-subnet'] = this.validateIP('ip-subnet', this.prefs.subnet)
  this.controller.listen(this.controller.get('ip-dhcp-start'), Mojo.Event.propertyChange, this.ipChanged.bindAsEventListener(this));
  this.validIPs['ip-dhcp-start'] = this.validateIP('ip-dhcp-start', this.prefs.dhcpStart)
  
  this.helpTap = this.helpRowTapped.bindAsEventListener(this);
  this.controller.listen(this.controller.get('help-toggle'), Mojo.Event.tap, this.helpButtonTapped.bindAsEventListener(this));
  
  var helps = this.controller.get('container').querySelectorAll('div.help-overlay');
  for (var h = 0; h < helps.length; h++) {
    this.controller.listen(helps[h], Mojo.Event.tap, this.helpTap);
  }
  
  this.controller.setInitialFocusedElement(null);

};

TcpPrefsAssistant.prototype.validateIP = function(elem, address) {
	if (isValidIPAddress(address)) {
		if (this.controller.get(elem).hasClassName('invalid-ip')) {
			this.controller.get(elem).removeClassName('invalid-ip');
		}
		return true
	} else {
		if (! this.controller.get(elem).hasClassName('invalid-ip')) {
			this.controller.get(elem).addClassName('invalid-ip');
		}
		return false
	}
}

TcpPrefsAssistant.prototype.ipChanged = function(event) {
	elem = 'ip-' + event.property
	this.validIPs[elem] = this.validateIP(elem, event.value)
};

TcpPrefsAssistant.prototype.activate = function(event) {
};

TcpPrefsAssistant.prototype.deactivate = function(event) {
  this.prefs.invalidTCP = false
  for (var i in this.validIPs) {
	if (this.validIPs[i] == false)
	  this.prefs.invalidTCP = true;
  }
  this.cookie.put(this.prefs);
  var tmp = prefs.get(true);
  FreeTetherService.setIP(prefs.get().gateway, prefs.get().subnet, prefs.get().dhcpStart, prefs.get().dhcpLeases, prefs.get().leaseTime);
};

TcpPrefsAssistant.prototype.helpButtonTapped = function(event)
{
	if (this.controller.get('container').hasClassName('help'))
	{
		this.controller.get('container').removeClassName('help');
		event.target.removeClassName('selected');
	}
	else
	{
		this.controller.get('container').addClassName('help');
		event.target.addClassName('selected');
	}
};

TcpPrefsAssistant.prototype.helpRowTapped = function(event)
{
	
	event.stop();
	event.stopPropagation();
	event.preventDefault();
	
	var lookup = event.target.id.replace(/help-/, '');
	var help = helpData.get(lookup);
	
	if (lookup && help)
	{
		this.controller.stageController.pushScene('help-data', help);
	}
};