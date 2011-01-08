function BtPrefsAssistant() {

  this.cookie = new preferenceCookie();
  this.prefs = this.cookie.get();

  this.panModel = {
    value: false,
    disabled: this.prefs.noEditBT
  };

}

BtPrefsAssistant.prototype.setup = function() {

  this.panChangeHandler = this.panChanged.bindAsEventListener(this);

  this.controller.setupWidget(
    'panProfile',
    {
       trueLabel:  'Enabled',
       falseLabel: 'Disabled',
       modelProperty:  'value'
    },
    this.panModel
  );
  this.controller.listen('panProfile', Mojo.Event.propertyChange, this.panChangeHandler);
  
  this.btProfileSubscription = FreeTetherService.getPrefs({keys:['btprofiledisable'], subscribe: true}, this.updateBTProfile.bind(this));

};

BtPrefsAssistant.prototype.updateBTProfile = function(payload) {
  this.panModel.value = true;
  for(var i = 0; i < payload.btprofiledisable.length; i++) {
    if (payload.btprofiledisable[i] == 'PAN')
      this.panModel.value = false;       
  }
  this.controller.modelChanged(this.panModel, this);
}

BtPrefsAssistant.prototype.togglePanState = function(payload) {
 
  var len = payload.btprofiledisable.length;
  if (len == 1) {
    if (payload.btprofiledisable[0] == "")
      payload.btprofiledisable[0] = "PAN";
    else if (payload.btprofiledisable[0] == "PAN")
      payload.btprofiledisable[0] = "";
    FreeTetherService.setPrefs({btprofiledisable:payload.btprofiledisable});
    FreeTetherService.restartBluetooth();
  }

}

BtPrefsAssistant.prototype.panChanged = function(event) {

  FreeTetherService.getPrefs({keys:['btprofiledisable']}, this.togglePanState.bind(this));
  
}

BtPrefsAssistant.prototype.activate = function(event) {
};

BtPrefsAssistant.prototype.deactivate = function(event) {
};

BtPrefsAssistant.prototype.cleanup = function(event) {
};
