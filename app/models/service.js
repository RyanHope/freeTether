//var ServiceUri = "palm://com.palm.mobilehotspot";
var ServiceUri = "palm://org.webosinternals.freetether";
var FreeTetherService = Class.create({
  initialize: function() {
  },

  addInterface: function(param, callback) {
    var request = new Mojo.Service.Request(ServiceUri, {
      method: 'interfaceAdd',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },

  removeInterface: function(param, callback) {
    var request = new Mojo.Service.Request(ServiceUri, {
      method: 'interfaceRemove',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },

  getStatus: function(param, callback) {
    var request = new Mojo.Service.Request(ServiceUri, {
      method: 'sysInfo',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },

  monitorServer: function(name, callback) {
    var request = new Mojo.Service.Request('palm://com.palm.bus/signal', {
      method: 'registerServerStatus',
      parameters: {
        serviceName: name,
        subscribe: true,
      },
      onSuccess: callback,
      onFailure: callback
    });
  },
  
  getUSB: function(param, callback) {
    var request = new Mojo.Service.Request(ServiceUri, {
      method: 'get_usb_gadget',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },
  
  setUSB: function(param, callback) {
    var request = new Mojo.Service.Request(ServiceUri, {
      method: 'set_usb_gadget',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },

});
