function GeneralPrefsAssistant() {

  this.cookie = new preferenceCookie();
  this.prefs = this.cookie.get();

}

GeneralPrefsAssistant.prototype.setup = function() {

  this.controller.setupWidget(
    'autoWiFi',
    {
       trueLabel:  'Enabled',
       falseLabel: 'Disabled',
       modelProperty:  'autoWiFi'
    },
    this.prefs
  );
  
  this.controller.setupWidget(
    'autoBT',
    {
       trueLabel:  'Enabled',
       falseLabel: 'Disabled',
       modelProperty:  'autoBT'
    },
    this.prefs
  );
  
  this.controller.setupWidget(
    'autoUSB',
    {
       trueLabel:  'Enabled',
       falseLabel: 'Disabled',
       modelProperty:  'autoUSB'
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

GeneralPrefsAssistant.prototype.activate = function(event) {
};

GeneralPrefsAssistant.prototype.deactivate = function(event) {
	this.cookie.put(this.prefs);
	var tmp = prefs.get(true);
};

GeneralPrefsAssistant.prototype.cleanup = function(event) {
};

GeneralPrefsAssistant.prototype.helpButtonTapped = function(event)
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

GeneralPrefsAssistant.prototype.helpRowTapped = function(event)
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