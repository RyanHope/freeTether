var prefs = new preferenceCookie();
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

function objectToString(o) {
  var parse = function(_o) {
    var a = [], t;
    for(var p in _o) {
      if(_o.hasOwnProperty(p)) {
        t = _o[p];
        if(t && typeof t == "object") {
          a[a.length]= p + ":{ " + arguments.callee(t).join(", ") + "}";
        } else {
          if(typeof t == "string"){
            a[a.length] = [ p+ ": \"" + t.toString() + "\"" ];
          } else {
            a[a.length] = [ p+ ": " + t.toString()];
          }        
        }
      }
    }
    return a;
  }
  return "{" + parse(o).join(", ") + "}";  
}