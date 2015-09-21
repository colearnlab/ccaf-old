var WebSocket = require('./node_modules/ws/index.js');
var events = require('events');
var util = require('util');

module.exports.Server = function(port, inputState, opts) {
  if (typeof opts === 'undefined')
    opts = {};

  this.websocketServer = new WebSocket.Server({'port': port});
  this.state = inputState || {};
      
  this.on('get', function(conn, message) {
    conn.sendObj('get-returned', {'data': getByPath(this.state, message.path), 'id': message.id});
  });
  
  this.on('subscribe', function(conn, message) {
    conn.subs[message.id] = message.path;
  });
  
  var that = this;
  this.on('attempt', function(conn, message) {
    var successes = [];
    var savedState = JSON.parse(JSON.stringify(that.state));
    message.attempts.every(function(attempt) {
      console.log(getByPath(that.state, message.path));
      if (patch(getByPath(that.state, message.path), attempt.delta)) {
        successes.push(attempt.id);
        return true;
      }
      return false;
    });
    conn.sendObj('attempt-returned', {'successes': successes});
    var delta = diff(savedState, that.state);
    console.log(conns);
    conns.forEach(function(otherConn) {
      Object.keys(otherConn.subs).forEach(function(id) {
        var components = otherConn.subs[id].split('.');
        var cur = delta;
        while (components.length > 0 && typeof cur !== 'undefined') {
          cur = cur[components[0]];
          components = components.splice(1);
          if ('_op' in cur) {
            otherConn.sendObj('update-state', {'delta': getByPath(delta, otherConn.subs[id])});
            break;
          }
        }
      });
    });
  });

  var that = this;
  var conns = [];
  this.websocketServer.on('connection', function(conn) {
    var wrapped = new ConnWrapper(conn);
    conns.push(wrapped);

    that.emit('open', wrapped);

    conn.on('message', function(json) {
      var envelope = JSON.parse(json);
      if (typeof envelope.channel !== 'undefined')
        that.emit(envelope.channel, wrapped, envelope.message);
    });

    conn.on('close', function() {
      that.emit('close', wrapped);
      conns.splice(conns.indexOf(conn), 1);
    });
  });
  
  if (typeof opts.refreshRate !== 'undefined') {
    setInterval(function() {
      conns.forEach(function(conn) {
        conn.sendQueue();
      });
    }, opts.refreshRate);
  }
  
  events.EventEmitter.call(this);
}

util.inherits(module.exports.Server, events.EventEmitter);

function isPOJS(prop) {
  return !(
    prop instanceof Date ||
    prop instanceof RegExp ||
    prop instanceof String ||
    prop instanceof Number) &&
    typeof prop === 'object' &&
    prop !== null;
}

function ConnWrapper(conn) {
  this.conn = conn;
  this.queue = [];
  this.subs = {};
}

ConnWrapper.prototype.sendObj = function(channel, message) {
  if (this.conn.readyState !== WebSocket.CLOSING && this.conn.readyState !== WebSocket.CLOSED)
    this.conn.send(JSON.stringify({'channel': channel, 'message': message}));
};

ConnWrapper.prototype.enqueue = function(channel, message) {
  if (typeof opts.refreshRate === 'undefined')
    this.sendObj(channel, message);
  else
    this.queue.push({'channel': channel, 'message': message});
};
  
ConnWrapper.prototype.sendQueue = function() {
  this.queue.forEach(function(msg) {
    this.sendObj(msg.channel, msg.message);
  });
  this.queue = [];
};
 
function getByPath(obj, keyPath){ 
 
    var keys, keyLen, i=0, key;
    keys = keyPath && keyPath.split(".");
    keyLen = keys && keys.length;
 
    while(i < keyLen && obj){
 
        key = keys[i];        
        obj = (typeof obj.get == "function") 
                    ? obj.get(key)
                    : obj[key];                    
        i++;
    }
 
    if(i < keyLen){
        obj = null;
    }
 
    return obj;
};

var sharedThreshold = 0.5;

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
