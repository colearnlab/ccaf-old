var App = (function(){
  var App = {
    'controller': function() {
      var pages = m.prop([]);

      // page format: {'title': 'Select a classroom', 'href': '/', 'controller': ClassroomSelect}
      var addPage = function(page) {
        m.startComputation();

        if (page instanceof Array)
          for (var i = 0; i < page.length; i++)
            pages().push(page[i]);
        else if (typeof page !== 'undefined')
          pages().push(page);

        m.endComputation();
      };

      var removePage = function(href) {
        pages().splice(pages().map(function(page) { return page.href; }).indexOf(href), 1);
      };

      var interval = setInterval(function() {
        if (conn.readyState === conn.OPEN) {
          clearInterval(interval);
          stm.send('data-associate', {'classroom': m.route.param('classroom'), 'device': m.route.param('device')});
          associated = true;
          addPage({'title': 'Classroom', 'href': '', 'controller': Home});
        }
      }, 100);

      var loadedApps = [];
      stm.on('change', function(state) {
        state('devices').map(function(d) { return d.app; }).forEach(function(app) {
          if (loadedApps.indexOf(app) === -1 && typeof state.apps(app) !== 'undefined' && 'admin' in state.apps(app)) {
            addPage({'title': state.apps(app).title, 'href': app, 'config': m.route, 'controller': AppTab});
            loadedApps.push(app);
          }
        });

        loadedApps.forEach(function(app, index) {
          if (state('devices').map(function(d) { return d.app; }).indexOf(app) === -1) {
            removePage(app);
            loadedApps.splice(index, 1);
          }
        });
      });
      return {
        'pages': pages,
        'addPage': addPage,
        'removePage': removePage,
      };
    },
    'view': function(ctrl) {
      var index = typeof m.route.param('subpage') === 'undefined' ? '' : m.route.param('subpage');
      var page = ctrl.pages()[ctrl.pages().map(function(page) { return page.href; }).indexOf(index)];
      return (
        m('div', [
          m('ul', {
            'class': 'nav nav-tabs'
          }, [
            m('li', [
              m('a', {'href': '/', 'config': m.route}, 'Home')
            ]),
            ctrl.pages().map(function(page) {
              return (
                m('li', {
                  'class': (m.route.param('subpage') === page.href || (typeof m.route.param('subpage') === 'undefined' && page.href === '')  ? 'active' : '')
                }, [
                  m('a', {'href': m.route.param('classroom') + '/' + page.href, 'config': m.route}, page.title)
                ])
              );
            })
          ]),
          m('br'),
          (typeof page === 'undefined' || typeof classroom === 'undefined' ? m('br') : m.component(page.controller))
        ])
      );
    }
  };

  var AppTab = {
    'controller': function() {
      return {
        'mounted': false
      };
    },
    'view': function(ctrl) {
      return m('div#appTab' + m.route.param('subpage'), {'config': function(element, isInitialized) {
        if (!ctrl.mounted) {
          var deps = ['/apps/' + m.route.param('subpage') + '/' + classroom.apps[m.route.param('subpage')]('admin')];
          if (typeof classroom.apps[m.route.param('subpage')]('shared') !== 'undefined')
            deps.push('/apps/' + m.route.param('subpage') + '/' + classroom.apps[m.route.param('subpage')]('shared'));
          require(deps, function(app, shared) {
            app.startApp(stm, element, api.createBound(m.route.param('subpage')), shared);
            ctrl.mounted = true;
          });
        }
      }});
    }
  };

  return App;
}());
