require.config({
  'paths': {
    'interact': '/lib/interact-1.2.4',
    'mithril': '/lib/mithril',
    'q': '/lib/q.min',
    'checkerboard': '/lib/checkerboard-client'
  }
});

define('main', ['checkerboard', 'mithril', './clientUtil', './selector', './cornerMenu'], function(checkerboard, m, clientUtil, selector, cornerMenu) {
  var ws = new WebSocket('ws://localhost:1808');
    
  ws.onopen = function() {
    cb = new checkerboard(ws);
    m.mount(document.body, main);
  };
    
  var selected = false, classroom, device;
  var onSelect = function(_classroom, _device) {
    selected = true;
    classroom = _classroom;
    device = _device;
    cb.subscribe('classrooms.' + classroom + '.devices.' + device + '.app', appChange);
    cb.subscribe('classrooms.' + classroom + '.appRoot', appUpdate);
  }
  
  var appData;
  var appChange = function(_appData) {
    appData = _appData;
    requirejs(['/apps/' + appData.path + '/' + appData.client], function(app) {
      app.startApp(new clientUtil.CheckerboardStem(cb, 'classroom'. + classroom + '.appRoot'));
    });
  }
  
  var appUpdate = function(data, change) {
  
  };
  
  var main = {
    'view': function() {
      return m('div', [
        m.component(cornerMenu),
        !selected ? m.component(selector, {'cb': cb, 'callback': onSelect}) : m('div#app')
      ]);
    }
  };  
});