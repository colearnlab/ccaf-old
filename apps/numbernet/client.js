define(function() {
  var exports = {};
  var cb, parentElement;

  var loaded, calculators, target, disabled;
  exports.startApp = function(_cb, _parentElement) {
    cb = _cb;
    parentElement = _parentElement;
    css('/apps/numbernet/styles.css');
    cb.try(function(state) {
      if (typeof state.global('deviceState') === 'undefined')
        state.global('deviceState', {});
      if (typeof state.global.deviceState(state.device('id')) === 'undefined')
        state.global.deviceState(state.device('id'), {});
      var self = state.global.deviceState[state.device('id')];
      if (typeof self('results') === 'undefined')
        self('results', []);
      if (typeof self('calculators') === 'undefined')
        self('calculators', []);
    }).then(function(state) {
      loaded = true;
      update(state);
    }).done();

    cb.on('change', update);
  };

  function update(state) {
    if (!loaded)
      return;
    var self = state.global.deviceState[state.device('id')];
    calculators = self('calculators');
    target = self('target');
    disabled = self('disabled');
    m.render(parentElement, m.component(Main));
  }

  var Main = {
    'view': function(ctrl, args) {
      return (
        m('div', [
          m('div#target', [
            target
          ]),
          calculators.map(function(calculator, index) {
            calculator.index = index;
            return m.component(CalculatorView, calculator);
          })
        ])
      );
    }
  };

  var CalculatorView = {
    'view': function(ctrl, args) {
      var keyOrder = [7, 8, 9, '+', 4, 5, 6, '-', 1, 2, 3, '÷', 0, '.', '=', '×'];
      var operators = ['+', '-', '÷', '×'];
      var transform = 'translate(' + (args.x || 0) + 'px, ' + (args.y || 0) + 'px) rotate(' + (args.angle || 0) + 'deg);';
      if (typeof args.screen === 'undefined')
        stm.try(function(state) {
          var calc = state.global.deviceState[state.device('id')].calculators[args.index];
          calc('screen', '');
          calc('decimalClicked', false);
          calc('operatorClicked', false);
        });
      return (
        m('div.calculator', {
          'style': 'position: absolute; webkit-transform: ' + transform + 'transform: ' + transform,
          'data-x': args.x || 0,
          'data-y': args.y || 0,
          'data-angle': args.angle || 0,
          'data-index': args.index,
          'id': 'calculator-' + args.index
        }, [
          m('div.top', [
            m('span.clear', {
              'onclick': function(e) {
                stm.try(function(state) {
                  var calc = state.global.deviceState[state.device('id')].calculators[args.index];
                  calc('screen', '');
                  calc('decimalClicked', false);
                  calc('operatorClicked', false);
                }).then(update).done();
              }
            }, ['C']),
            m('div.screen', [args.screen])
          ]),
          m('div.keys',
            keyOrder.map(function(key) {
              var c, d;
              if (operators.indexOf(key) !== -1)
                c = '.operator';
              else if (key === '=')
                c = '.eval';
              else
                c = '';

              d = (disabled || []).indexOf(key) != -1 ? '.disabledKey' : '';
              return m('span' + c + d, {
                'onclick': function(e) {
                  var last = args.screen[args.screen.length - 1];
                  if (!isNaN(key))
                    stm.try(function(state) {
                      var calc = state.global.deviceState[state.device('id')].calculators[args.index];
                      calc('screen', calc('screen') + key);
                    }).then(update).done();
                  else if (key === '.' && !isNaN(last) && !args.decimalClicked) {
                    stm.try(function(state) {
                      var calc = state.global.deviceState[state.device('id')].calculators[args.index];
                      calc('screen', calc('screen') + key);
                      calc('decimalClicked', true);
                    }).then(update).done();
                  }
                  else if (operators.indexOf(key) !== -1 && operators.indexOf(last) === -1 && !args.operatorClicked) {
                    stm.try(function(state) {
                      var calc = state.global.deviceState[state.device('id')].calculators[args.index];
                      calc('screen', calc('screen') + key);
                      calc('decimalClicked', false);
                      calc('operatorClicked', true);
                    }).then(update).done();
                  }
                  else if (key === '='){

                  }
                }
              }, key);
            })
          ),
          m('div.name', [args.name])
        ])
      );
    }
  };

  function updateTransform(event) {
    var target = event.target;
    while (!target.classList.contains('calculator'))
      target = target.parentNode;
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + (event.dx || 0);
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + (event.dy || 0);
    var angle = (parseFloat(target.getAttribute('data-angle')) || 0) + (event.da || 0);

    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
    target.setAttribute('data-angle', angle);

    stm.try(function(state) {
      var calc = state.global.deviceState[state.device('id')].calculators[target.getAttribute('data-index')];
      calc('x', x);
      calc('y', y);
      calc('angle', angle);
    });

    target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px) rotate(' + angle + 'deg)';
  }

  require(['apps/numbernet/interact.js'], function(interact) {
    interact('.calculator')
      .draggable({'restrict': {'restriction': '#app'}, 'preventDefault': 'never', 'inertia': true})
      .on('dragmove', updateTransform)
      .preventDefault('never');

    interact('.calculator')
      .gesturable({
        'preventDefault': 'never',
        'onmove': updateTransform
      })
      .preventDefault('never');
  });

  return exports;
});
