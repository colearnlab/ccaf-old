define(function() {
  var exports = {};
  var cb;

  var devices, deviceInfo;
  exports.startApp = function(_cb, parentElement) {
    cb = _cb;

    var update = function(state) {
      if (typeof m.route.param('subpage') === 'undefined')
        return;
      devices = state.appRoot[m.route.param('subpage')]('deviceState');
      deviceInfo = state('devices');
      m.render(parentElement, Main);
    };

    cb.try(update).then(function() {
      m.render(parentElement, Main);
    }).done();
    cb.on('change', update);
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
          m('button.btn.btn-success', {
            'onclick': function() {
              cb.try(function(state) {
                var device = state.appRoot[m.route.param('subpage')].deviceState[args.index];
                var calcs = device('calculators');
                calcs.push({});
                device('calculators', calcs);
              });
            }
          }, ['Add calculator']),
          ' ',
          m('button.btn.btn-danger' + (args.calculators.length === 0 ? '.disabled' : ''), {
            'onclick': function() {
              cb.try(function(state) {
                var device = state.appRoot[m.route.param('subpage')].deviceState[args.index];
                var calcs = device('calculators');
                console.log(calcs);
                calcs.splice(0, 1);
                console.log(calcs);
                device('calculators', calcs);
              });
            }
          }, ['Remove calculator'])
        ])
      ]);
    }
  };

  return exports;
});
