define(function() {
  var exports = {};
  var cb, parentElement;

  var items, thisDevice, otherDevices, lastZ, lastLength;

  var loaded;

  exports.startApp = function(_cb, _parentElement) {
    cb = _cb;
    parentElement = _parentElement;

    css('/apps/flick/styles.css');

    cb.try(function(state) {
      if (typeof state.global('deviceState') === 'undefined')
        state.global('deviceState', {});
      if (typeof state.global.deviceState(state.device('id')) === 'undefined')
        state.global.deviceState(state.device('id'), {});
      if (typeof state.global.deviceState[state.device('id')]('items') === 'undefined')
        state.global.deviceState[state.device('id')]('items', [{'src': '/apps/flick/kittens/1.jpg'}]);
      if (typeof state.global.deviceState[state.device('id')]('lastZ') === 'undefined')
        state.global.deviceState[state.device('id')]('lastZ', 1);

      state.global.deviceState[state.device('id')]('location', state.device('location'));
      state.global.deviceState[state.device('id')]('screen', state.device('screen'));
      state.global.deviceState[state.device('id')]('color', state.device('color'));
      state.global.deviceState[state.device('id')]('name', state.device('name'));
      state.global.deviceState[state.device('id')]('id', state.device('id'));
    }).then(function(state) {
      loaded = true;
      lastLength = state.global.deviceState[state.device('id')]('items').length;
      update(state);
    }).done();

    cb.on('change', update);
  };

  function update(state) {
    if (!loaded)
      return;

    items = state.global.deviceState[state.device('id')]('items');
    lastZ = state.global.deviceState[state.device('id')]('lastZ');

    var devices = state.global('deviceState');
    otherDevices = Object.keys(devices)
      .filter(function(key) {
        return key != state.device('id');
      })
      .map(function(key) {
        return devices[key];
    });

    thisDevice = state('device');

    m.render(parentElement, Root);
  }

  var Root = {
    'view': function(ctrl, args) {
      return (
        m('div', [
          items
            .filter(function(item, index) {
              if (item !== null && typeof item !== 'undefined') {
                item.index = index;
                return true;
              }
            })
            .map(function(item) {
              if ('sender' in item) {
                var arrows = document.getElementsByClassName('arrow');
                for (var i = 0; i < arrows.length; i++) {
                  if (arrows[i].getAttribute('data-target') == item.sender) {
                    item.x = parseInt(arrows[i].style.left.replace('%', '')) / 100 * window.innerWidth;
                    item.y = parseInt(arrows[i].style.top.replace('%', '')) / 100 * window.innerHeight;
                    console.log(item);
                  }
                }
              }
              return m.component(Item, item);
          }),
          m.component(Compass)
        ])
      );
    }
  };

  var Compass = {
    'view': function(ctrl, args) {
      return (
        m('div', [
          otherDevices.map(function(device) {
            var angleRad = Math.atan2(device.location.y - thisDevice.location.y, device.location.x - thisDevice.location.x) - Math.PI / 2;
            var angle =  angleRad * 180 / Math.PI;
            var top = (Math.cos(angleRad)) * 50 + 50;
            top = (top < 15 ? top + 15 : top > 85 ? top - 15 : top);
            var left = (-Math.sin(angleRad)) * 50 + 50;
            left = (left < 10 ? left + 10 : left > 90 ? left - 10 : left);

            return m('div.arrow', {
              'style': 'background-color: ' + device.color + '; -webkit-transform: rotate(' + angle + 'deg); transform: rotate(' + angle + 'deg);' +
                       'top: ' +  top + '%;' +
                       'left: ' + left + '%;',
              'data-target': device.id
            }, [
              m('img', {
              'height': '300px',
              'src': '/apps/flick/arrow.gif'
              })
            ]);
          })
        ])
      );
    }
  };

  var Item = {
    'view': function(ctrl, item) {
      return m('img.flickable', {
        'data-x': item.x || 0,
        'data-y': item.y || 0,
        'data-z': item.z || 0,
        'data-angle': item.angle || 0,
        'data-index': item.index,
        'data-hold': item.hold,
        'config': updateTransform,
        'src': item.src,
        'width': '600px'
      });
    }
  };

  function updateTransform(target) {
    var x = target.getAttribute('data-x');
    var y = target.getAttribute('data-y');
    var z = target.getAttribute('data-z');
    var angle = target.getAttribute('data-angle');

    target.style['z-index'] = z;

    target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px) rotate(' + angle + 'deg)';
  }

  function onstart(e) {
    var target = e.target;
    var z = target.style['z-index'] = lastZ++;
    target.setAttribute('data-z', z);
    cb.try(function(state) {
      var self = state.global.deviceState[state.device('id')].items[parseInt(target.getAttribute('data-index'))];
      if (self('hold') === false || typeof self('hold') === 'undefined') {
        self('z', z);
        self('sender', undefined);
        state.global.deviceState[state.device('id')]('lastZ', z);
        self('hold', cb.uuid());
      }
    });
  }

  function onmove(e) {
    var target = e.target, x, y, angle;
    target.setAttribute('data-x', x = parseFloat(target.getAttribute('data-x')) + e.dx);
    target.setAttribute('data-y', y = parseFloat(target.getAttribute('data-y')) + e.dy);
    target.setAttribute('data-angle', angle = parseFloat(target.getAttribute('data-angle')) + (1 * (e.da || 0)));
    updateTransform(e.target);

    cb.try(function(state) {
      var self = state.global.deviceState[state.device('id')].items[parseInt(target.getAttribute('data-index'))];
      if (self('hold') === cb.uuid()) {
        self('x', x);
        self('y', y);
        self('angle', angle);
      }
    });
  }

  function onend(e) {
    var target = e.target;
    cb.try(function(state) {
      var self = state.global.deviceState[state.device('id')].items[parseInt(target.getAttribute('data-index'))];
      if (typeof self !== 'undefined' && self('hold') === cb.uuid()) {
        self('hold', false);
      }
    });
  }

  require(['/apps/flick/interact.js'], function(interact) {
    interact('.flickable')
      .draggable({
        'inertia': true,
        'restrict': {'restriction': '#app'},
        'onstart': onstart,
        'onmove': onmove,
        'onend': onend
      })
      .gesturable({
        'onstart': onstart,
        'onmove': onmove,
        'onend': onend
      });

      interact('.arrow')
        .dropzone({
          'accept': '.flickable',
          'pointer': false,
          'center': false,
          'overlap': 0.1,
          'ondrop': function(e) {
            console.log('sending...');
            cb.try(function(state) {
              var index = parseInt(e.relatedTarget.getAttribute('data-index'));
              var items = state.global.deviceState[state.device('id')]('items');

              var item = items.splice(index, 1)[0];

              item.sender = state.device('id');
              item.hold = false;

              state.global.deviceState[state.device('id')]('items', items);

              var target = state.global.deviceState[parseInt(e.target.getAttribute('data-target'))];
              target.items(target('items').length, item);
            }).then(function(state) {
              items = state.global.deviceState[state.device('id')]('items');
              update(state);
            }).done();
          }
        });
  });

  return exports;
});
