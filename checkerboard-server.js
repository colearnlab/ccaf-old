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
    console.time('attempt');
    var savedState = JSON.parse(JSON.stringify(that.state));
    var successes = message.attempts.filter(function(attempt) {
      if (patch(getByPath(that.state, message.path), attempt.delta)) {
        return true;
      }
      patch(getByPath(that.state, message.path), attempt.delta)
      return false;
    }).map(function(attempt) {
      return attempt.id;
    });
    var delta = diff(getByPath(savedState, message.path), getByPath(that.state, message.path), false);
    var wrapped = wrap(delta, message.path);
    conn.sendObj('attempt-returned', {'id': message.id, 'successes': successes, 'delta': getByPath(wrapped, message.path)});
    var cache = {};

    conns.forEach(function(otherConn) {
      Object.keys(otherConn.subs).forEach(function(id) {
        if (otherConn === conn && otherConn.subs[id] === message.path)
          return;
        var subdelta;
        if (otherConn.subs[id] in cache)
          subdelta = cache[otherConn.subs[id]];
        else {
          subdelta = getByPath(wrapped, otherConn.subs[id]);
          cache[otherConn.subs[id]] = subdelta;
        }
        (function(subdelta) {        
          if (subdelta !== null && typeof subdelta !== 'undefined') {
            otherConn.enqueue('update-state', {'id': id, 'delta': subdelta});
          }
        }(subdelta));
      });
    });
        console.timeEnd('attempt');

  });
  
  function wrap(obj, path, root) {
    if (typeof root === 'undefined')
      root = {};
    
    var c = path.split('.');
    if (c.length === 1) {
      root[c[0]] = obj;
      return;
    }
    
    root[c[0]] = {};
    wrap(obj, c.splice(1).join('.'), root[c[0]]);
    
    return root;
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