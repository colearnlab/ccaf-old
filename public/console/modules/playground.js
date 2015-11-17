define(['exports', 'mithril', 'interact'], function(exports, m, interact) {    
  exports.controller = function(args) {
  
  };
  
  exports.view = function(ctrl, args) {
    return m('.container',
      m('.row',
        m('h1.col-md-12', 'ccaf-playground')
      ),
      m('.row', {
        'style': 'height: 80vh',
        },
        m.component(sidebar, args),
        m.component(overhead, args)
      )
    );
  };
  
  var tab = {
    apps:0,
    users:1,
    content:2
  }
  var sidebar = {
    'controller': function(args) {
      return {
        'tab': m.prop(tab.apps)
      };
    },
    'view': function(ctrl, args) {
      return m('.col-xs-3.col-sm-3.col-md-3.stretch',
        m('ul.nav.nav-tabs',
          m('li' + (ctrl.tab() == tab.apps ? '.active' : ''), {
            'onclick': function() {
                ctrl.tab(tab.apps);
              }
            },
            m('a', "Apps")
          ),
          m('li' + (ctrl.tab() == tab.users ? '.active' : ''), {
            'onclick': function() {
                ctrl.tab(tab.users);
              }
            },
            m('a', "Users")
          ),
          m('li' + (ctrl.tab() == tab.content ? '.active' : ''), {
            'onclick': function() {
                ctrl.tab(tab.content);
              }
            },
            m('a', "Content")
          )
        ),
        m('.tab-content.stretch',
          m('.tab-pane.active.stretch',
            m('.panel.panel-default.stretch', {
                'style': 'border-top: 0'
              },
              m.component(ctrl.tab() == tab.apps ? apps : ctrl.tab() == tab.users ? users : content, args)
            )
          )
        )
      );
    }
  };
  
  
  var overhead = {
    'controller': function(args) {
    
    },
    'view': function(ctrl, args) {
      var store = args.store;
      return m('.col-xs-9.col-sm-9.col-md-9.stretch', {
          'style': 'margin-top: 42px'
        },
        m('.well.stretch#overhead', 
          Object.keys(store.classrooms[args.classroom].configuration.instances)
            .map(function(i) {
              return m.component(movableIcon, {'store': store, 'instanceId': i, 'instance': store.classrooms[args.classroom].configuration.instances[i]});
            })
        )
      );
    }
  };
  
  function isInWell(el) {
    var overhead = document.getElementById('overhead');
    if (!overhead)
      return;
      
    var outerRect = overhead.getBoundingClientRect();
    var innerRect = el.getBoundingClientRect();
    
    return innerRect.top >= outerRect.top && innerRect.bottom <= outerRect.bottom && innerRect.left >= outerRect.left && innerRect.right <= outerRect.right;
  };
  
  var apps = {
    'controller': function(args) {
      var store = args.store;
      interact('.createIcon')
        .draggable({
          'onstart': function(event) {
            var el = document.createElement('span');
            var rect = document.getElementById('overhead').getBoundingClientRect();
            el.setAttribute('data-x', event.pageX - 32 - rect.left);
            el.setAttribute('data-y', event.pageY - 32 - rect.top);
            m.render(el, m.component(movableIcon, {'store': store, 'app': event.target.getAttribute('data-app-path')}));
            el.classList.add('createIcon');
            el.style['top'] = 0;
            el.style['left'] = 0;
            el.style['position'] = 'absolute';
            document.getElementById('overhead').appendChild(el);
            event.target.childComponent = el;
          },
          'onmove': function(event) {
            var target = event.target.childComponent;
            var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            // translate the element
            target.style.webkitTransform =
            target.style.transform =
              'translate(' + x + 'px, ' + y + 'px)';

            // update the posiion attributes
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
          },
          'onend': function(event) {
            if (isInWell(event.target.childComponent))
              store.sendAction('create-instance', event.target.getAttribute('data-app-path'), event.target.childComponent);
            
            event.target.childComponent.parentNode.removeChild(event.target.childComponent);
            event.target.childComponent = null;
          }
        });
        
      interact('.movableIcon')
        .draggable({
          'onmove': function(event) {
            var target = event.target;
            var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
            
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
            
            target.style.opacity = isInWell(target) ? 1 : 0.5;
            
            store.classrooms[args.classroom].configuration.instances[event.target.getAttribute('data-instance-id')].sendAction('set-coords', event.target);
          },
          'onend': function(event) {
            var target = event.target;
            target.style.opacity = 1;
            if (!isInWell(target))
              store.classrooms[args.classroom].configuration.instances.sendAction('delete-instance', target.getAttribute('data-instance-id'));
          }
        });
    },
    'view': function(ctrl, args) {
      var store = args.store;
      return m('div.list-group', Object.keys(store.apps).map(function(app) {
          return m('a.list-group-item.createIcon', {
            'data-app-path': app
          }, m('img', {height: '32px', src: '/apps/' + app + '/' + store.apps[app].icon}), ' ' + store.apps[app].title);
        })
      );
    }
  };
  
  var movableIcon = {
    'controller': function(args) {
    
    },
    'view': function(ctrl, args) {
      var store = args.store;
      var overhead = document.getElementById('overhead');
      
      if ('app' in args)
        return m('img', {'src': '/apps/' + args.app + '/' + store.apps[args.app].icon});
      
      var instance = args.instance;
      return m('div.movableIcon', {
        'data-instance-id': args.instanceId,
        'style': 'top: 0; left: 0; position: absolute',
        'config': function(el) {
            var overhead = el.parentNode;
            var x = instance.x * overhead.offsetWidth;
            var y = instance.y * overhead.offsetHeight;
            el.setAttribute('data-x', x);
            el.setAttribute('data-y', y);
            el.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
          },
       }, m('img', {'style': 'display: block; margin: 0 auto;', 'src': '/apps/' + instance.app + '/' + store.apps[instance.app].icon}), instance.title
      );
    }
  };
  
  var users = {
    'controller': function(args) {
    
    },
    'view': function(ctrl, args) {
      return m('div', 'users');
    }
  };
  
  var content = {
    'controller': function(args) {
    
    },
    'view': function(ctrl, args) {
      return m('div', 'content');
    }
  };
});