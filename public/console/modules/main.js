requirejs.config({
  'paths': {
    'interact': '/lib/interact-1.2.5',
    'mithril': '/lib/mithril',
    'checkerboard': '/lib/checkerboard',
    'cookies': '/lib/cookies',
    'clientUtil': '/shared/clientUtil'
  }
});

module = null;

define('main', ['exports', 'checkerboard', 'mithril', 'clientUtil', './selector', './playground'], function(exports, checkerboard, m, clientUtil, selector, playground) {  
  var wsAddress = 'ws://' + window.location.hostname + ':' + (clientUtil.parameter('port') || '1808');
  var stm = new checkerboard.STM(wsAddress);
  var selected, classroom = null, device;
  
  stm.init(function(store) {
    stm.action('set-identity')
      .onReceive(function(_classroom) {
        selected = true;
        classroom = _classroom;
        m.redraw();
        store.classrooms[classroom].addObserver(classroomObserver);
        m.mount(document.getElementById('navs'), m.component(playground, store));
        return false;
      });
      
    stm.action('change-name')
      .onReceive(function(name) {
        this.name = name;
      });
    
    stm.action('set-app')
      .onReceive(function(app) {
        this.app = app;
      });
  
    m.mount(document.getElementById('navs'), m.component(selector, store));
    
    var classroomObserver = function(newValue, oldValue) {
      m.redraw();
    };
  });
});