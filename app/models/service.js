var HotspotMojoService = Class.create({
  initialize: function() {
  },

  addInterface: function(param, callback) {
    var request = new Mojo.Service.Request('palm://com.palm.mobilehotspot', {
      method: 'interfaceAdd',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },

  removeInterface: function(param, callback) {
    var request = new Mojo.Service.Request('palm://com.palm.mobilehotspot', {
      method: 'interfaceRemove',
      parameters: param,
      onSuccess: callback,
      onFailure: callback
    });

    return request;
  },

});
