/*
format:
  parent = {
    prop: {_op: operation, param1: ...}
  }
  
operations | params
  set (s)       | ns: value is any
    !(prop in parent) ? parent[prop] = n : err
  modify (m)    | om: old value is not undefined, nm: new value is not undefined
    deepequals(parent[prop], om) ? parent[prop] = nm : err
  delete (d)    | od: old value
    deepequals(parent[prop], od) ? delete parent[prop] : err
    
  setundef (su)  | [osu]: old value is not undefined
   !(prop in parent) || deepequals(parent[prop], osu) ? parent[prop] = undefined : err
  modundef (mu)  | nmu: new value is not undefined
    prop in parent && typeof parent[prop] === 'undefined' ? parent[prop] = nmu : err
  delundef (du)
    typeof parent[prop] === 'undefined' ? delete [parent[prop]] : err
*/

(function() {
  var noop = function(){};
  function STM(ws, basePath) {
    this.ws = ws;
    this.basePath = basePath;
    this.state = {};
    this.getCallbacks = {};
    this.subCallbacks = {};
    this.attempts = [];
    this.transactionIds = [];
    this.toSync.push(this);
    var that = this;
    this.ws.addEventListener('message', this.eventListener = function(event) {
      var envelope = JSON.parse(event.data);
      switch(envelope.channel) {
        case 'get-returned':
          if (envelope.message.id in that.getCallbacks) {
            that.getCallbacks[envelope.message.id](envelope.message.data);
            delete that.getCallbacks[envelope.message.id];
          }
          break;
        case 'attempt-returned':
          if (that.transactionIds.indexOf(envelope.message.id) < 0)
            return;
          that.transactionIds.splice(that.transactionIds.indexOf(envelope.message.id), 1);
          patch(that.state, envelope.message.delta);
          that.attempts = that.attempts.filter(function(attempt) {
            if (envelope.message.successes.indexOf(attempt.id) >= 0) {
              attempt.then(that.state);
              return false;
            } else {
              return true;
            }
          });
          that.waitingForReturn = false;
          break;
        case 'update-state':
          if (envelope.message.id in that.subCallbacks) {
            patch(that.state, envelope.message.delta);
            that.subCallbacks[envelope.message.id](that.state);
          }
          break;
      }
    });
  };

  var transactionId = 0;

  STM.prototype.send = function(channel, message) {
    this.ws.send(JSON.stringify({'channel': channel, 'message': message}));
  };

  STM.prototype.get = function(path, callback) {
    if (typeof path === 'function') {
      callback = path;
      path = undefined;
    }
    
    this.getCallbacks[++transactionId] = callback;
    this.send('get', {'path': (this.basePath || '') + (typeof this.basePath === typeof path ? '.' : '') + (path || ''), 'id': transactionId});
  };

  STM.prototype.subscribe = function(path, callback, init) {
    if (typeof path === 'function') {
      callback = path;
      init = callback;
      path = undefined;
    }
    if (typeof callback === 'undefined')
      callback = noop;
    if (typeof init === 'undefined')
      init = noop;
    var toReturn = new STM(this.ws, (this.basePath || '') + (typeof this.basePath === typeof path ? '.' : '') + (path || ''));
    toReturn.subCallbacks[++transactionId] = callback;
    this.send('subscribe', {'path': toReturn.basePath, 'id': transactionId});
    toReturn.get(function(data) {
      toReturn.state = data;
      init(toReturn.state);
    });
    
    return toReturn;
  };
  
  STM.prototype.unsubscribe = function() {
    this.ws.removeEventListener('message', this.eventListener);
    this.send('unsubscribe', {'id': Object.keys(this.subCallbacks)[0]});
  };

  STM.prototype.try = function(callback, then) {
    if (typeof then === 'undefined')
      then = noop;
    this.attempts.push(new Attempt(callback, then));
    this.sync();
  };
  
  function Attempt(callback, then) {
    this.callback = callback;
    this.then = then;
  };
  
  Attempt.prototype.toJSON = function() {
    return {'id': this.id, 'delta': this.delta};
  };
  
  STM.prototype.toSync = [];
  var syncInterval = null;
  STM.prototype.sync = function(interval) {
    var that = this;
    var op = function() {
      that.toSync.forEach(function(toSync) {
        if (toSync.attempts.length === 0)
          return;
        else if (toSync.transactionIds.length > 0)
          return;
          
        var origin = JSON.parse(JSON.stringify(toSync.state));
        var comparand = JSON.parse(JSON.stringify(toSync.state));
        var tmp = [];
        var attempts = [];
        for (var k = 0; k < toSync.attempts.length; k++)
          attempts[k] = toSync.attempts[k];

        var innerLoop = function(i) {
          if (i >= attempts.length) {
            toSync.attempts = tmp;
            if (toSync.attempts.length > 0) {
              toSync.waitingForReturn = true;
              toSync.send('attempt', {id: ++transactionId, path: toSync.basePath, attempts: toSync.attempts});
              toSync.transactionIds.push(transactionId);
            }
            return;
          }
           
          attempts[i].callback(comparand);
          var a = attempts[i];
          diffADebug(origin, comparand, function(result) {
            if (typeof result === 'undefined')
              a.then(comparand);
            else {
              a.delta = result;
              a.id = ++transactionId;
              patch(origin, result);
              tmp.push(a);
            }
            
            innerLoop(++i);
          });
        };
        
        innerLoop(0);
      });
    };
    
    if (typeof interval === 'undefined' && syncInterval === null)
      op();
    else if (typeof interval === null && syncInterval !== null) {
          clearInterval(syncInterval);
      syncInterval = null;
    }
    else if (typeof interval !== 'undefined') {
      if (syncInterval !== null)
        clearInterval(syncInterval);
      
      console.log('set');
      syncInterval = setInterval(op, interval);
    }
  }
  
  function diffADebug(origin, comparand, callback) {
    callback(diff(origin, comparand, false));
  };

  // assert(isPOJS(origin) && isPOJS(comparand))
  function diff(origin, comparand) {
    if (!isPOJS(origin) || !isPOJS(comparand))
      throw new Error('Attempting to diff a non-object');
    var delta = {}, props = [];
    
    var originProps = Object.keys(origin), comparandProps = Object.keys(comparand);
    [].push.apply(props, originProps);
    [].push.apply(props, comparandProps);
    props = props.filter(function(element, index, array) {
      return this.hasOwnProperty(element) ? false : this[element] = true;
    }, {});

    for (var i = 0; i < props.length; i++) {
      fPropInOrigin = props[i] in origin;
      fPropInComparand = props[i] in comparand;
      fUndefinedInOrigin = typeof origin[props[i]] === 'undefined';
      fUndefinedInComparand = typeof comparand[props[i]] === 'undefined';
      fTypesMatch = typeof comparand[props[i]] === typeof origin[props[i]];
      fObjInOrigin = isPOJS(origin[props[i]]);
      fObjInComparand = isPOJS(comparand[props[i]]);
      
      if (fPropInOrigin && fUndefinedInOrigin && !fUndefinedInComparand)
        delta[props[i]] = [1, 1, comparand[props[i]]]; //{_op: 'mu', nmu: comparand[props[i]]};
      else if (fPropInComparand && (!fUndefinedInOrigin && fPropInOrigin) && fUndefinedInComparand)
        delta[props[i]] = [1, 2, null, origin[props[i]]]; //{_op: 'su', osu: origin[props[i]]};
      else if (!fPropInOrigin && fPropInComparand && fUndefinedInComparand)
        delta[props[i]] = [0, 2];
      else if (!fPropInOrigin && fPropInComparand )
        delta[props[i]] = [0, 0, comparand[props[i]]]; //{_op: 's', ns: comparand[props[i]]};
      else if (fPropInOrigin && !fPropInComparand)
        delta[props[i]] = [2, 0, null, origin[props[i]]]; //{_op: 'd', od: origin[props[i]]}
      else if (fUndefinedInOrigin && !fPropInComparand)
        delta[props[i]] = [2, 1]; //{_op: 'du'};
      else if (!fTypesMatch || (fTypesMatch && !fObjInOrigin && !fObjInComparand && origin[props[i]] !== comparand[props[i]]))
        delta[props[i]] = [1, 0, comparand[props[i]], origin[props[i]]]; //{_op: 'm', om: origin[props[i]], nm: comparand[props[i]]};
      else if (fObjInOrigin && fObjInComparand && typeof (subDelta = diff(origin[props[i]], comparand[props[i]])) !== 'undefined')
        delta[props[i]] = subDelta;
    }

    if (Object.keys(delta).length > 0)
      return delta;
  }

  function patch(target, delta, checked) {
    if (typeof delta === 'undefined')
      return true;
    
    if (delta instanceof Array) {
      target = {0: target};
      delta = {0: delta};
    }
    
    if (typeof checked === 'undefined' && !check(target, delta))
      return false;
      
    Object.keys(delta).forEach(function(prop) {
      if (!(delta[prop] instanceof Array))
        patch(target[prop], delta[prop], true);
      else {
        switch(delta[prop][0]) {
          case 0:  
          case 1:  target[prop] = delta[prop][1] !== 1 ? delta[prop][2] : undefined;   break;
          case 2:
            if (target instanceof Array)
              target.splice(prop, 1)
            else
              delete target[prop];
        }
      }
    });
    
    return true;
  }

  function reverse(delta) {

  }

  function check(target, delta) {
    if (typeof target === 'undefined' || typeof delta === 'undefined')
      return typeof target === 'undefined' && typeof delta === 'undefined';
    return Object.keys(delta).every(function(prop) {
      if (!(delta[prop] instanceof Array))
        return check(target[prop], delta[prop]);
      try {
        switch(delta[prop][0]) {
          case 0: return !(prop in target);
          case 1: 
          case 2: return deepequals(target[prop], delta[prop][3]);
        }
      } catch (e) {
        return false;
      };
    });
  }

  function isPOJS(obj) {
    return !(
      obj instanceof Date ||
      obj instanceof RegExp ||
      obj instanceof String ||
      obj instanceof Number) &&
      typeof obj === 'object' &&
      obj !== null;
  }

  function deepequals(origin, comparand, props) {
    if (!isPOJS(origin))
      return origin === comparand;
    
    if (typeof props === 'undefined')
      [].push.apply(props = Object.keys(origin), Object.keys(comparand));
      
    for (var i = 0, isObj; i < props.length; i++) {
      if (typeof origin[props[i]] !== typeof comparand[props[i]] || ((isObj = isPOJS(origin[props[i]])) !== isPOJS(comparand[props[i]])) )
        return false;
      else if (isObj && !deepequals(origin[props[i]], comparand[props[i]]))
        return false;
      else if (!isObj && origin[props[i]] !== comparand[props[i]])
        return false;
    }
    
    return true;
  }
  
  // cite
  var setZeroTimeout;
  (function() {
    if (typeof window === 'undefined')
      return;
    var timeouts = [];
    var messageName = "zero-timeout-message";

    // Like setTimeout, but only takes a function argument.  There's
    // no time argument (always zero) and no arguments (you have to
    // use a closure).
    function _setZeroTimeout(fn) {
        timeouts.push(fn);
        window.postMessage(messageName, "*");
    }

    function handleMessage(event) {
        if (event.source == window && event.data == messageName) {
            event.stopPropagation();
            if (timeouts.length > 0) {
                var fn = timeouts.shift();
                fn();
            }
        }
    }

    window.addEventListener("message", handleMessage, true);

    // Add the one thing we want added to the window object.
    setZeroTimeout = _setZeroTimeout;
  })();

  if (typeof define !== 'undefined')
    define({'STM': STM, 'diff': diff, 'patch': patch, 'reverse': reverse});
  else if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = {'STM': STM, 'diff': diff, 'patch': patch, 'reverse': reverse};
  else
    window.STM = STM;
}());