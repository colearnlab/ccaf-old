define(function() {
  var exports = {};

  var stm, parentElement, api, shared;

  var wordList;

  exports.startApp = function(_stm, _parentElement, _api, _shared) {
    stm = _stm;
    parentElement = _parentElement;
    api = _api;
    shared = _shared;

    stm.on('attempt', propegateChanges);
    stm.on('change', propegateChanges);

    requirejs([api.appPath + 'wordList.js'], function(_wordList) {
      wordList = _wordList;
      stm.try(function() {}).then(propegateChanges).done();
    });
  };

  function propegateChanges(state) {
    var devices = state('devices').reduce(function(acc, device) {
      if (device.app === 'alphabetize')
        acc[device.id] = device;
      return acc;
    }, []);
    var deviceState = api(state).appRoot()('deviceState');
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
                stm.try(function(state) {
                  api(state).appRoot().deviceState[args.device.id]('wordList', e.target.value);
                  shared.generateNewWords(api(state).appRoot().deviceState[args.device.id], wordList);
                });
              },
              'value': args.state.wordList
            }, [
              Object.keys(wordList).map(function(key) {
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
