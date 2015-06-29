define(function() {
  var exports = {};
  var cb, parentElement;

  var devices, deviceInfo;
  exports.startApp = function(_cb, _parentElement) {
    cb = _cb;
    parentElement = _parentElement;
    cb.try(update).then(function() {
      m.render(parentElement, Main);
    }).done();
    cb.on('change', update);
  };

  function update(state) {
    if (typeof m.route.param('subpage') === 'undefined')
      return;
    devices = state.appRoot[m.route.param('subpage')]('deviceState');
    deviceInfo = state('devices');
    m.render(parentElement, Main);
  };

  var Main = {
    'view': function(ctrl, args) {
      return m('div', [
        Object.keys(devices).map(function(d) {
          var info = deviceInfo[deviceInfo.map(function(di) { return di.id; }).indexOf(parseInt(d))];
          if (typeof info === 'undefined' || info.app !== m.route.param('subpage'))
            return '';
          devices[d].index = d;
          devices[d].name = info.name;
          return m.component(Device, devices[d]);
        })
      ]);
    }
  };

  var Device = {
    'view': function(ctrl, args) {
      return m('div.panel.panel-default', [
        m('div.panel-heading', [args.name]),
        m('div.panel-body', [
          m('div.col-md-3', [
            m('div.input-group.input-group-lg', [
              m('div.input-group-addon', ['Target number']),
              m('input.form-control[type=number][min=0]', {
                'value': args.target || 0,
                'oninput': function(e) {
                  cb.try(function(state) {
                    state.appRoot[m.route.param('subpage')].deviceState[args.index]('target', e.target.value);
                  });
                }
              })
            ])
          ]),
          m('div.col-md-3', [
            m('ul.list-group', [
              args.calculators.map(function(calculator, index) {
                return m('li.list-group-item', [
                  m('div.input-group', [
                    m('input.form-control', {
                      'value': calculator.name || '',
                      'oninput': function(e) {
                        cb.try(function(state) {
                          state.appRoot[m.route.param('subpage')].deviceState[args.index].calculators[index]('name', e.target.value);
                        });
                      }
                    }),
                    m('span.input-group-addon', {
                      'onclick': function(e) {
                        cb.try(function(state) {
                          var calcs = state.appRoot[m.route.param('subpage')].deviceState[args.index]('calculators');
                          calcs.splice(index, 1);
                          state.appRoot[m.route.param('subpage')].deviceState[args.index]('calculators', calcs);
                        }).then(update).done();
                      }
                    }, [
                      m('span.glyphicon.glyphicon-remove')
                    ])
                  ])
                ]);
              })
            ]),
            m('button.btn.btn-success', {
              'onclick': function() {
                cb.try(function(state) {
                  var device = state.appRoot[m.route.param('subpage')].deviceState[args.index];
                  var calcs = device('calculators');
                  calcs.push({});
                  device('calculators', calcs);
                }).then(update).done();
              }
            }, ['Add calculator'])
          ])
        ])
      ]);
    }
  };

  return exports;
});
