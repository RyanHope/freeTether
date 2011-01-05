function WifiPrefsAssistant() {

  this.cookie = new preferenceCookie();
  this.prefs = this.cookie.get();
  
  this.securityModel =
  {
    value: this.prefs.security,
    choices: []
  };
  
}

WifiPrefsAssistant.prototype.setup = function() {

  this.controller.document.body.className = 'palm-dark';
  
  this.network                  = this.controller.get('network');
  this.passphrase               = this.controller.get('passphrase');
  this.security                 = this.controller.get('security');
  
  this.securityRow              = this.controller.get('security-row');
  this.passphraseRow            = this.controller.get('passphrase-row');

  this.securityChangedHandler   = this.securityChanged.bindAsEventListener(this);
  this.textChanged              = this.textChanged.bindAsEventListener(this);
  
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
  Mojo.Event.listen(this.network, Mojo.Event.propertyChange, this.textChanged);
  
  this.controller.setupWidget(
    'security',
    {
      label: 'Security',
      choices: [
          {label:'Open', value:'Open'},
          {label:'WPA2 Personal', value:'WPA2Personal'},
      ],
      modelProperty: 'security'
    },
    this.prefs
  );
  Mojo.Event.listen(this.security, Mojo.Event.propertyChange, this.securityChangedHandler);
  
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
  Mojo.Event.listen(this.passphrase, Mojo.Event.propertyChange, this.textChanged);
  
  this.updateSecurityWidgets();

};

WifiPrefsAssistant.prototype.updateSecurityWidgets = function() {
  if (this.prefs.security == 'Open') {
    this.passphraseRow.style.display = 'none';
    this.securityRow.className = 'palm-row last';
  } else {
    this.passphraseRow.style.display = '';
    this.securityRow.className = 'palm-row';
  }
}

WifiPrefsAssistant.prototype.securityChanged = function(event) {
  this.cookie.put(this.prefs);
  this.updateSecurityWidgets();
}

WifiPrefsAssistant.prototype.textChanged = function(event) {
  this.cookie.put(this.prefs);
}

WifiPrefsAssistant.prototype.activate = function(event) {
};

WifiPrefsAssistant.prototype.deactivate = function(event) {
};

WifiPrefsAssistant.prototype.cleanup = function(event) {
};
