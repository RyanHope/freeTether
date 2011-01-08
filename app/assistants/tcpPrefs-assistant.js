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

};

TcpPrefsAssistant.prototype.activate = function(event) {
};

TcpPrefsAssistant.prototype.deactivate = function(event) {
  var tmp = prefs.get(true);
};

TcpPrefsAssistant.prototype.cleanup = function(event) {
};
