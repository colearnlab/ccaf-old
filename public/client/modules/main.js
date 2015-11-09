requirejs.config({
  'paths': {
    'interact': '/lib/interact-1.2.5',
    'mithril': '/lib/mithril',
    'checkerboard': '/lib/checkerboard',
    'cookies': '/lib/cookies',
    'modal': '/client/modules/modal'
  }
});

module = null;

define('main', ['exports', 'checkerboard', 'mithril', './clientUtil', './selector', './cornerMenu', 'cookies', 'modal'], function(exports, checkerboard, m, clientUtil, selector, cornerMenu, cookies, modal) {  
  var wsAddress = 'ws://' + window.location.hostname + ':' + (clientUtil.parameter('port') || '1808');
  var stm = new checkerboard.STM(wsAddress);
  var selected, classroom = null, device = null;
  var _store;
  
  stm.action('set-identity')
    .onReceive(function(_classroom, _device) {
      selected = true;
      classroom = _classroom;
      device = _device;
      m.redraw();
      this.classrooms[classroom].devices[device].addObserver(deviceObserver);
      return false;
    });
  
  var deviceObserver, loadApp;
  stm.init(function(store) {
    m.mount(document.getElementById('navs'), m.component(main, store));
    
    deviceObserver = function(newValue, oldValue) {
      if (oldValue === null || newValue.app !== oldValue.app) {
        loadApp(newValue.app);
      }
    };
    
    loadApp = function(app) {
      var actionProxy = function(action) {
        return stm.action(action);
      };
      
      requirejs(['/apps/' + app + '/' + store.apps[app].client], function(appModule) {
        var params = {
          'device': device
        };
        appModule.load(document.getElementById('app'), actionProxy, store.classrooms[classroom].appRoot[app], params);
      });
    };
  });
  
  var main = {
    'view': function(args, store) {
      return m('div', [
        m.component(cornerMenu),
        !selected ? m.component(selector, store) : ''
      ]);
    }
  };
});