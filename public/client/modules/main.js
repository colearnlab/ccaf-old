require.config({
  'paths': {
    'interact': '/lib/interact-1.2.4',
    'mithril': '/lib/mithril',
    'q': '/lib/q.min',
    'checkerboard': '/lib/checkerboard-client'
  }
});

define('main', ['checkerboard', 'mithril', './clientUtil', './selector', './cornerMenu'], function(checkerboard, m, clientUtil, selector, cornerMenu) {
  var ws = new WebSocket('ws://localhost:1808'), cb;
    
  ws.onopen = function() {
    cb = new checkerboard(ws);
    m.mount(document.body, main);
  };
  
  var selected = false;
  var onSelect = function(classroom, device) {
    selected = true;
    cb.subscribe('classrooms.' + classroom + '.devices.' + device + '.app', appChange);
    cb.subscribe('classrooms.' + classroom + '.appRoot', appUpdate);
  }
  
  var appChange = function(appData) {
    requirejs(['/apps/' + appData.path + '/' + appData.client], function(app) {
      
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