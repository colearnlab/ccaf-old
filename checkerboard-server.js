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
  this.on('attempt', function(conn, message) {
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
    var cache = {};
    conns.forEach(function(otherConn) {
      Object.keys(otherConn.subs).forEach(function(id) {
        if (!isChild(message.path, otherConn.subs[id]))
          return;
        var delta;
        if (otherConn.subs[id] in cache)
          delta = cache[otherConn.subs[id]];
        else {
          var a = getByPath(savedState, otherConn.subs[id]);
          var b = getByPath(that.state, otherConn.subs[id]);
          if (!(isPOJS(a) && isPOJS(b)))
            return;
          delta = diff(a, b);
          cache[otherConn.subs[id]] = delta;
        }
        (function(delta) {        
          if (typeof delta !== 'undefined')
            otherConn.enqueue('update-state', {'id': id, 'delta': delta});
        }(delta));
      });
    });
  });
  
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
      conns.splice(conns.indexOf(wrapped), 1);
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
  this.conn = conn;
  this.queue = [];
  this.subs = {};
  this.opts = opts;
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