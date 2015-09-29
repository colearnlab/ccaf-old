var fs = require('fs');
var path = require('path');

var db = fs.existsSync(path.resolve(__dirname, 'embedded.db')) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, 'embedded.db'))) : {};
var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'server.json')));

function saveDB() {
  fs.writeFileSync(path.resolve(__dirname, 'embedded.db'), JSON.stringify(db));
}

var dbInterval = setInterval(saveDB, 60 * 1000);

var os = require('os');
var ifaces = os.networkInterfaces();
var addresses = [];

Object.keys(ifaces).forEach(function (ifname) {
  ifaces[ifname].forEach(function (iface, index) {
    if ('IPv4' === iface.family && iface.internal === false)
      addresses.push(iface.address);
  });
});

console.log('This server\'s address(es): ' + addresses);

var dgram = require('dgram');
var ip = require('ip');
var dgramClient = dgram.createSocket('udp4');
dgramClient.bind(config.ports.udp, function() {
  dgramClient.setBroadcast(true);
  dgramClient.setMulticastTTL(128);
  console.log('UDP port: ' + config.ports.udp);
});

addresses.forEach(function(address) {
  console.log('Broadcasting to ' + ip.subnet(address, config.subnet).broadcastAddress);
  setInterval(function() {
    var message = new Buffer(JSON.stringify({'ports': config.ports}));
    dgramClient.send(message, 0, message.length, config.ports.udp, ip.subnet(address, config.subnet).broadcastAddress);
  }, 150);
});

var checkerboard = new (require('./checkerboard-server')).Server(config.ports.ws, db, {refreshRate:10});
console.log('Websocket port: ' + config.ports.ws);

var connect = require('connect');
var app = connect();

app.use(function(req, res, next){ 
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next(); 
}).use('/', connect.static(__dirname + '/public/client')).use(connect.static(__dirname + '/public')).listen(config.ports.http);

console.log('HTTP port: ' + config.ports.http);

function exit() {
  clearInterval(dbInterval);
  saveDB();
  process.exit();
}

process.on('exit', exit);
process.on('SIGINT', exit);
process.on('uncaughtException', function(err) {
  console.log(err.stack);
});
