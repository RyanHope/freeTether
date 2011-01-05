var vers = new versionCookie();
var prefs = new preferenceCookie();
var service = new FreeTetherService();

function StageAssistant() {

}

StageAssistant.prototype.setup = function() {

  vers.init();
	if (vers.showStartupScene())
    this.controller.pushScene('startup');
	else
    this.controller.pushScene('main');

};
