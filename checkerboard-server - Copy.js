var WebSocket = require('./node_modules/ws/index.js');
var events = require('events');
var util = require('util');
var diffpatch = require('./public/lib/diffpatch.js'), diff = diffpatch.diff, diffA = diffpatch.diffA, patch = diffpatch.patch;
module.exports.Server = function(port, inputState, opts) {
  if (typeof opts === 'undefined')
    opts = {};

  this.websocketServer = new WebSocket.Server({'port': port});
  this.state = inputState || {};
      
  var tfn;
  this.on('get', tfn = function(conn, message) {
    var data = getByPath(this.state, message.path);
    conn.sendObj('get-returned', {'data': getByPath(this.state, message.path), 'id': message.id});
  });
  
  this.on('subscribe', function(conn, message) {
    conn.subs[message.id] = message.path;
  });
  
  this.on('unsubscribe', function(conn, message) {
    delete conn.subs[message.id];
  });
  
  var that = this;
  var a = false;
  this.on('attempt', function(conn, message) {
    console.time('attempt');
    var savedState = JSON.parse(JSON.stringify(that.state));
    var successes = message.attempts.filter(function(attempt) {
      if (patch(getByPath(that.state, message.path), attempt.delta)) {
        return true;
      }
      return false;
    }).map(function(attempt) {
      return attempt.id;
    });
    conn.sendObj('attempt-returned', {'id': message.id, 'successes': successes});
    
    var a = getByPath(savedState, message.path);
    var b = getByPath(that.state, message.path);
    if (!(isPOJS(a) && isPOJS(b)))
      return;
    var delta = diff(a, b);
    
    conns.forEach(function(otherConn) {
      Object.keys(otherConn.subs).forEach(function(id) {
        debugger;
        if (!isChild(message.path, otherConn.subs[id]))
          return;
          
        (function(delta) {        
          if (typeof delta !== 'undefined')
            otherConn.enqueue('update-state', {'id': id, 'delta': wrap(pathDifference(message.path, otherConn.subs[id]), delta)});
        }(delta));
      });
    });
    console.timeEnd('attempt');
  });
  
  // returns true if testPath is within basePath
  function isChild(testPath, basePath) {
    if (typeof basePath === 'string')
      basePath = basePath.split('.');
    if (typeof testPath === 'string')
      testPath = testPath.split('.');
    
    if (basePath.length === 1)
        return basePath[0] === testPath[0];
    if (testPath.length < basePath.length)
      return false;
    
    return isChild(testPath.splice(1), basePath.splice(1));
  };
  
  // wrap an object in its path
  // e.g. wrap('test.test', obj) returns {'test': {'test': obj}};
  function wrap(path, obj) {
    if (typeof path === 'string')
      path = path.split('.');
      
    var wrapper = {};
    if (path.length === 0)
      return obj;
    wrapper[path[path.length - 1]] = obj;
    if (path.length === 1)
      return wrapper;
      
    return wrap(path.splice(0, path.length - 1), wrapper);
  }
  
  function pathDifference(childPath, parentPath) {
    if (!isChild(childPath, parentPath))
      return null;
      
    return childPath.split('.').splice(parentPath.split('.').length - 1).join('.');
  }

  var that = this;
  var conns = [];
  this.websocketServer.on('connection', function(conn) {
    var wrapped = new ConnWrapper(conn, opts);
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

function ConnWrapper(conn, opts) {
  this.opts = opts || {};
  this.conn = conn;
  this.queue = [];
  this.subs = {};
}

ConnWrapper.prototype.sendObj = function(channel, message) {
  if (this.conn.readyState !== WebSocket.CLOSING && this.conn.readyState !== WebSocket.CLOSED)
    this.conn.send(JSON.stringify({'channel': channel, 'message': message}));
};

ConnWrapper.prototype.enqueue = function(channel, message) {
  if (typeof this.opts.refreshRate === 'undefined')
    this.sendObj(channel, message);
  else
    this.queue.push({'channel': channel, 'message': message});
};
  
ConnWrapper.prototype.sendQueue = function() {
  var that = this;
  this.queue.forEach(function(msg) {
    that.sendObj(msg.channel, msg.message);
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
}