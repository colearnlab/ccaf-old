var TUIO = {};
var Client = TUIO.Client = function Client(options) {
  options = options || {};
  this.host = options.host ||'127.0.0.1';
  this.port = options.port || 5000;
  this.connected = false;
  this.sessions = {};
  this.cursors = {};
  this.objects = {};
  this.blobs = {};
  this.touches = {};
  this.touchList = document.createTouchList();

  var self = this;

  if (parameter('electron')) {
    var ipc = require('ipc');
    ipc.on('tuio', function(data) {
      self.processMessage(data);
    });
  }
};

Client.prototype.processMessage = function(packet){
  var cursorTypes = {
    'source': this.processCursorSource,
    'alive': this.processCursorAlive,
    'set': this.processCursorSet,
    'fseq': this.processFseq
  };

  // Ignore duplicate packets for now
  if (!packet.duplicate){
    packet.source = 'localhost';

    for (var message in packet.messages) {
      var key = packet.messages[message].type;
      switch (packet.messages[message].profile) {
          case "/tuio/2Dcur":
          case "/tuio/25Dcur":
          case "/tuio/3Dcur":
            (cursorTypes[key]).call(this, packet, packet.messages[message]);
            break;
      }
    }
  }
};

Client.prototype.processCursorSource = function(client, packet, message){
  packet.source = message.address;
  if (this.cursors[packet.source] === undefined){
    this.cursors[packet.source] = {};
  }

  if (this.touches[packet.source] === undefined){
    this.touches[packet.source] = {};
  }
};

Client.prototype.processCursorAlive = function(packet, message){
  if (this.cursors[packet.source] === undefined){
    this.cursors[packet.source] = {};
  }

  if (this.touches[packet.source] === undefined){
    this.touches[packet.source] = {};
  }

  // Remove the non-active cursors from the cursor namespace
  var notActiveCursors = [];
  for (var prop in this.cursors[packet.source])
    if (message.sessionIds.indexOf(parseInt(prop)) < 0)
        notActiveCursors.push(prop);

  for (var i = 0; i < notActiveCursors.length; i++){
    var key = notActiveCursors[i];
    var touch = this.touches[packet.source][key];

    if (touch !== undefined){
      delete this.touches[packet.source][key];
      delete this.cursors[packet.source][key];
      this.createTouchEvent('touchend', touch);
    }
  }
};

Client.prototype.processCursorSet = function(packet, message){
  var cursor = new TuioCursor(message);
  var touch = cursor.coherceToTouch();
  var id = message.sessionId.toString();

  if (this.cursors[packet.source][id] !== undefined && this.cursors[packet.source][id].sessionId.toString() === id){

    // Existing cursor so we update it
    this.cursors[packet.source][id] = cursor;

    // Find existing touch in touches hash, replace it with the
    // updated touch and then create a 'touchmove' event
    if (this.touches[packet.source][id] !== undefined && this.touches[packet.source][id].identifier.toString() === id){
      this.touches[packet.source][id] = touch;
      this.createTouchEvent('touchmove', touch);
      // console.log('UPDATE', this.cursors, this.touches);

      return;
    }
    return;
  }

  // New cursor
  this.cursors[packet.source][id] = cursor;
  this.touches[packet.source][id] = touch;

  this.createTouchEvent('touchstart', touch);
  // console.log('SET', this.cursors[packet.source], this.touches[packet.source]);
};

Client.prototype.processFseq = function(packet, message){
  // TODO: Figure out what to do with fseq messages.
};

Client.prototype.getCursor = function(sessionID){
  return this.cursors[sessionId];
};

Client.prototype.getCursors = function(){
  return this.cursors;
};

// Create our custom TouchEvent
Client.prototype.createTouchEvent = function(type, touch){

  // Get all currently active touches so they can be attached
  // to the touchEvent
  var touches = [];

  // Convert touches hash to array because that's what W3C says
  // it should be.
  // TODO: Find a better way! This is super efficient, NOT!
  for (var namespace in this.touches){
    for (var key in this.touches[namespace]){
      touches.push(this.touches[namespace][key]);
    }
  }

  // Get the touches that started on the attribute so they can
  // be attached to the touchEvent
  var targetTouches = document.createTouchList.apply(document, touches.filter(function(otouch) { return otouch.target == touch.target; }));

  // Get the touches that contributed to the event so they can
  // be attached to the touchEvent
  var changedTouches = document.createTouchList.apply(document, [touch]);

  // This is used in place of document.createEvent('TouchEvent');
  // because almost all browsers except for Firefox at the moment
  // do not support it.
  console.log(type);
  var touchEvent = new Event(type, {'bubbles': true, 'cancelable': true});

  touchEvent.touches = touches;
  touchEvent.targetTouches = targetTouches;
  touchEvent.changedTouches = changedTouches;
  touchEvent.type = type;
  touchEvent.view = touch.view || null;
  touchEvent.layerX = touch.screenX;
  touchEvent.layerY = touch.screenY;
  touchEvent.pageX = touch.clientX;
  touchEvent.pageY = touch.clientY;
  touchEvent.target = touch.target || document.body;

  // Dispatch the event
  if (touch.target) {
    touch.target.dispatchEvent(touchEvent);
    if ((touch.target.getAttribute('data-click-state') === null || touch.target.getAttribute('data-click-state') === 'passive') && type === 'touchstart') {
      var mousedown = new Event('mousedown', {'bubbles': true, 'cancelable': true});
      mousedown.target = touch.target;
      touch.target.dispatchEvent(mousedown);
      touch.target.setAttribute('data-click-state', 'pressed');
    }
    else if (touch.target.getAttribute('data-click-state') === 'pressed' && type === 'touchend') {
      var mouseup = new Event('mouseup', {'bubbles': true, 'cancelable': true});
      var click = new Event('click', {'bubbles': true, 'cancelable': true});
      mouseup.target = click.target = touch.target;
      touch.target.dispatchEvent(mouseup);
      touch.target.dispatchEvent(click);
      touch.target.setAttribute('data-click-state', 'passive');
    }
  }
  else {
    var val = document.dispatchEvent(touchEvent);
  }

  //console.log(JSON.stringify(touchEvent));
};

/**
 * A TUIO Cursor Object
 */
var TuioCursor = TUIO.TuioCursor = function TuioCursor(options){
  for (var key in options){
    this[key] = options[key];
  }
};

TuioCursor.prototype.coherceToTouch = function() {
  var identifier = this.sessionId;

  //TODO: Verify? I think these are correct but not 100% sure
  var clientX = window.innerWidth * this.xPosition;
  var clientY = window.innerHeight * this.yPosition;
  var pageX = document.documentElement.clientWidth * this.xPosition;
  var pageY = document.documentElement.clientHeight * this.yPosition;
  var target = document.elementFromPoint(pageX, pageY);
  var screenX = screen.width * this.xPosition;
  var screenY = screen.height * this.yPosition;
  var radiusX = this.radius || 0;
  var radiusY = this.radius || 0;
  var rotationAngle = this.rotationAngle || 0;
  var force = this.force || 0;

  return document.createTouch(window, target, identifier, clientX, clientY, pageX, pageY, screenX, screenY, radiusX, radiusY, rotationAngle, force);
};
