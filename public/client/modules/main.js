require.config({
  'paths': {
    'interact': '/lib/interact-1.2.4',
    'mithril': '/lib/mithril',
    'q': '/lib/q.min',
    'checkerboard': '/lib/checkerboard-client'
  }
});

define('main', ['checkerboard', 'mithril', './clientUtil', './selector', './cornerMenu'], function(checkerboard, m, clientUtil, selector, cornerMenu) {
  var ws = new WebSocket('ws://' + window.location.hostname + ':' + (clientUtil.parameter('port') || '1808')), cb;
    
  document.body.addEventListener('touchmove', function(e) {
    e.preventDefault();
    return false;
  });
  
  ws.onopen = function() {
    cb = new checkerboard(ws);
    m.mount(document.getElementById('navs'), main);
  };
    
  var selected = false, classroom, device;
  var onSelect = function(_classroom, _device) {
    selected = true;
    classroom = _classroom;
    device = _device;
    cb.subscribe('classrooms.' + classroom + '.devices.' + device + '.app', appChange);
  }
  
  var appData, appElement;
  var appChange = function(_appData, change) {
    if  (typeof change.path === 'undefined')
      return;

    appData = _appData;
    requirejs(['/apps/' + appData.path + '/' + appData.client], function(app) {

      cb.try(function(state) {
        if (typeof state.classrooms[classroom].appRoot === 'undefined')
          state.classrooms[classroom].appRoot = {};
        if (typeof state.classrooms[classroom].appRoot[appData.path] === 'undefined')
          state.classrooms[classroom].appRoot[appData.path] = {};
      }).then(function() {
        cb.sync(500);
        app.startApp(new clientUtil.CheckerboardStem(cb, 'classrooms.' + classroom + '.appRoot.' + appData.path), document.getElementById('app'),
          {'classroom': classroom, 'device': device});
      }).done();
    });
  };
  
  var main = {
    'view': function() {
      return m('div', [
        m.component(cornerMenu),
        !selected ? m.component(selector, {'cb': cb, 'callback': onSelect}) : ''
      ]);
    }
  };  
});