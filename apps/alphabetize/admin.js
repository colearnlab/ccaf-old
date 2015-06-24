define(function() {
  var exports = {};
  var cb, parentElement;

  var wordlist;
  exports.startApp = function(_cb, _parentElement) {
    cb = _cb;
    parentElement = _parentElement;

    cb.on('attempt', propegateChanges);
    cb.on('change', propegateChanges);

    require(['/apps/alphabetize/wordlist.js'], function(_wordlist) {
      wordlist = _wordlist;
      cb.try(function(state) {
        if (typeof state.appRoot.alphabetize('deviceState') === 'undefined')
          state.appRoot.alphabetize('deviceState', {});
      }).then(propegateChanges).done();
    });
  };

  function propegateChanges(state) {
    var devices = state('devices').reduce(function(acc, device) {
      if (device.app === 'alphabetize')
        acc[device.id] = device;
      return acc;
    }, []);
    var deviceState = state.appRoot.alphabetize('deviceState');
    m.render(parentElement, m.component(Root, {'deviceState': deviceState, 'devices': devices}));
  }

  var Root = {
    'view': function(ctrl, args) {
      return (
        m('div.col-md-3',
          Object.keys(args.deviceState).map(function(key) {
            return m.component(Panel, {'state': args.deviceState[key], 'device': args.devices[key]});
          })
        )
      );
    }
  };

  var Panel = {
    'view': function(ctrl, args) {
      return (
        m('div.panel.panel-default', [
          m('div.panel-heading', {
            'style': args.device.connected ? 'background-color: ' + args.device.color : ''
          }, [
            m('h1.panel-title', [args.device.name])
          ]),
          m('div.panel-body', [
            m('select.form-control', {
              'onchange': function(e) {
                cb.try(function(state) {
                  state.appRoot.alphabetize.deviceState[args.device.id]('wordlist', e.target.value);
                  state.appRoot.alphabetize.deviceState[args.device.id]('currentWords', undefined);
                });
              },
              'value': args.state.wordlist
            }, [
              Object.keys(wordlist).map(function(key) {
                return m('option', {'value': key}, [key]);
              })
            ])
          ])
        ])
      );
    }
  };

  return exports;
});
