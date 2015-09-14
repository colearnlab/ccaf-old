(function() {
  var Q = (typeof window !== 'undefined' ? window.Q : undefined);
  function Checkerboard(conn) {
    var state = this.state = new DiffableState({});
    var uuid;
    var attempts = [];
    var transactionId = 0;

    var savedWsHandler = conn.onmessage;
    conn.onmessage = function(raw) {
      var envelope = JSON.parse(raw.data);

      if (envelope.channel in actionHandler)
        actionHandler[envelope.channel](envelope.message);

      if (typeof savedWsHandler == 'function')
        savedWsHandler(raw);
    };

    var actionHandler = {
      'data-attempts-returned': function(message) {
        var i;
        for (i = 0; i < attempts.length; i++) {
          if (!(attempts[i].id <= message.lastAttempt))
            break;
          state.merge(attempts[i].patch);
          attempts[i].deferred.resolve(state.proxy);
        }
        attempts.splice(0, i);
        waitingForReturn = false;
      },
      'data-uuid': function(message) {
        if (typeof message.uuid !== 'undefined')
          uuid = message.uuid;
      },
      'data-update-state': function(message) {
        state.merge(message.patch);
      }
    };

    this.try = function(callback) {
      var deferred = Q.defer();
      var attempt = new Attempt(callback, deferred);
      attempts.push(attempt);
      if (intervalHandle === null)
        this.sync();
      return deferred.promise;
    };
    
    var subIdentifier = 0;
    var subs = {};
    
    this.get = function(path, callback) {
      var proxy, that = this, got = false;
      return this.subscribe(path, proxy = function(data, change) {
        if (!got) {
          callback(data, change);
          that.unsubscribe(path, proxy);
          got = true;
        }
      });
    };
    
    this.subscribe = function(path, callback) {
      var thrownAway = false;
      var proxy;
      state.subscribe(path, proxy = function(data, change) {
        if (!thrownAway)
          thrownAway = true;
        else
          callback(data, change);
      });
      if (typeof subs[path] !== 'undefined')
        subs[path].push({'id': subIdentifier, 'proxy': proxy, 'callback': callback});
      else
        subs[path] = [{'id': subIdentifier, 'proxy': proxy, 'callback': callback}];
      
      this.send('data-subscribe', {'path': path, 'id': subIdentifier++});
      return subIdentifier;
    };
    
    this.unsubscribe = function(path, callback) {
      var sub;
      for (var prop in subs) {
        if (typeof subs[prop] === 'undefined')
          continue;
        for (var i = 0; i < subs[prop].length; i++) {
          if (subs[prop][i].callback === callback) {
            sub = subs[prop][i];
            subs[prop].splice(i, 1);
          } 
        }
      }
      state.unsubscribe(path, sub.proxy);
      this.send('data-unsubscribe', {'path': path, 'id': sub.id});
    };

    this.uuid = function() {
      return uuid;
    };

    var send = this.send = function(channel, message) {
      conn.send(JSON.stringify({'channel': channel, 'message': message}));
    };

    var intervalHandle = null;
    var waitingForReturn = false;
    var sync = this.sync = function(interval) {
      if (interval === null) {
        clearInterval(intervalHandle);
        intervalHandle = null;
        return;
      }
      else if (typeof interval !== 'undefined') {
        clearInterval(intervalHandle);
        intervalHandle = setInterval(function() { sync(); }, interval);
        return;
      }
      else if (waitingForReturn)
        return;

      var tryableAttempts = [];
      for (var i = 0; i < attempts.length; i++) {
        attempts[i].callback(state.proxy);
        state.update();
        attempts[i].diff = JSON.parse(JSON.stringify(state.diff));
        attempts[i].patch = JSON.parse(JSON.stringify(state.patch));
        state.merge();
        state.reset();
        
        if (Object.keys(attempts[i].patch).length > 0) {
          attempts[i].id = transactionId++
          tryableAttempts.push(attempts[i]);
        } else {
          attempts[i].deferred.resolve(state.proxy);
          attempts.splice(i, 1);
        }
      }

      if (tryableAttempts.length > 0) {
        send('data-attempt-state', {'attempts': tryableAttempts});
        waitingForReturn = true;
      }
    };
  }

  // a bucket object that represents an attempt to change state. it is resolved if the attempt is successful,
  // otherwise the callback can be retried until it is.
  function Attempt(callback, deferred) {
    this.callback = callback;
    this.deferred = deferred;
  }

  Attempt.prototype.toJSON = function() {
    return {'id': this.id, 'diff': this.diff, 'patch': this.patch};
  };

  // helper function: returns whether the supplied object is a plain ol' js object
  function isPOJS(prop) {
    return !(
      prop instanceof Date ||
      prop instanceof RegExp ||
      prop instanceof String ||
      prop instanceof Number) &&
      typeof prop === 'object' &&
      prop !== null;
  }

  function DiffableStateHelper(proxy, env, data, diff, patch, propegateDiff, propegatePatch, flagSet, dsGet, dsSet) {
    this.proxy = proxy;
    this.env = env;
    this.data = data;
    this.diff = diff;
    this.patch = patch;
    this.propegateDiff = propegateDiff;
    this.propegatePatch = propegatePatch;
    this.flagSet = flagSet;
    this.dsGet = dsGet;
    this.dsSet = dsSet;
    
    this.subs = [];
  }

  DiffableStateHelper.prototype.reset = function() {
    for (var prop in this.data)
      if (this.data[prop] instanceof DiffableStateHelper)
        this.data[prop].reset();
    this.env.diff = new Diff();
    this.env.patch = new Patch();
  }

  DiffableStateHelper.prototype.merge = function(_patch) {
    var patch = typeof _patch !== 'undefined' ? _patch : this.patch;

    for (var prop in patch) {
      if (patch.hasOwnProperty(prop) && prop !== 'toJSON') {
        var cur = patch[prop];
        if (isPOJS(cur) && '$set' in cur)
          this.data[prop] = isPOJS(cur['$set']) ? (new DiffableState(cur['$set'], {'diff': this.diff, 'patch': this.patch, 'propegateDiff': this.propegateDiff, 'propegatePatch': this.propegatePatch}, prop)) : cur['$set'];
        else if (isPOJS(cur) && this.data[prop] instanceof DiffableStateHelper) {
          this.data[prop].merge(cur);
        }
        else if (isPOJS(cur))
          this.data[prop] = new DiffableState(cur, {'diff': this.diff, 'patch': this.patch, 'propegateDiff': this.propegateDiff, 'propegatePatch': this.propegatePatch}, prop);
        else
          this.data[prop] = cur;
          
        this.proxy.__defineGetter__(prop, this.dsGet.bind(this.proxy, prop));
        this.proxy.__defineSetter__(prop, this.dsSet.bind(this.proxy, prop));
      }
    }
        
    var proxy = this.proxy;
    this.subs.forEach(function(sub) {
      sub(JSON.parse(JSON.stringify(proxy)), JSON.parse(JSON.stringify(proxy)));
    });
  }

  DiffableStateHelper.prototype.update = function() {
    for (var prop in this.proxy) {
      if (!(prop in this.data || prop in this.patch)) {
        var tmp = this.proxy[prop];
        delete this.proxy[prop];
        this.dsSet(prop, tmp);
      }
    }
    
    for (var prop in this.data)
      if (this.data[prop] instanceof DiffableStateHelper)
        this.data[prop].update();
        
    for (var prop in this.patch)
      if (this.patch[prop] instanceof DiffableStateHelper)
        this.patch[prop].update();
  };

  DiffableStateHelper.prototype.subscribe = function(path, fn) {
    var components = typeof path === "string" ? path.split('.') : path;
    if (typeof this.data[components[0]] === 'undefined') {
      var obj = {};
      obj[components[0]] = {};
      this.merge(obj);
    }
    if (components.length === 1) {
      this.data[components[0]].subs.push(fn);
      fn(JSON.parse(JSON.stringify(this.data[components[0]].proxy)));
    }
    else
      this.data[components[0]].subscribe(components.slice(1), fn);
  };

  DiffableStateHelper.prototype.unsubscribe = function(path, fn) {
    var components = typeof path === "string" ? path.split('.') : path;
    var dsh = (this.patch[components[0]] || this.data[components[0]]);
    if (components.length === 1)
      dsh.subs.splice(dsh.subs.indexOf(fn), 1);
    else
      dsh.unsubscribe(components.slice(1), fn);
  }

  var Diff = function() {}
  Diff.prototype.toJSON = function() {
  var cpy = {};
    for (var prop in this)
        cpy[prop] = this[prop];
        
  return cpy;
  };
  
  var Patch = function() {}
  Patch.prototype.toJSON = function() {
    var cpy = {};
    for (var prop in this)
        cpy[prop] = this[prop] instanceof DiffableStateHelper ? this[prop].proxy : this[prop];
        
    return cpy;
  };

  var DiffableState = Checkerboard.DiffableState = function(_data, root, rootProp, flagSet) {       
    var proxy = _data instanceof Array ? [] : {};
    
    var env = {
      'data': {},
      'diff': new Diff(),
      'patch': new Patch()
    }
    
    var dsGet = function (prop, noSides) {
      var toReturn = env.patch[prop] || env.data[prop];
      return toReturn instanceof DiffableStateHelper ? '$set' in toReturn.proxy ? toReturn.proxy.$set : toReturn.proxy : toReturn;
    };
      
    var dsSet = function(prop, value) {
      propegateDiff();
      propegatePatch();

      env.patch[prop] = isPOJS(value) ? (new DiffableState(value, {'diff': env.diff, 'patch': env.patch, 'propegateDiff': propegateDiff, 'propegatePatch': propegatePatch}, prop, true)) : value    

      proxy.__defineGetter__(prop, dsGet.bind(proxy, prop));
      proxy.__defineSetter__(prop, dsSet.bind(proxy, prop));
      
      return dsGet(prop);
    };
    
    var propegateDiff = function() {
      if (typeof root !== 'undefined') {
        root.diff[rootProp] = env.diff;
        root.propegateDiff();
      }
    };
    
    var propegatePatch = function() {
      if (typeof root !== 'undefined') {
        root.patch[rootProp] = env.patch;
        root.propegatePatch();
      }
    }
        
    for (var prop in _data) {
      env.data[prop] = isPOJS(_data[prop]) ? (new DiffableState(_data[prop], {'diff': env.diff, 'patch': env.patch, 'propegateDiff': propegateDiff, 'propegatePatch': propegatePatch}, prop)) : _data[prop];
      proxy.__defineGetter__(prop, dsGet.bind(proxy, prop));
      proxy.__defineSetter__(prop, dsSet.bind(proxy, prop));
    }
      
    return new DiffableStateHelper(proxy, env, env.data, env.diff, env.patch, propegateDiff, propegatePatch, flagSet, dsGet, dsSet);
  };
  
  if (typeof define !== 'undefined')
    define('checkerboard', ['q'], function(q) { if (typeof Q === 'undefined') Q = q; return Checkerboard; });
  else if (typeof exports !== 'undefined')
    exports.Checkerboard = Checkerboard;
  else
    window.Checkerboard = Checkerboard;
})();