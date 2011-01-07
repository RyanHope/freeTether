function SetPassphraseAssistant(sceneAssistant) {

  this.sceneAssistant = sceneAssistant;
   
  this.newpassModel = {value : ""}
  
  this.okButtonModel = {
    label: "Set Passphrase",
    disabled: true,
  }
  
}

SetPassphraseAssistant.prototype.setup = function(widget) {

  this.widget = widget;

  this.sceneAssistant.controller.setupWidget(
    "newpass",
    {
      hintText: "8 character minimum",
      autoFocus: true,
      preventResize: true,
      autoReplace: false,
      changeOnKeyPress: true,
      textCase: Mojo.Widget.steModeLowerCase,
    },
    this.newpassModel
  );
  Mojo.Event.listen($('newpass'), Mojo.Event.propertyChange, this.checkPassphrase.bindAsEventListener(this));

  this.sceneAssistant.controller.setupWidget("randomButton",
    this.attributes = {},
    this.model = {
      buttonLabel: "Generate Random",
      disabled: false
    }
  );
  Mojo.Event.listen($('randomButton'), Mojo.Event.tap, this.genRandom.bindAsEventListener(this));

  this.sceneAssistant.controller.setupWidget("okButton",
     this.attributes = {
     },
     this.okButtonModel
  );
  Mojo.Event.listen($('okButton'), Mojo.Event.tap, this.okPressed.bindAsEventListener(this));
  
};

SetPassphraseAssistant.prototype.genRandom = function() {

  this.newpassModel.value = randomPassword(10);
  this.sceneAssistant.controller.modelChanged(this.newpassModel, this);
  this.okButtonModel.disabled = false;
  this.sceneAssistant.controller.modelChanged(this.okButtonModel, this);

}

SetPassphraseAssistant.prototype.checkPassphrase = function(event) {

  if (this.newpassModel.value && this.newpassModel.value.length>=8)
    this.okButtonModel.disabled = false;
  else
    this.okButtonModel.disabled = true;
  this.sceneAssistant.controller.modelChanged(this.okButtonModel, this);

}

SetPassphraseAssistant.prototype.okPressed = function() {
  this.sceneAssistant.setNewPassphrase(this.newpassModel.value);
  this.widget.mojo.close();
}