var fs = require('fs');
var path = require('path');

var db, config;

db = fs.existsSync(path.resolve(__dirname, 'embedded.db')) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, 'embedded.db'))) : {};
config = fs.existsSync(path.resolve(__dirname, 'server.json')) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, 'server.json'))) : {
  "ports": {
    "http": 1867,
    "ws": 1808,
    "udp": 4000
  },
  "subnet": "255.255.255.0"
};

function saveDB() {
  fs.writeFileSync(path.resolve(__dirname, 'embedded.db'), JSON.stringify(db));
}

var dbInterval = setInterval(saveDB, 60 * 1000);

if (typeof db.classrooms !== 'object' || db.classrooms === null)
    db.classrooms = [];

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
});

addresses.forEach(function(address) {
  console.log('Broadcasting to ' + ip.subnet(address, config.subnet).broadcastAddress);
  setInterval(function() {
    var message = new Buffer(JSON.stringify({'ports': config.ports}));
    dgramClient.send(message, 0, message.length, config.ports.udp, ip.subnet(address, config.subnet).broadcastAddress);
  }, 1000);
});

console.log('UDP port: ' + config.ports.udp);

var assoc = {};
var checkerboard = new (require('checkerboard')).Server(config.ports.ws, db);
var State = checkerboard.state;

console.log('Websocket port: ' + config.ports.ws);

var express = require('express'),
    http = express();

// Set Last-Modified to avoid 304 Not Modified statuses
http.get('/*', function(req, res, next) {
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next();
});

http.get('/', express.static(path.resolve(__dirname, 'client')));
http.use('/', express.static(path.resolve(__dirname)));

http.listen(config.ports.http);

console.log('HTTP port: ' + config.ports.http);

function getApps() {
  var toReturn = {};
  fs.readdirSync(path.resolve(__dirname, 'apps'))
    .filter(function(maybeDir) {
      return fs.statSync(path.resolve(__dirname, 'apps', maybeDir)).isDirectory();
    })
    .forEach(function(dir) {
      toReturn[dir] = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'apps', dir, 'package.json')));
    });
  return toReturn;
}

checkerboard.on('open', function(conn, message) {
  assoc[conn.uuid] = {'classroom': undefined, 'device': undefined};
  conn.state = function(state) {
    var toReturn = {'classrooms': []};

    state('classrooms').forEach(function(classroom) {
      toReturn.classrooms.push({'id': classroom.id, 'props': classroom.props, 'devices': classroom.devices});
    });

    return function() {
      return {
        'merge': function() {
          return toReturn;
        },
        'patch': {},
        'apply': function() {

        }
      };
    };
  };
});

checkerboard.on('data-associate', function(conn, message) {
  assoc[conn.uuid] = {'classroom': message.classroom, 'device': message.device, 'conn': conn};

  conn.state = function(state) {
    return function() {
      var classroom = state.classrooms[state('classrooms').map(function(c) { return c.id; }).indexOf(parseInt(message.classroom))];
      if (typeof classroom.appRoot === 'undefined')
        classroom('appRoot', {});

      if (typeof message.device !== 'undefined') {
        var deviceIndex = classroom('devices').map(function(d) { return d.id; }).indexOf(parseInt(message.device));
        var device = typeof classroom !== 'undefined' ? classroom.devices[deviceIndex] : undefined;

        device('connected', true);

        if (typeof classroom.appRoot[device('app')] === 'undefined' && typeof device('app') !== 'undefined')
          classroom.appRoot(device('app'), {});

        return {
          'merge': function() {
            return {'device': device().merge(), 'global': device('app') in classroom.appRoot ? classroom.appRoot[device('app')]().merge() : {}, 'apps': getApps()};
          },
          'patch': {'device': device().patch, 'global': device('app') in classroom.appRoot ? classroom.appRoot[device('app')]().patch : {}},
          'apply': function(toApply) {
            if (device('app') in classroom.appRoot)
              classroom.appRoot[device('app')]().apply(toApply.global);
            device().apply(toApply.device);
          }
        };
      }
      else {
        return {
          'merge': function() {
            var merged = classroom().merge();
            merged.apps = getApps();
            return merged;
          },
          'patch': classroom().patch,
          'apply': classroom().apply
        };
      }
    };
  };
  conn.refresh();
  Object.keys(assoc).forEach(function(key) {
    if (assoc[key].classroom === message.classroom && typeof assoc[key].device === 'undefined')
      assoc[key].conn.refresh();
  });
});

checkerboard.on('close', function(conn) {
  var savedAssoc = assoc[conn.uuid];
  delete assoc[conn.uuid];
  var classroom = checkerboard.state.classrooms[checkerboard.state('classrooms').map(function(c) { return c.id; }).indexOf(parseInt(savedAssoc.classroom))];
  if (typeof classroom === 'undefined')
    return;

  var device = classroom.devices[classroom('devices').map(function(d) { return d.id; }).indexOf(parseInt(savedAssoc.device))];
  if (typeof device === 'undefined')
    return;

  var lastDevice = true;
  Object.keys(assoc).forEach(function(key) {
    if (assoc[key].classroom === savedAssoc.classroom && assoc[key].device === savedAssoc.device)
      lastDevice = false;
  });

  if (lastDevice)
    device('connected', false);

    Object.keys(assoc).forEach(function(key) {
      if (assoc[key].classroom === savedAssoc.classroom)
        assoc[key].conn.refresh();
    });
});


function exit() {
  clearInterval(dbInterval);

  db = checkerboard.state().merge();

  db.classrooms.forEach(function(classroom) {
    classroom.appRoot = {};
    classroom.devices.forEach(function(device) {
      device.connected = false;
      device.app = undefined;
      device.project = undefined;
    });
  });

  saveDB();
  process.exit();
}

process.on('exit', exit);
process.on('SIGINT', exit);
process.on('uncaughtException', function(err) {
  console.log(err.stack);
});
