define(['clientUtil'], function(clientUtil) {
  var exports = {};
  var appRoot, parentElement, params;

  var canvas, ctx, touchToPath, touchToSub, paths, version, pen, lastPath = [], version;
  
  function PathFactory(props) {
    var obj = {};
    if (arguments.length === 0) {
      obj.X = {};
      obj.Y = {};
      obj.pen = pen;
      obj.strokeFinished = false;
      obj.id = 'a'+Math.floor((1 + Math.random()) * 0x10000000).toString(16);
      obj.lastPoint = null;
      
      return obj;
    } else {
      for (var p in props)
        obj[p] = props[p];
      
      obj.lastPoint = 0;
      
      drawPath(obj);
      
      return obj;
    }
  }
  
 addToPath = function(path, x, y) {
    if (isNaN(x) || x === null || isNaN(y) || y === null)
      return;
    
    var loc = Object.keys(path.X).length;
    
    path.X[loc] = x;
    path.Y[loc] = y;
    
    drawPath(path);
  }

  drawPath = function(path) {
    ctx.strokeStyle = path.pen.strokeStyle;
    ctx.lineJoin = "round";
    ctx.lineWidth = path.pen.lineWidth;
    
    var startX, startY;
    for (var i = (path.lastPoint || 0); i < Object.keys(path.X).length; i++) {
      if (typeof path.X[i] === 'undefined')
        continue;
      startX = path.X[i-1] || path.X[i-2] || path.X[i]-1;
      startY = path.Y[i-1] || path.Y[i-2] || path.Y[i];
      ctx.beginPath();

      ctx.moveTo(startX, startY);

      ctx.lineTo(path.X[i], path.Y[i]);
      ctx.closePath();
      ctx.stroke();
    }
    
    path.lastPoint = Object.keys(path.X).length;
  }


  exports.startApp = function(_appRoot, _parentElement, _params) {
    appRoot = _appRoot;
    parentElement = _parentElement;
    params = _params;

    clientUtil.css('/apps/whiteboard/styles.css');

    canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');

    touchToPath = {};
    touchToSub = {};
    paths = {};
    pen = {'strokeStyle': '#ff0000', 'lineWidth': 10};
    clearScreen();
    
    parentElement.appendChild(canvas);

    var controls = document.createElement('div');
    m.mount(controls, Controls);

    parentElement.appendChild(controls);

    canvas.ontouchstart = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        touchToPath[ct.identifier] = PathFactory();
        drawnByMe[touchToPath[ct.identifier].id] = true;
        addToPath(touchToPath[ct.identifier], ct.pageX - canvas.offsetLeft, ct.pageY - canvas.offsetTop, 0);
        appRoot.try(function(root) {
          root.deviceState[params.device].paths[touchToPath[ct.identifier].id] = JSON.parse(JSON.stringify(touchToPath[ct.identifier]));
        }, function() {
          var tmp = appRoot.subscribe('deviceState.' + params.device + '.paths.' + touchToPath[ct.identifier].id, undefined, function() {
            touchToSub[ct.identifier] = tmp;
          });
        });
      });
    };

    canvas.ontouchmove = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        addToPath(touchToPath[ct.identifier], ct.pageX - canvas.offsetLeft, ct.pageY - canvas.offsetTop, 1);
        if (typeof touchToSub[ct.identifier] !== 'undefined') {
          touchToSub[ct.identifier].try(function(path) {
            path.X = touchToPath[ct.identifier].X;
            path.Y = touchToPath[ct.identifier].Y;
          });
        }
      });
    };

    canvas.ontouchend = canvas.ontouchleave = canvas.ontouchcancel = function(e) {

      [].forEach.call(e.changedTouches, function(ct) {
        if (typeof touchToSub[ct.identifier] !== 'undefined') {
          touchToSub[ct.identifier].try(function(path) {
            path.X = touchToPath[ct.identifier].X;
            path.Y = touchToPath[ct.identifier].Y;
            path.strokeFinished = true;
          }, function() {
            touchToSub[ct.identifier].unsubscribe();
            delete touchToSub[ct.identifier];
          });
        }
      });
    };

   appRoot.try(function(root) {
      if (typeof root.deviceState === 'undefined')
        root.deviceState = {};
      if (typeof root.deviceState[params.device] === 'undefined')
        root.deviceState[params.device] = {'paths': {}, 'version': 0}
      root.deviceState[params.device].device = params.device;
    }, function() {
      appRoot.subscribe(update, update);
    });
  };

  var version;
  var drawnByMe = {};
  function update(root) {
    root = root.deviceState[params.device];
    if (root.version !== version) {
      console.log('screen cleared');
      clearScreen();
      version = root.version;
      drawnByMe = {};
      touchToSub = {};
      touchToPath = {};
    }
    for (var prop in root.paths) {
      if (prop in drawnByMe || (prop in paths && paths[prop].strokeFinished === true))
        continue;
      if (prop in paths && !paths[prop].strokeFinished) {
        paths[prop].X = root.paths[prop].X;
        paths[prop].Y = root.paths[prop].Y;
      } else if (!(prop in paths)) {
        paths[prop] = PathFactory(root.paths[prop]);
      }
      drawPath(paths[prop]);
    }
  }

  function clearScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    lastDraw = [];
  }

  var Controls = {
    'controller': function() {
      return {
        'map': false,
        'colors': ['red', 'green', 'blue', 'black']
      };
    },
    'view': function(ctrl) {
      return (
        m('div#controls.form-inline', [
          m('button.btn.btn-default.btn-lg', {
            'onclick': function() {
              document.body.classList.add('frozen');
              appRoot.try(function(root) {
                root.deviceState[params.device].paths = {};
                root.deviceState[params.device].version++;
              }, function(state) {
                document.body.classList.remove('frozen');
                paths = {};
                clearScreen();
              });
            }
          }, ['Clear']),
          m('span.spacer1', [m.trust('&nbsp;')]),
          m('button.btn.btn-default.btn-lg', {
            'onclick': function() {
              if (ctrl.map)
                canvas.classList.remove('map');
              else
                canvas.classList.add('map');
                
              ctrl.map = !ctrl.map;
            }
          }, ['Show/hide map']),
          m('span.spacer1', [m.trust('&nbsp;')]),
          m('span.spacer1', [m.trust('&nbsp;')]),
          m('span.input-group', [
            m('input[type=range].form-control.input-lg', {
              'value': pen.lineWidth,
              'min': 5,
              'max': 32,
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
                  'style': 'background-color: ' + color + '; ',
                  'onclick': function(e) {
                    pen.strokeStyle = color;
                  }
                }, [
                  m('img[src=/apps/whiteboard/splatter.gif]', {
                    'height': '50px',
                    'width': '50px'
                  })
                ])
              );
            }),
            m('span.brush', {
              'onclick': function(e) {
                pen.strokeStyle = 'white';
              }
            }, [
              m('img[src=/apps/whiteboard/eraser.png]', {
                'height': '50px',
                'width': '50px'
              })
            ])
          )
        ])
      );
    }
  };

  return exports;
});