FreeTetherService.ServiceUri = "palm://org.webosinternals.freetether";

function FreeTetherService() {
}

FreeTetherService.addInterface = function(param, callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'interfaceAdd',
    parameters: param,
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.removeInterface = function(param, callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'interfaceRemove',
    parameters: param,
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.getStatus = function(param, callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'sysInfo',
    parameters: param,
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.getClientList = function(param, callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'clientList',
    parameters: param,
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.monitorServer = function(name, callback) {
  var request = new Mojo.Service.Request('palm://com.palm.bus/signal', {
    method: 'registerServerStatus',
    parameters: {
      serviceName: name,
      subscribe: true
    },
    onSuccess: callback,
    onFailure: callback
  });
  
  return request;
};

FreeTetherService.getUSB = function(param, callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'get_usb_gadget',
    parameters: param,
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.setUSB = function(param, callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'set_usb_gadget',
    parameters: param,
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.getPrefs = function(param, callback) {
  var request = new Mojo.Service.Request('palm://com.palm.systemservice', {
    method: 'getPreferences',
    parameters: param,
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.setPrefs = function(param, callback) {
  var request = new Mojo.Service.Request('palm://com.palm.systemservice', {
    method: 'setPreferences',
    parameters: param,
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.getIPForward = function(param, callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'get_ip_forward',
    parameters: param,
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.restartBluetooth = function(callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'restart_bluetooth',
    parameters: '{}',
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};

FreeTetherService.setIP = function(gateway, subnet, poolstart, maxLeases, leaseTime, callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'setIP',
    parameters: {
      gateway: gateway,
      subnet: subnet,
      poolstart: poolstart,
      maxLeases: maxLeases,
      leaseTime: leaseTime
    },
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};
FreeTetherService.stop = function(callback) {
  var request = new Mojo.Service.Request(FreeTetherService.ServiceUri, {
    method: 'stop',
    parameters: '{}',
    onSuccess: callback,
    onFailure: callback
  });

  return request;
};
