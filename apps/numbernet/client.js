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
          }),
          calculators.reduce(function(acc, c, calc) { return acc.concat((c.expressions || []).map(function(expression, index) { expression.index = index; expression.calculator = calc; return expression; })) }, []).map(function(e, index) {
            return m.component(Expression, e);
          })
        ])
      );
    }
  };

  var Expression = {
    'view': function(ctrl, args) {
      var transform = 'translate(' + (args.x || 0) + 'px, ' + (args.y || 0) + 'px) rotate(' + (args.angle || 0) + 'deg);';
      if (!args.unique)
        return m('div');

      return (
        m('div.expression', {
          'data-x': args.x || 0,
          'data-y': args.y || 0,
          'data-angle': args.angle || 0,
          'data-index': args.index,
          'data-calculator': args.calculator,
          'style': 'position: absolute; webkit-transform: ' + transform + 'transform: ' + transform
        }, [m('span', args.text)])
      );
    }
  };

  var CalculatorView = {
    'view': function(ctrl, args) {
      var keyOrder = [7, 8, 9, '+', 4, 5, 6, '-', 1, 2, 3, '÷', 0, '.', '=', '×'];
      var operators = ['+', '-', '÷', '×'];
      var transform = 'translate(' + (args.x || 0) + 'px, ' + (args.y || 0) + 'px) rotate(' + (args.angle || 0) + 'deg);';
      if (typeof args.screen === 'undefined')
      {
        stm.try(function(state) {
          var calc = state.global.deviceState[state.device('id')].calculators[args.index];
          calc('screen', '');
          calc('decimalClicked', false);
        }).then(update).done();
        args.screen = '';
      }
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

              d = ((disabled || []).indexOf(key) !== -1 || (args.disabled || []).indexOf(key) !== -1) && (args.enabled || []).indexOf(key) === -1 ? '.disabledKey' : '';
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
                  else if (operators.indexOf(key) !== -1 && operators.indexOf(last) === -1) {
                    stm.try(function(state) {
                      var calc = state.global.deviceState[state.device('id')].calculators[args.index];
                      calc('screen', calc('screen') + key);
                      calc('decimalClicked', false);
                    }).then(update).done();
                  }
                  else if (key === '='){
                    if (args.screen.indexOf('-') + args.screen.indexOf('+') + args.screen.indexOf('×') + args.screen.indexOf('÷') === -4)
                      return;
                    stm.try(function(state) {
                      var calc = state.global.deviceState[state.device('id')].calculators[args.index];
                      var answer;
                      try {
                        answer = eval(args.screen.replace('÷', '/').replace('×', '*'));
                      } catch (e) {
                        return;
                      }
                      if (!isNaN(answer)) {
                        if (typeof calc('expressions') === 'undefined')
                          calc('expressions', []);

                        var unique = true;
                        calculators.forEach(function(calculator) {
                          if ((calculator.expressions || []).map(function(c) { return c.text; }).indexOf(args.screen) !== -1)
                            unique = false;
                        });
                        console.log(args.x);
                        console.log(args.x + Math.sin(args.angle) * -100);
                        calc.expressions(calc('expressions').length, {'text': args.screen, 'correct': answer == target, 'unique': unique, 'x': args.x, 'y': args.y, 'angle': args.angle});
                      }
                      calc('screen', undefined);
                    }).then(update).done();
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

  function updateTransformExpression(event) {
    var target = event.target;
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + (event.dx || 0);
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + (event.dy || 0);
    var angle = (parseFloat(target.getAttribute('data-angle')) || 0) + (event.da || 0);

    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
    target.setAttribute('data-angle', angle);

    stm.try(function(state) {
      var expression = state.global.deviceState[state.device('id')].calculators[target.getAttribute('data-calculator')].expressions[target.getAttribute('data-index')];
      expression('x', x);
      expression('y', y);
      expression('angle', angle);
    });

    target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px) rotate(' + angle + 'deg)';
  }

  require(['apps/numbernet/interact.js'], function(interact) {
    interact('.calculator')
      .draggable({'restrict': {'restriction': '#app'},'inertia': true})
      .on('dragmove', updateTransform)
      .preventDefault('never');

    interact('.calculator')
      .gesturable({
        'preventDefault': 'never',
        'onmove': updateTransform
      })
      .preventDefault('never');

    interact('.expression')
      .draggable({'restrict': {'restriction': '#app'}, 'inertia': true})
      .on('dragmove', updateTransformExpression);

    interact('.expression')
      .gesturable({
        'onmove': updateTransformExpression
      });
  });

  return exports;
});
