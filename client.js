var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    app.quit();
});

var config = fs.existsSync(path.resolve(__dirname, 'client.json')) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, 'server.json'))) : {
  "ports": {
    "http": 1867,
    "ws": 1808,
    "udp": 4000
  },
  "server": "localhost"
}

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600});

  var dgram = require('dgram');
  var socket = dgram.createSocket('udp4');
  var loaded = false;
  
  socket.on('message', function(buf, info) {
    var message = buf.toJSON();
    if (!loaded && 'ports' in message) {
      mainWindow.loadUrl('http://' + info.address + ':' + message.ports.http + '/?' + message.ports.ws);
      loaded = true;
    }
  });
  socket.bind(config.ports.udp);

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});