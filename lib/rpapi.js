/**
 * lib/rpapi.js (c) Gregory Fabry 2015
 *
 * A module for the generic ReflectProject API, which provides a chainable set of methods that
 * operate on a Checkerboard state and perform common platform operations.
 *
 */

define(function() {
  // Operates as a wrapper, so we follow the jQuery pattern: e.g. api(state).devices();
  var exports = function(state) {
    return new API(state);
  };

  // Wrapper for our top-level API.
  function API(state) {
    this.state = state;
  }

  API.prototype = {
    // Returns a wrapped device object.
    'device': function(id) {
      if (typeof id === 'undefined' || !('devices' in this.state))
        return null;

      var device = this.state.devices[this.state('devices').map(function(d) { return d.id; }).indexOf(parseInt(id))];

      if (typeof device === 'undefined')
        return null;

      return new Device(this.state, device);
    },
    // Returns an array of wrapped device objects OR a specific device object if an id is provided.
    'devices': function(id) {
      if (!('devices' in this.state))
        return null;

      if (typeof id === 'undefined')
        return (this.state('devices') || []).map(function(_, index) {
          return new Device(this.state, this.state.devices[index]);
        });

      return this.device(id);
    },
    'config': function(paths) {
      var def, pathComponents, cur;
      for (var path in paths) {
        cur = this.state;
        pathComponents = path.split('.');
        def = path[paths];
        while (pathComponents.length > 0) {
          if (pathComponents.length > 1) {
            cur = cur[pathComponents.shift()];
            if (typeof cur === 'undefined')
              break;
          }
          else if (pathComponents[0] in cur)
            break;
          else
            cur(pathComponents[0], def);
        }
      }
    }
  };

  // Wrapper for our device API.
  function Device(state, device) {
    this.state = state;
    this.device = device;
  }

  Device.prototype = {
    // Get or set generic device attributes.
    'attr': function() {
      var cur = this.device;
      var path = arguments[0].split('.');
      while (path.length > 1)
        cur = cur[path.shift()];

      if (arguments.length === 1)
        return cur(path[0]);
      else if (arguments.length === 2)
        cur(path[0], arguments[1]);

      return this;
    },
    // Sets an app
    'loadApp': function(app) {
      if (app in this.state('apps'))
        this.device('app', app);
      return this;
    },
    // Unsets an app
    'clearApp': function() {
      this.device('app', undefined);
      return this;
    },
    // Sets the frozen attribute
    'freeze': function() {
      this.device('frozen', true);
      return this;
    },
    // Unsets the frozen attribute
    'unfreeze': function() {
      this.device('frozen', false);
      return this;
    },
    // Toggles the frozen attribute
    'toggleFreeze': function() {
      this.device('frozen', !this.device('frozen'));
      return this;
    },
    // Returns the frozen state of the device
    'frozen': function() {
      return this.device('frozen');
    },
    // Project a device
    'project': function(device) {
      this.device('project', device instanceof Device ? device.id : device);
      return this;
    },
    // Reset projecter
    'unproject': function() {
      this.device('project', undefined);
      return this;
    },
    // Return the device that is being projected
    'projecting': function() {
      return typeof this.device('project') !== 'undefined' ? new Device(this.state, this.device('project')) : false;
    },
    'delete': function() {
      var devices = this.state('devices');
      var index = devices.map(function(d) { return d.id; }).indexOf(this.device.id);
      devices.splice(index, 1);
      this.state('devices', devices);
    }
  };

  return exports;
});
