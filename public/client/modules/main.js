requirejs.config({
  'paths': {
    'interact': '/lib/interact-1.2.5',
    'mithril': '/lib/mithril',
    'checkerboard': '/lib/diffpatch',
    'cookies': '/lib/cookies',
    'modal': '/client/modules/modal'
  }
});

module = null;

define('main', ['exports', 'checkerboard', 'mithril', './clientUtil', './selector', './cornerMenu', 'cookies', 'modal'], function(exports, checkerboard, m, clientUtil, selector, cornerMenu, cookies, modal) {  
  var ws = new WebSocket('ws://' + window.location.hostname + ':' + (clientUtil.parameter('port') || '1808'));
  var cb;
    
  if (clientUtil.parameter('electron')) {
    require('ipc').send('client-connected');
    require('electron-cookies');
  }
  
  document.body.addEventListener('scroll', function(e) {
     return e.preventDefault(), false;
  });
  
  document.body.addEventListener('touchmove', function(e) {
    if (e.target.tagName !== 'INPUT')
      return e.preventDefault(), false;
  });
  
  ws.onopen = function() {
    exports.cb = root = new checkerboard.STM(ws);
    if (cookies.hasItem('classroom') && cookies.hasItem('device'))
      setIdentity(cookies.getItem('classroom'), cookies.getItem('device'));
    
    m.mount(document.getElementById('navs'), main);
  };
  
  var rec = ws.onclose = function() {
    document.getElementById('app').classList.add('frozen');
    modal.display('Disconnected. Trying to reconnect...');
    document.body.classList.add('disconnected');
    ws = new WebSocket('ws://' + window.location.hostname + ':' + (clientUtil.parameter('port') || '1808'));
    ws.onopen = function() {
      location.reload();
    }
    ws.onerror = rec;
  };
    
  var selected = false, classroom, device, classrooms;
  var resetIdentity = exports.resetIdentity = function() {
    clearApp();
    selected = false;
    app.unsubscribe();
    cookies.removeItem('classroom');
    cookies.removeItem('device');
    classroom = undefined;
    device = undefined;
  };
  var setIdentity = exports.setIdentity = function(_classroom, _device) {
    selected = true;
    classroom = _classroom;
    device = _device;
    cookies.setItem('classroom', classroom);
    cookies.setItem('device', device);
    classrooms = root.subscribe('classrooms', undefined, function(classrooms) {
      modal.display('Connected to:<br>' + classrooms[classroom].name + '<br>' + classrooms[classroom].devices[device].name);
    });
    
    app = root.subscribe('classrooms.' + classroom + '.devices.' + device + '.app', appChange, appChange);
  }
  
  var clearApp = function() {
    document.body.removeChild(document.getElementById('app'));
    var el = document.createElement('div');
    el.id = 'app';
    document.body.appendChild(el);

    var links = document.getElementsByClassName('app-css');
    while(links.length > 0)
        document.head.removeChild(links[0]);

    m.mount(document.getElementById('navs'), main);
  
    appData = undefined;
  };
  
  var appData, appElement, appRoot
  var appChange = function(_appData) {
    if (typeof appData !== 'undefined' && _appData.path === appData.path)
      return;
      
    appData = _appData;
    requirejs(['/apps/' + appData.path + '/' + appData.client], function(app) {
      classrooms.try(function(classrooms) {
          if (typeof classrooms[classroom].appRoot === 'undefined')
            classrooms[classroom].appRoot = {};
          if (typeof classrooms[classroom].appRoot[appData.path] === 'undefined')
            classrooms[classroom].appRoot[appData.path] = {};
        },
        function() {
          classrooms.sync(1000);
          appRoot = classrooms.subscribe(classroom + '.appRoot.' + appData.path, undefined, function() {
            app.startApp(appRoot, document.getElementById('app'),
              {'classroom': classroom, 'device': device});
          });
        });
    });
  };
  
  var main = {
    'view': function() {
      return m('div', [
        m.component(cornerMenu),
        !selected ? m.component(selector) : ''
      ]);
    }
  };
});