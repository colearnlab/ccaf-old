define(function() {
  var exports = {};

  var stm, parentElement, api, shared;

  exports.startApp = function(_stm, _parentElement, _api, _shared) {
    stm = _stm;
    parentElement = _parentElement;
    shared = _shared;
    api = _api;

    css(api.appPath + 'styles.css');
    stm.try(function(state) {
      document.body.style.backgroundColor = _parentElement.style.backgroundColor = state.device('color');
    }).then(function(state) {
      m.render(parentElement, m.component(Menu, state('apps')));
    });
  };

  var Menu = {
    'view': function(_, apps) {
        return (
          m('nav.launcher', [
            m('.rotator-inner', {
              'data-rotate': 0
            }, [
              Object.keys(apps)
                .filter(function(app, index) {
                  return (!('exclude' in apps[app] && apps[app].exclude === true) && index < 7);
                })
                .map(function(app, index, a) {
                  var multiplier = Math.floor(Math.pow(index + 1, 1/3));
                  var top = (-40- multiplier*250*Math.cos(-0.5 * Math.PI - 2*(1/(multiplier === 1 ? Math.min(7, a.length) : a.length - 7))*index*Math.PI)).toFixed(4);
                  var left = (-40+ multiplier*250*Math.sin(-0.5 * Math.PI - 2*(1/(multiplier === 1 ? Math.min(7, a.length) : a.length - 7))*index*Math.PI)).toFixed(4);
                  var angle = Math.atan2(top, left) * (180 / Math.PI) - 90;

                  return m('span', {
                    'style':
                      'top: ' + top + '%; ' +
                      'left: ' + left + '%; ' +
                      'box-shadow: -5px 5px 5px black'
                    },
                    m('img', {
                      'style':
                        'transform: rotate(' + angle + 'deg)',
                      'src': '/apps/' + app + '/' + apps[app].icon,
                      'onmousedown': function(e) {
                        e.target.parentNode.classList.add('icon-activated');
                      },
                      'ontouchstart': function(e) {
                        e.target.parentNode.classList.add('icon-activated');
                      },
                      'ontouchend': function(e) {
                        e.target.parentNode.classList.remove('icon-activated');
                        if (parseInt(e.target.parentNode.parentNode.getAttribute('data-rotate')) < 20) {
                          e.target.parentNode.classList.add('icon-opened1');
                          e.target.parentNode.classList.add('icon-opened2');
                          stm.try(function(state) {
                            state.device('app', app);
                          });
                        }
                      },
                      'onmouseup': function(e) {
                        e.target.parentNode.classList.remove('icon-activated');
                        if (parseInt(e.target.parentNode.parentNode.getAttribute('data-rotate')) < 20) {
                          e.target.parentNode.classList.add('icon-opened1');
                          e.target.parentNode.classList.add('icon-opened2');
                          stm.try(function(state) {
                            state.device('app', app);
                          });
                        }
                      }
                    })
                  );
                })
            ]),
            m('.rotator-outer', [
              Object.keys(apps)
                .filter(function(app, index) {
                  return (!('exclude' in apps[app] && apps[app].exclude === true) && index >= 7);
                })
                .map(function(app, index, a) {
                  var multiplier = Math.floor(Math.pow(index + 8, 1/3));
                  var top = (- multiplier*250*Math.cos(-0.5 * Math.PI - 2*(1/(a.length))*index*Math.PI)).toFixed(4);
                  var left = (+ multiplier*250*Math.sin(-0.5 * Math.PI - 2*(1/(a.length))*index*Math.PI)).toFixed(4);
                  var angle = Math.atan2(top, left) * (180 / Math.PI) - 90;

                  return m('span',
                    m('img', {
                      'style':
                        'top: ' + top + '%; ' +
                        'left: ' + left + '%; ' +
                        'transform: rotate(' + angle + 'deg)',
                      'src': '/apps/' + app + '/' + apps[app].icon,
                      'onclick': function() {
                        stm.try(function(state) {
                          state.device('app', app);
                        });
                      }
                    })
                  );
                })
            ])
          ])
        );
    }
  };

  function onmove(e) {
    var targetX = document.documentElement.clientWidth / 2;
    var targetY = document.documentElement.clientHeight / 2;
    var X1 = e.clientX;
    var Y1 = e.clientY;
    var X2 = e.clientX + e.dx;
    var Y2 = e.clientY + e.dy;

    var angle = parseFloat(e.target.getAttribute('data-angle')) || 0;

    var a = Math.sqrt((X1 - X2) * (X1 - X2) + (Y1 - Y2) * (Y1 - Y2));
    var b = Math.sqrt((targetX - X2) * (targetX - X2) + (targetY - Y2) * (targetY - Y2));
    var c = Math.sqrt((X1 - targetX) * (X1 - targetX) + (Y1 - targetY) * (Y1 - targetY));

    var targetAngle = Math.acos((b*b+c*c-a*a)/(2*b*c))*180/Math.PI;

    var a1 = Math.atan2(Y1 - targetY, targetX - X1);
    var a2 = Math.atan2(Y2 - targetY, targetX - X2);

    if (a1 <= a2)
      targetAngle *= -1;

    angle += targetAngle;
    e.target.setAttribute('data-rotate', parseFloat(e.target.getAttribute('data-rotate')) + targetAngle);
    e.target.setAttribute('data-angle', angle);
    e.target.style.transform = 'rotate(' + angle + 'deg)';

    for (var i = 0; i < e.target.childNodes.length; i++) {
      e.target.childNodes[i].style.boxShadow = -5 * Math.cos((angle + 45) * Math.PI / 180) + 'px ' + 5 * Math.sin((angle + 45) * Math.PI / 180) + 'px 5px black';
    }
  }

  interact('.rotator-inner, .rotator-outer')
    .draggable({
      'inertia': true,
      'onmove': onmove,
      'onend': function(e) {
        e.target.setAttribute('data-rotate', 0);
        for (var i = 0; i < e.target.childNodes.length; i++) {
          e.target.childNodes[i].classList.remove('icon-activated');
        }
      }
    });

  return exports;
});
