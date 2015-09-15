requirejs.config({
  'paths': {
    'interact': '/lib/interact-1.2.5',
    'mithril': '/lib/mithril',
    'q': '/lib/q.min',
    'checkerboard': '/lib/checkerboard-client',
    'jsondiffpatch': '/lib/jsondiffpatch',
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
  
  document.body.addEventListener('touchmove', function(e) {
    if (e.target.tagName !== 'INPUT')
      return e.preventDefault(), false;
  });
  
  ws.onopen = function() {
    exports.cb = cb = new checkerboard(ws);
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
    
  var selected = false, classroom, device;
  var resetIdentity = exports.resetIdentity = function() {
    clearApp();
    selected = false;
    cb.unsubscribe('classrooms.' + classroom + '.devices.' + device + '.app', appChange);
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
    cb.get('classrooms', function(classrooms) {
      modal.display('Connected to:<br>' + classrooms[classroom].name + '<br>' + classrooms[classroom].devices[device].name);
    });
    cb.get('classrooms.' + classroom + '.devices.' + device + '.app', function(data) {
      appChange(data);
      cb.subscribe('classrooms.' + classroom + '.devices.' + device + '.app', appChange);
    });
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
  
    appData = {};
  };
  
  var appData, appElement;
  var appChange = function(_appData) {
    if (typeof appData !== 'undefined' && _appData.path === appData.path)
      return;
      
    appData = _appData;
    requirejs(['/apps/' + appData.path + '/' + appData.client], function(app) {

      cb.try(function(state) {
        if (typeof state.classrooms[classroom].appRoot === 'undefined')
          state.classrooms[classroom].appRoot = {};
        if (typeof state.classrooms[classroom].appRoot[appData.path] === 'undefined')
          state.classrooms[classroom].appRoot[appData.path] = {};
      }).then(function() {
        cb.sync(250);
        app.startApp(new clientUtil.CheckerboardStem(cb, 'classrooms.' + classroom + '.appRoot.' + appData.path), document.getElementById('app'),
          {'classroom': classroom, 'device': device});
      }).done();
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