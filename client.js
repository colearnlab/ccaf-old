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

var tuio = new (require('caress-server'))('0.0.0.0', 3333, {'json': true});
var ipc = require('ipc')

tuio.on('tuio', function(data) {
  ipc.send('tuio', data);
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
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

  var dgram = require('dgram');
  var socket = dgram.createSocket('udp4');
  var loaded = false;

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
    }
  }, 0000);

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
