var fs = require('fs');
var path = require('path');

var db;

db = fs.existsSync(path.resolve(__dirname, 'embedded.db')) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, 'embedded.db'))) : {};

function saveDB() {
  fs.writeFileSync(path.resolve(__dirname, 'embedded.db'), JSON.stringify(db));
}

var dbInterval = setInterval(saveDB, 60 * 1000);

// some defaults
if (typeof db.config !== 'object' || db.config === null)
  db.config = {};

if (typeof db.config.ports !== 'object' || db.config.ports === null)
  db.config.ports = {'http': 1867, 'ws': 1808};

if (typeof db.classrooms !== 'object' || db.classrooms === null)
    db.classrooms = [];

var assoc = {};
var checkerboard = new (require('checkerboard')).Server(db.config.ports.ws, db);
var State = checkerboard.state;

var express = require('express'),
    http = express();

// Set Last-Modified to avoid 304 Not Modified statuses
http.get('/*', function(req, res, next) {
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next();
});

http.get('/', express.static(path.resolve(__dirname, 'client')));
http.use('/', express.static(path.resolve(__dirname)));

http.listen(db.config.ports.http);

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
      };
    };
  };
});

checkerboard.on('data-associate', function(conn, message) {
  assoc[conn.uuid] = {'classroom': message.classroom, 'device': message.device, 'conn': conn};

  if (typeof device !== 'undefined')
    device('connected', true);

  conn.state = function(state) {
    var classroom = state.classrooms[state('classrooms').map(function(c) { return c.id; }).indexOf(parseInt(message.classroom))];
    var device = typeof classroom !== 'undefined' ? classroom.devices[classroom('devices').map(function(d) { return d.id; }).indexOf(parseInt(message.device))] : undefined;

    if (typeof message.device !== 'undefined') {
      return function() {
        var patch = {'device': device().patch, 'global': (typeof device('app') !== 'undefined' ? classroom.appRoot[device('app')].merge() : {}).patch};
        return {
          'merge': function() {
            return {'device': device().merge(), 'global': typeof device('app') !== 'undefined' ? classroom.appRoot[device('app')].merge() : {}};
          },
          'patch': patch
        };
      };
    }
    else {
      return function() {
        var patch = 0;
        return {
          'merge': function() {
            return {};
          },
          'diff': {}
        };
      };
    }
  };
  conn.refresh();
});

checkerboard.on('close', function(conn) {
  var savedAssoc = assoc[conn.uuid];
  delete assoc[conn.uuid];
  var classroom = db.classrooms[db.classrooms.map(function(c) { return c.id; }).indexOf(parseInt(savedAssoc.classroom))];
  if (typeof classroom === 'undefined')
    return;

  var device = classroom.devices[classroom.devices.map(function(d) { return d.id; }).indexOf(parseInt(savedAssoc.device))];
  if (typeof device === 'undefined')
    return;
  device.connected = false;

  var lastDevice = true;
  Object.keys(assoc).forEach(function(key) {
    if (assoc[key].classroom === savedAssoc.classroom && assoc[key].device === savedAssoc.device)
      lastDevice = false;
  });

  if (lastDevice)
    Object.keys(assoc).forEach(function(key) {
      if (assoc[key].classroom === savedAssoc.classroom)
        assoc[key].conn.overwriteState();
    });
});


function exit() {
  clearInterval(dbInterval);

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
