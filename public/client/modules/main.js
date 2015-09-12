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
  var cb;
  ws.onopen = function() {
    cb = new checkerboard(ws);
    cb.get('dir', function(classrooms) {
      console.log(classrooms);
    });
  }
  
  var main = {
    'view': function() {
      return m('div', [
        m.component(cornerMenu)
      ]);
    }
  };
  
  m.mount(document.body, main);
});