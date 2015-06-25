define(function() {
  var exports = {};
  var cb, parentElement;

  var loaded;

  var canvas, ctx, paint, paths, lastDraw, version, pen;

  function addToPath(path, x, y) {
    if (isNaN(x) || x === null || isNaN(y) || y === null)
      return;

    if (typeof paths[path] === 'undefined' || paths[path] === null) {
      paths[path] = {'X': [], 'Y': [], 'pen': pen};
      lastDraw[path] = 0;
    }
    paths[path].X.push(x);
    paths[path].Y.push(y);

    redraw(paths);
  }

  function redraw(paths, debug) {
    paths.forEach(function(path, index) {
      if (path === null || typeof path === 'undefined')
        return;

      ctx.strokeStyle = path.pen.strokeStyle;
      ctx.lineJoin = "round";
      ctx.lineWidth = path.pen.lineWidth;

      for (var i = (lastDraw[index] || 0); i < path.X.length; i++) {
        ctx.beginPath();

        ctx.moveTo(path.X[i-1] || path.X[i]-1, path.Y[i-1] || path.Y[i]);

        ctx.lineTo(path.X[i], path.Y[i]);
        ctx.closePath();
        ctx.stroke();
      }
      lastDraw[index] = path.X.length;
    });
  }


  exports.startApp = function(_cb, _parentElement) {
    cb = _cb;
    parentElement = _parentElement;

    css('/apps/whiteboard/styles.css');

    canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');

    paths = [];
    paint = [];
    lastDraw = [];

    pen = {'strokeStyle': '#ff0000', 'lineWidth': 10};

    canvas.onmousedown = function(e) {
      paint[0] = paths.length;
      addToPath(paint[0], e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
    };

    canvas.onmousemove = function(e) {
      if (paint[0] || paint[0] === 0)
        addToPath(paint[0], e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
    };

    canvas.onmouseleave = canvas.onmouseup = function(e) {
      var p = paint[0];
      if (paint[0] || paint[0] === 0)
        cb.try(function(state) {
          state.global.deviceState[state.device('id')].paths(p, paths[p]);
        });

      paint[0] = false;
    };

    canvas.ontouchstart = function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        paint[e.changedTouches[i].identifier + 1] = paths.length + i;
        addToPath(paint[e.changedTouches[i].identifier + 1], e.changedTouches[i].pageX - this.offsetLeft, e.changedTouches[i].pageY - this.offsetTop);
      }
    };

    canvas.ontouchmove = function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (paint[e.changedTouches[i].identifier + 1] || paint[e.changedTouches[i].identifier + 1] === 0)
          addToPath(paint[e.changedTouches[i].identifier + 1], e.changedTouches[i].pageX - this.offsetLeft, e.changedTouches[i].pageY - this.offsetTop, true);
      }
    };

    canvas.ontouchend = canvas.ontouchleave = canvas.ontouchcancel = function(e) {
      var p = [];
      for (var i = 0; i < e.changedTouches.length; i++) {
        p[e.changedTouches[i].identifier + 1] = paint[e.changedTouches[i].identifier + 1];
        paint[e.changedTouches[i].identifier + 1] = false;
      }

      cb.try(function(state) {
        for (var i = 0; i < e.changedTouches.length; i++)
          state.global.deviceState[state.device('id')].paths(p[e.changedTouches[i].identifier + 1], paths[p[e.changedTouches[i].identifier + 1]]);
      });
    };

    cb.try(function(state) {
      if (typeof state.global('deviceState') === 'undefined')
        state.global('deviceState', {});
      if (typeof state.global.deviceState(state.device('id')) === 'undefined')
        state.global.deviceState(state.device('id'), {});
      if (typeof state.global.deviceState[state.device('id')]('paths') === 'undefined')
        state.global.deviceState[state.device('id')]('paths', []);
      if (typeof state.global.deviceState[state.device('id')]('version') === 'undefined')
        state.global.deviceState[state.device('id')]('version', 0);
    }).then(function(state) {
      loaded = true;
      update(state);
    }).done();

    cb.on('change', update);
    cb.on('attempt', function(state) {
      if (state.global.deviceState[state.device('id')]('version') !== version) {
        version = state.global.deviceState[state.device('id')]('version');
        paths = [];
        clearScreen();
      }
    });

    parentElement.appendChild(canvas);

    var controls = document.createElement('div');
    m.mount(controls, Controls);

    parentElement.appendChild(controls);
  };

  function update(state) {
    if (!loaded)
      return;

    paths = state.global.deviceState[state.device('id')]('paths');

    if (state.global.deviceState[state.device('id')]('version') !== version) {
      version = state.global.deviceState[state.device('id')]('version');
      clearScreen();
    }

    redraw(paths);
  }

  function clearScreen() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    lastDraw = [];
  }

  var Controls = {
    'controller': function() {
      return {
        'colors': ['red', 'green', 'blue']
      };
    },
    'view': function(ctrl) {
      return (
        m('div#controls.form-inline', [
          m('button.btn.btn-default.btn-lg', {
            'onclick': function() {
              cb.try(function(state) {
                var self = state.global.deviceState[state.device('id')];
                self('version', self('version') + 1);
                self('paths', []);
              });
            }
          }, ['Clear']),
          m('span.spacer1', [m.trust('&nbsp;')]),
          m('span.input-group', [
            m('input[type=range].form-control.input-lg', {
              'value': pen.lineWidth,
              'min': 5,
              'max': 20,
              'step': 1,
              'oninput': function(e) {
                pen.lineWidth = e.target.value;
              }
            }),
            m('span.input-group-addon', [
              m('span', {
                'style': 'background-color:' + pen.strokeStyle + '; ' +
                         'padding: 0; ' +
                         'margin-left: ' + (25 - pen.lineWidth)/2 + 'px; ' +
                         'margin-right: ' + (25 - pen.lineWidth)/2 + 'px; ' +
                         'line-height: ' + pen.lineWidth + 'px; ' +
                         'display: inline-block; ' +
                         'width: ' + pen.lineWidth + 'px; ' +
                         'height: ' + pen.lineWidth + 'px; ' +
                         'border-radius: 50%'
              }, [m.trust('&nbsp;')])
            ])
          ]),
          m('span.spacer1', [m.trust('&nbsp;')]),
          m('span.brush-holder',
            ctrl.colors.map(function(color) {
              return (
                m('span.brush', {
                  'style': 'background-color: ' + color + '; '
                }, [
                  m('img[src=/apps/whiteboard/splatter.gif]', {
                    'height': '25px',
                    'width': '25px'
                  })
                ])
              );
            })
          )
        ])
      );
    }
  };

  return exports;
});
