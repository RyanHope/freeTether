var vers = new versionCookie();

function StageAssistant() {

}

StageAssistant.prototype.setup = function() {

  vers.init();
	if (vers.showStartupScene())
    this.controller.pushScene('startup');
	else
    this.controller.pushScene('main');

};
