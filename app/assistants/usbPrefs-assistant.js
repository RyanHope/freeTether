function UsbPrefsAssistant() {

  this.cookie = new preferenceCookie();
  this.prefs = this.cookie.get();
  
  this.usbChoices = [
    {label:$L('UMS'),                     value:1},
    {label:$L('UMS + NOVACOM'),           value:2},
    {label:$L('PASSTHRU'),                value:3},
    {label:$L('USBNET + PASSTHRU'),       value:4},
    {label:$L('USBNET + UMS + NOVACOM'),  value:5},
  ];
  if (Mojo.Environment.DeviceInfo.platformVersionMajor == 2)
    this.usbChoices.push({label:$L('PASSTHRU + NOVACOM'),value:6})
  
  this.usbModel = {
    value: 0,
    disabled: this.prefs.noEditUSB
  }; 
  
  this.secretString = '';
  this.secretAnswer = 'iknowwhatimdoing';

}

UsbPrefsAssistant.prototype.setup = function() {

  this.usbGadget           = this.controller.get('usbGadget');
  this.usbChangedHandler   = this.usbChanged.bindAsEventListener(this);
  
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
  
  this.getUSBSubscription = FreeTetherService.getUSB({subscribe: true}, this.updateUSB.bind(this));
  
  this.keyPressHandler = this.keyPress.bindAsEventListener(this)
  Mojo.Event.listen(this.controller.sceneElement, Mojo.Event.keypress, this.keyPressHandler);

};

UsbPrefsAssistant.prototype.keyPress = function(event) {

	this.secretString += String.fromCharCode(event.originalEvent.charCode);
         
	if (event.originalEvent.charCode == 8) {
 		this.secretString = '';
	}
	
	if (this.secretString.length == this.secretAnswer.length) {
		if (this.secretString === this.secretAnswer) {
 			this.controller.get('usbAdvanced').style.display = '';
 			this.controller.get('usbWarning').style.display = 'none';
 			this.secretString = '';
 		}
	} else if (this.secretString.length > this.secretAnswer.length) {
		this.secretString = '';
	}
	
}

UsbPrefsAssistant.prototype.usbChanged = function(event) {
  FreeTetherService.setUSB({'state':event.value});
}

UsbPrefsAssistant.prototype.updateUSB = function(payload) {
  if (payload.returnValue) {
    this.usbModel.value = payload.state;
    this.controller.modelChanged(this.usbModel, this);
  }
}

UsbPrefsAssistant.prototype.activate = function(event) {
};

UsbPrefsAssistant.prototype.deactivate = function(event) {
  var tmp = prefs.get(true);
};

UsbPrefsAssistant.prototype.cleanup = function(event) {
};
