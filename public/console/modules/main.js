requirejs.config({
  'paths': {
    'interact': '/lib/interact-1.2.5',
    'mithril': '/lib/mithril',
    'checkerboard': '/lib/checkerboard',
    'cookies': '/lib/cookies',
    'clientUtil': '/shared/clientUtil',
    'underscore': '/lib/underscore'
  },
  'shim': {
    'underscore': {
      'exports': '_'
    }
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
        m.mount(document.getElementById('navs'), m.component(playground, {'store': store, 'classroom': classroom}));
        window.addEventListener('resize', m.redraw);
        return false;
      });
      
    stm.action('init')
      .onReceive(function() {
        this.classrooms = this.classrooms || {};
        for (c in this.classrooms) {
          var classroom = this.classrooms[c];
          classroom.configuration = classroom.configuration || {};
          classroom.configuration.instances = classroom.configuration.instances || {};
          classroom.users = classroom.users || {};
        }
      });
  
    stm.action('create-instance')
      .onReceive(function(app, el) {
        var cur = this.classrooms[classroom];
        var i = -1, j = 1;
        while (++i in cur.configuration.instances);
        Object.keys(cur.configuration.instances)
          .map(function(p) { return cur.configuration.instances[p]; })
          .forEach(function(instance) { 
            if (instance.app === app) {
              var num;
              if (parseInt(instance.title[instance.title.length - 1]) !== NaN) {
                if (parseInt(instance.title[instance.title.length - 2]) !== NaN)
                  num = parseInt(instance.title.slice(instance.title.length - 2));
                else
                  num = parseInt(instance.title.slice(instance.title.length - 1));
              
                if (num && num >= j)
                  j = num + 1;
              }
            }
          });
        var k = cur.configuration.instances[i] = {'app': app, 'title': store.apps[app].title + ' ' + j, 'x': getCoords(el).x, 'y': getCoords(el).y};   
      });
      
    stm.action('set-coords')
      .onReceive(function(el) {
        this.x = getCoords(el).x;
        this.y = getCoords(el).y;
      });
      
    stm.action('delete-instance')
      .onReceive(function(id) {
        delete this[id];
      });
    
    store.sendAction('init');
    
    m.mount(document.getElementById('navs'), m.component(selector, store));
    
    m.redraw.strategy('all');
    var classroomObserver = function(newValue, oldValue) {
      m.redraw(true);
    };
  });
  
  function getCoords(el) {
    var overhead = document.getElementById('overhead');
    return {
      'x': el.getAttribute('data-x') / overhead.offsetWidth,
      'y': el.getAttribute('data-y') / overhead.offsetHeight
    };
  }
});