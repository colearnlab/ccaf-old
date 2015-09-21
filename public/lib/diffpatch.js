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
  var sharedThreshold = 0.5;
  var noop = function(){};
  function STM(ws, basePath) {
    this.ws = ws;
    this.basePath = basePath;
    this.state = {};
    this.getCallbacks = {};
    this.subCallbacks = {};
    this.attempts = [];
    var that = this;
    this.ws.addEventListener('message', function(event) {
      var envelope = JSON.parse(event.data);
      switch(envelope.channel) {
        case 'get-returned':
          if (envelope.message.id in that.getCallbacks) {
            that.getCallbacks[envelope.message.id](envelope.message.data);
            delete that.getCallbacks[envelope.message.id];
          }
          break;
        case 'attempt-returned':
          var mappedIds = that.attempts.map(function(attempt) { return attempt.id; });
          var waitFlag = false;
          for (var i = 0, index; i < envelope.message.successes.length; i++) {
            index = mappedIds.indexOf(envelope.message.successes[i]);
            if (index > -1) {
              waitFlag = true;
              that.attempts.splice(index, 1);
            }
          }
          if (waitFlag) that.waitingForReturn = false;
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

  STM.prototype.transactionId = 0;

  STM.prototype.send = function(channel, message) {
    this.ws.send(JSON.stringify({'channel': channel, 'message': message}));
  };

  STM.prototype.get = function(path, callback) {
    if (typeof path === 'function') {
      callback = path;
      path = undefined;
    }
    
    this.getCallbacks[++this.transactionId] = callback;
    this.send('get', {'path': (this.basePath || '') + (typeof this.basePath === typeof path ? '.' : '') + (path || ''), 'id': this.transactionId});
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
    this.toSync.push(toReturn);
    toReturn.subCallbacks[++this.transactionId] = callback;
    this.send('subscribe', {'path': toReturn.basePath, 'id': this.transactionId});
    toReturn.get(function(data) {
      toReturn.state = data;
      init(toReturn.state);
    });
    
    return toReturn;
  };

  STM.prototype.attempt = function(callback) {
    this.attempts.push(new Attempt(callback));
    this.sync();
  };
  
  function Attempt(callback, id) {
    this.callback = callback;
  };
  
  Attempt.prototype.toJSON = function() {
    return {'id': this.id, 'delta': this.delta};
  };
  
  STM.prototype.toSync = [];
  STM.prototype.syncInterval = null;
  STM.prototype.sync = function(interval) {
    var that = this;
    var op = function() {
      that.toSync.forEach(function(toSync) {
        if (toSync.attempts.length === 0 || toSync.waitingForReturn)
          return;
          
        var originState = JSON.parse(JSON.stringify(that.state));
        var comparandState = JSON.parse(JSON.stringify(that.state));
        toSync.attempts = toSync.attempts.filter(function(attempt) {
          attempt.callback(comparandState);
          attempt.delta = diff(originState, comparandState);
          if (attempt.delta !== 'undefined') {
            patch(originState, attempt.delta);
            attempt.id = ++that.transactionId;
            return true;
          }
          return false;
        });
        
        if (toSync.attempts.length > 0) {
          toSync.waitingForReturn = true;
          toSync.send('attempt', {path: toSync.basePath, attempts: toSync.attempts});
        };
      });
    };
    
    if (typeof interval === undefined && this.syncInterval === null)
      op();
    else if (typeof interval === null && this.syncInterval !== null)
      clearInterval(this.syncInterval);
    else if (typeof interval !== undefined) {
      if (this.syncInterval !== null)
        clearInterval(this.syncInterval);
      
      setInterval(op, interval);
    }
  }

  // assert(isPOJS(origin) && isPOJS(comparand))
  function diff(origin, comparand) {
    if (!isPOJS(origin) || !isPOJS(comparand))
      throw new Error('Attempting to diff a non-object');
    var delta = {}, props = [];
    
    var originProps = Object.keys(origin), comparandProps = Object.keys(comparand), numSharedProps = 0;
    [].push.apply(props, originProps);
    [].push.apply(props, comparandProps);
    props = props.filter(function(element, index, array) {
      return this.hasOwnProperty(element) ? (numSharedProps++, false) : (this[element] = true);
    }, {});
    
    if ((originProps.length > 0 && numSharedProps / originProps.length < sharedThreshold) || (comparandProps.length > 0 && numSharedProps / comparandProps.length < sharedThreshold))
      return {_op: 'm', om: origin, nm: comparand};
    
    var fPropInOrigin, fPropInComparand, fUndefinedInOrigin, fUndefinedInComparand, fTypesMatch, fObjInOrigin, fObjInComparand;
    var subDelta;
    for (var i = 0; i < props.length; i++) {
      fPropInOrigin = props[i] in origin;
      fPropInComparand = props[i] in comparand;
      fUndefinedInOrigin = typeof origin[props[i]] === 'undefined';
      fUndefinedInComparand = typeof comparand[props[i]] === 'undefined';
      fTypesMatch = typeof comparand[props[i]] === typeof origin[props[i]];
      fObjInOrigin = isPOJS(origin[props[i]]);
      fObjInComparand = isPOJS(comparand[props[i]]);
      
      if (fPropInOrigin && fUndefinedInOrigin && !fUndefinedInComparand)
        delta[props[i]] = {_op: 'mu', nmu: comparand[props[i]]};
      else if (fPropInComparand && (!fUndefinedInOrigin || !fPropInOrigin) && fUndefinedInComparand)
        delta[props[i]] = {_op: 'su', osu: origin[props[i]]};
      else if (!fPropInOrigin && fPropInComparand )
        delta[props[i]] = {_op: 's', ns: comparand[props[i]]};
      else if (fPropInOrigin && !fPropInComparand)
        delta[props[i]] = {_op: 'd', od: origin[props[i]]}
      else if (fUndefinedInOrigin && !fPropInComparand)
        delta[props[i]] = {_op: 'du'};
      else if (!fTypesMatch || (fTypesMatch && !fObjInOrigin && !fObjInComparand && origin[props[i]] !== comparand[props[i]]))
        delta[props[i]] = {_op: 'm', om: origin[props[i]], nm: comparand[props[i]]};
      else if (fObjInOrigin && fObjInComparand && typeof (subDelta = diff(origin[props[i]], comparand[props[i]])) !== 'undefined')
        delta[props[i]] = subDelta;
    }

    if (Object.keys(delta).length > 0)
      return delta;
  }

  function patch(target, delta, checked) {
    if (typeof checked === 'undefined' && !check(target, delta))
      return false;
      
    Object.keys(delta).forEach(function(prop) {
      if (!('_op' in delta[prop]))
        patch(target[prop], delta[prop]);
      
      switch(delta[prop]._op) {
        case 's':  target[prop] = delta[prop].ns;   break;
        case 'm':  target[prop] = delta[prop].nm;   break;
        case 'su': target[prop] = undefined;        break;
        case 'mu': target[prop] = delta[prop].nmu;  break;
        case 'd':
        case 'du':
          if (target instanceof Array)
            target.splice(prop, 1)
          else
            delete target[prop];                    break;
      }
    });
    
    return true;
  }

  function reverse(delta) {
    var toReturn = {};
    Object.keys(delta).forEach(function(prop) {
      if (!('_op' in delta[prop]))
        toReturn[prop] = reverse(delta[prop]);
      
      switch(delta[prop]._op) {
        case 's':  toReturn[prop] = {_op: 'd',   od:   delta[prop].ns};                      break;
        case 'm':  toReturn[prop] = {_op: 'm',   om:   delta[prop].nm, nm: delta[prop].om};  break;
        case 'd':  toReturn[prop] = {_op: 's',   ns:   delta[prop].od};                      break;
        case 'su':
          if (typeof delta[prop].osu !== 'undefined')
            toReturn[prop] =        {_op: 'mu',  nmu: delta[prop].osu};
          else
            toReturn[prop] =        {_op: 'du'};                                             break;
        case 'mu': toReturn[prop] = {_op: 'su',  osu: delta[prop].nmu};                      break;
        case 'du': toReturn[prop] = {_op: 'su'};                                             break;
      } 
    });
    
    return toReturn;
  }

  function check(target, delta) {
    return Object.keys(delta).every(function(prop) {
      if (!('_op' in delta[prop]))
        return check(target[prop], delta[prop]);
      try {
        switch(delta[prop]._op) {
          case 's':  return !(prop in target);
          case 'm':  return deepequals(target[prop], delta[prop].om);
          case 'd':  return deepequals(target[prop], delta[prop].od);
          case 'su': return !(prop in target) || deepEquals(target[prop], delta[prop].osu);
          case 'mu':
          case 'du': return (prop in target) && typeof target[prop] === 'undefined';
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

  if (typeof define !== 'undefined')
    define({'STM': STM, 'diff': diff, 'patch': patch, 'reverse': reverse});
  else if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = {'STM': STM, 'diff': diff, 'patch': patch, 'reverse': reverse};
  else
    window.STM = STM;
}());