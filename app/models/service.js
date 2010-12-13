var FreeTetherService = Class.create({
  initialize: function() {
  },

  addInterface: function(param, callback) {
    var request = new Mojo.Service.Request('palm://org.webosinternals.freetether', {
      method: 'interfaceAdd',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },

  removeInterface: function(param, callback) {
    var request = new Mojo.Service.Request('palm://org.webosinternals.freetether', {
      method: 'interfaceRemove',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },

  getStatus: function(param, callback) {
    var request = new Mojo.Service.Request('palm://org.webosinternals.freetether', {
      method: 'sysInfo',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },


});
