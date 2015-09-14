(function() {
  var Q = (typeof window !== 'undefined' ? window.Q : undefined), jsondiffpatch;
  function Checkerboard(conn) {
    var state = this.state = {};
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
      'data-get-returned': function(message) {
        gets[message.id](message.data);
      },
      'data-attempts-returned': function(message) {
        var i;
        for (i = 0; i < attempts.length; i++) {
          if (!(attempts[i].id <= message.lastAttempt))
            break;
          attempts[i].deferred.resolve(state.proxy);
        }
        for (var j = attempts.length - 1; j >= i; j--)
          jsondiffpatch.unpatch(state, attempts[j].patch);
          
        attempts.splice(0, i);
        waitingForReturn = false;
      },
      'data-uuid': function(message) {
        if (typeof message.uuid !== 'undefined')
          uuid = message.uuid;
      },
      'data-update-state': function(message) {
        var savedState = JSON.parse(JSON.stringify(state));
        jsondiffpatch.patch(state, message.patch);
        var s;
        for (var prop in subs)
          if (jsondiffpatch.diff(getByPath(savedState, prop), s = getByPath(state, prop)))
            subs[prop](s);
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
    var getIdentifier = 0;
    var subs = {}, gets = [];
    
    this.get = function(path, callback) {
      gets[++getIdentifier] = callback;
      this.send('data-get', {'path': path, 'id': getIdentifier});
    };
    
    this.subscribe = function(path, callback) {
      this.send('data-subscribe', {'path': path});
      subs[path] = callback;
    };
    
    this.unsubscribe = function(path, callback) {
      this.send('data-unsubscribe', {'path': path});
      delete subs[path];
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
      var savedState = JSON.parse(JSON.stringify(state));
      for (var i = 0; i < attempts.length; i++) {
        attempts[i].callback(state);
        attempts[i].diff = {};
        attempts[i].patch = jsondiffpatch.diff(savedState, state);
        
        if (typeof attempts[i].patch !== 'undefined') {
          attempts[i].id = transactionId++
          tryableAttempts.push(attempts[i]);
        } else {
          attempts[i].deferred.resolve(state);
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
  
  if (typeof define !== 'undefined')
    define('checkerboard', ['q', 'jsondiffpatch'], function(_Q, _jsondiffpatch) { Q = _Q; jsondiffpatch = _jsondiffpatch; return Checkerboard; });
  else
    window.Checkerboard = Checkerboard;
})();