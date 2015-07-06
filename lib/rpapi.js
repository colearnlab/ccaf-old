define(function() {
  var exports = {};

  exports.using = function(state) {
    return new API(state);
  };

  function API(state) {
    this.state = state;
  }

  API.prototype = {
    'device': function(id) {
      if (typeof id === 'undefined' || !('devices' in this.state))
        return null;

      var device = this.state.devices[this.state.devices.map(function(d) { return d.id; }).indexOf(id)];

      if (typeof device === 'undefined')
        return null;

      return new Device(this.state, device);
    },
    'devices': function(id) {
      if (typeof id === 'undefined')
        return (this.state('devices') || []).map(function(_, index) {
          return new Device(this.state, this.state.devices[index]);
        });

      return this.device(id);
    }
  };

  function Device(state, device) {
    this.state = state;
    this.device = device;
  }

  Device.prototype = {
    'loadApp': function(app) {
      this.device('app', app);
    }
  };

  return exports;
});
