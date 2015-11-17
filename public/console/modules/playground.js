define(['exports', 'mithril'], function(exports, m) {    
  exports.controller = function(store) {
  
  };
  
  exports.view = function(ctrl, store) {
    return m('.container',
      m('.row',
        m('h1.col-md-12', 'ccaf-playground')
      ),
      m('.row', {
        'style': 'height: 80vh',
        },
        m.component(sidebar, store),
        m.component(overhead, store)
      )
    );
  };
  
  var tab = {
    apps:0,
    users:1,
    content:2
  }
  var sidebar = {
    'controller': function(store) {
      return {
        'tab': m.prop(tab.apps)
      };
    },
    'view': function(ctrl, store) {
      return m('.col-md-3.stretch',
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
              m.component(ctrl.tab() == tab.apps ? apps : ctrl.tab() == tab.users ? users : content, store)
            )
          )
        )
      );
    }
  };
  
  
  var overhead = {
    'controller': function(store) {
    
    },
    'view': function(ctrl, store) {
      return m('.col-md-9.stretch', {
          'style': 'margin-top: 42px'
        },
        m('.well.stretch')
      );
    }
  }
  
  var apps = {
    'controller': function(store) {
    
    },
    'view': function(ctrl, store) {
      return m('div.list-group', Object.keys(store.apps).map(function(app) {
          return m('a.list-group-item', m('img', {height: '28px', src: '/apps/' + app + '/' + store.apps[app].icon}), ' ' + store.apps[app].title);
        })
      );
    }
  };
  
  var users = {
    'controller': function(store) {
    
    },
    'view': function(ctrl, store) {
      return m('div', 'users');
    }
  }
  
  var content = {
    'controller': function(store) {
    
    },
    'view': function(ctrl, store) {
      return m('div', 'content');
    }
  }
});