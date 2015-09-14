(function() {

  var WebSocket = require('./node_modules/ws/index.js');
  var jsondiffpatch = require('jsondiffpatch');

  module.exports.createServer = function(port, inputState, refreshRate) {
    var Event = new (require('events').EventEmitter)();

    if (typeof port === 'undefined')
      throw new Error('No port specified.');

    var WebSocketServer = new WebSocket.Server({'port': port});

    var state = inputState || {};

    // external
    Event.state = state;
    Event.WebSocketServer = WebSocketServer;

    var conns = [];

    Event.on('open', function(conn, message) {
      do {
        conn.uuid = uuid();
      } while(conns.map(function(c) { return c !== conn ? c.uuid : undefined; }).indexOf(conn.uuid) > 0);

      conn.sendObj('data-uuid', {'uuid': conn.uuid});
    });
    
    Event.on('close', function(conn) {
      conns.splice(conns.indexOf(conn), 1);
    });
    
    Event.on('data-get', function(conn, message) {
      conn.sendObj('data-get-returned', {'data': getByPath(state, message.path), 'id': message.id});
    });

    Event.on('data-attempt-state', function(conn, message) {
      var lastAttempt;
      var oldState = JSON.parse(JSON.stringify(state));
      conn.attempting = true;
      var someFailed = message.attempts.some(function(attempt) {
        if (true) {
          lastAttempt = attempt.id;
          jsondiffpatch.patch(state, attempt.patch);
          return false;
        }
        else
          return true;
      });
      conn.sendObj('data-attempts-returned', {'lastAttempt': lastAttempt});
      conn.attempting = false;
      
      var diff = jsondiffpatch.diff(oldState, state);
      for (var i = 0; i < conns.length; i++) {
        for (var j = 0; j < conns[i].subs.length; j++) {
          if (getByPath(diff, conns[i].subs[j]) !== null)
            conns[i].sendObj('data-update-state', {'patch': diff});
        }
      }
    });
    
    Event.on('data-subscribe', function(conn, message) {
      conn.subs.push(message.path);
      conn.sendObj('data-update-state', {'patch': jsondiffpatch.diff({}, state)});
    });
    
    Event.on('data-unsubscribe', function(conn, message) {
      conn.subs.splice(conn.subs.indexOf(message.path), 1);
    });

    WebSocketServer.on('connection', function(conn) {
      conn.sendObj = function(channel, message) {
        if (conn.readyState !== WebSocket.CLOSING && conn.readyState !== WebSocket.CLOSED)
          conn.send(JSON.stringify({'channel': channel, 'message': message}));
      };
      conn.queue = [];
      conn.enqueue = function(channel, message) {
        if (typeof refreshRate === 'undefined')
          conn.sendObj(channel,message);
        else
          conn.queue.push({'channel': channel, 'message': message});
      }
      
      conn.sendQueue = function() {
        conn.queue.forEach(function(msg) {
          conn.sendObj(msg.channel, msg.message);
        });
        conn.queue.splice(0, conn.queue.length);
      }
      
      conn.subs = [];
      conns.push(conn);

      Event.emit('open', conn);

      conn.on('message', function(json) {
        var envelope = JSON.parse(json);
        if (typeof envelope.channel !== 'undefined')
          Event.emit(envelope.channel, conn, envelope.message);
      });

      conn.on('close', function() {
        Event.emit('close', conn);
      });
    });
    
    if (typeof refreshRate !== 'undefined') {
      setInterval(function() {
        conns.forEach(function(conn) {
          conn.sendQueue();
        });
      }, refreshRate);
    }
    return Event;
  };
  
  function isPOJS(prop) {
    return !(
      prop instanceof Date ||
      prop instanceof RegExp ||
      prop instanceof String ||
      prop instanceof Number) &&
      typeof prop === 'object' &&
      prop !== null;
  }
   
  function getByPath(obj, keyPath){ 
   
      var keys, keyLen, i=0, key;
   
      obj = obj || window;      
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

  // http://stackoverflow.com/a/2117523
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }
}());
