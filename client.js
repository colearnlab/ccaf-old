var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    app.quit();
});

var fs = require('fs');
var path = require('path');
var config = fs.existsSync(path.resolve(__dirname, 'client.json')) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, 'client.json'))) : {
  "ports": {
    "http": 1867,
    "ws": 1808,
    "udp": 8088
  },
  "server": "localhost"
};

var tuio = new (require('epictuio'))({'oscHost': '0.0.0.0', 'oscPort': 3333, 'raw': true});
tuio.on('raw', function(data) {
if (loaded)
  mainWindow.webContents.send('tuio', new Bundle(data.slice(2, data.length)));
});

function Bundle(data) {
  this.bundle = true;
  this.duplicate = false;
  this.messages = [];
  for (var i = 0; i < data.length; i++)
    this.messages.push(new Message(data[i]));
}

function Message(data) {
  this.profile = data[0];
  this.type = data[1];
  switch(this.type) {
    case 'alive':
      this.sessionIds = data.slice(2, data.length);
      break;
     case 'source':
      console.log(data);
      break;
     case 'set':
      this.sessionId = data[2];
      this.xPosition = data[3];
      this.yPosition = data[4];
      this.force = data[7];
      break;
  }
}

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
var loaded = false;
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
   // 'always-on-top': true,
   // 'resizeable': false,
   // 'fullscreen': true,
   // 'frame': false,
   // 'kiosk': true
  });
  mainWindow.on('page-title-updated', function(e) {
    mainWindow.close();
  });

mainWindow.webContents.on('did-finish-load', function() {
    mainWindow.webContents.send('tuio', 'hi');

  });

  var dgram = require('dgram');
  var socket = dgram.createSocket('udp4');

  socket.on('message', function(buf, info) {
    var message = JSON.parse(buf.toString());
    if (!loaded && 'ports' in message) {
      mainWindow.loadUrl('http://' + info.address + ':' + message.ports.http + '/?port=' + message.ports.ws + '&electron=1');
      loaded = true;
    }
  });

  socket.bind(config.ports.udp);
  socket.on('listening', function() {
    socket.setBroadcast(true);
  });

  setTimeout(function() {
    if (!loaded) {
      mainWindow.loadUrl('http://' + config.server + ':' + config.ports.http + '/?port=' + config.ports.ws + '&electron=1');
      loaded = true;
    }
  }, 0000);

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
