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

define('main', ['exports', 'checkerboard', 'mithril', 'clientUtil', './selector'], function(exports, checkerboard, m, clientUtil, selector, cookies) {  
  var wsAddress = 'ws://' + window.location.hostname + ':' + (clientUtil.parameter('port') || '1808');
  var stm = new checkerboard.STM(wsAddress);
  var selected, classroom = null, device;
  var _store;
  
  stm.action('set-identity')
    .onReceive(function(_classroom) {
      selected = true;
      classroom = _classroom;
      m.redraw();
      this.classrooms[classroom].addObserver(classroomObserver);
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
  
  var classroomObserver, loadApp;
  stm.init(function(store) {
    m.mount(document.getElementById('navs'), m.component(main, store));
    
    classroomObserver = function(newValue, oldValue) {
      m.redraw();
    };
  });
  
  var main = {
    'view': function(ctrl, store) {
      return m('div', [
        !selected ? m.component(selector, store) : m.component(debug, store)
      ]);
    }
  };
  
  var debug = {
    'view': function(ctrl, store) {
      var devices = store.classrooms[classroom].devices;
      return (
        m('.container', 
          m('ul', Object.keys(devices).map(function(i) {
            return m.component(deviceComponent, {'device': devices[i], 'apps': store.apps});
          }))
        )
      );
    }
  }
  
  var deviceComponent = {
    'controller': function(device) {
    
    },
    'view': function(ctrl, args) {
      var device = args.device;
      var apps = args.apps;
      return (
        m('div',
          m('input', {
            'oninput': function(e) {
                device.sendAction('change-name', e.target.value);
              },
              'value': device.name
            }),
          m('select', {
              'onchange': function(e) {
                device.sendAction('set-app', e.target.value);
              }
            }, Object.keys(apps).map(function(app) {
              return m('option', {
                'selected': app === device.app
              }, app);
            }))
        )
      );
    }
  };
});