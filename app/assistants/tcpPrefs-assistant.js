function TcpPrefsAssistant() {

  this.cookie = new preferenceCookie();
  this.prefs = this.cookie.get();

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
  
  this.helpTap = this.helpRowTapped.bindAsEventListener(this);
  this.controller.listen(this.controller.get('help-toggle'), Mojo.Event.tap, this.helpButtonTapped.bindAsEventListener(this));
  
  var helps = this.controller.get('container').querySelectorAll('div.help-overlay');
  for (var h = 0; h < helps.length; h++) {
    this.controller.listen(helps[h], Mojo.Event.tap, this.helpTap);
  }

};

TcpPrefsAssistant.prototype.activate = function(event) {
};

TcpPrefsAssistant.prototype.deactivate = function(event) {
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