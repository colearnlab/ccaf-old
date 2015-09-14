define(['clientUtil'], function(clientUtil) {
  var exports = {};
  var appRoot, parentElement, params;

  var canvas, ctx, touchToPath, paths, version, pen, lastPath = [], version;
  
  function PathFactory(props) {
    var obj = {};
    if (arguments.length === 0) {
      obj.X = [];
      obj.Y = [];
      obj.pen = pen;
      obj.strokeFinished = false;
      obj.id = Math.floor((1 + Math.random()) * 0x10000000).toString(16);
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
    
    path.X.push(x);
    path.Y.push(y);
    
    drawPath(path);
  }

  drawPath = function(path) {
    ctx.strokeStyle = path.pen.strokeStyle;
    ctx.lineJoin = "round";
    ctx.lineWidth = path.pen.lineWidth;
    
    var startX, startY;
    for (var i = (path.lastPoint || 0); i < path.X.length; i++) {
      startX = path.X[i-1] || path.X[i]-1;
      startY = path.Y[i-1] || path.Y[i];
      ctx.beginPath();

      ctx.moveTo(startX, startY);

      ctx.lineTo(path.X[i], path.Y[i]);
      ctx.closePath();
      ctx.stroke();
    }
    
    path.lastPoint = path.X.length;
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

    touchToPath = [];
    paths = {};
    pen = {'strokeStyle': '#ff0000', 'lineWidth': 10};
    clearScreen();
    
    parentElement.appendChild(canvas);

    var controls = document.createElement('div');
    m.mount(controls, Controls);

    parentElement.appendChild(controls);

    canvas.ontouchstart = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        var p = touchToPath[ct.identifier] = PathFactory();
        addToPath(p, ct.pageX - canvas.offsetLeft, ct.pageY - canvas.offsetTop);
      });
    };

    canvas.ontouchmove = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        addToPath(touchToPath[ct.identifier], ct.pageX - canvas.offsetLeft, ct.pageY - canvas.offsetTop);
       /* var p = touchToPath[ct.identifier];
        appRoot.try(function(root) {
          if (typeof root.deviceState[params.device].paths[p.id] === 'undefined')
            return;
          root.deviceState[params.device].paths[p.id].X = p.X;
          root.deviceState[params.device].paths[p.id].Y = p.Y;
        }); */
      });
    };

    canvas.ontouchend = canvas.ontouchleave = canvas.ontouchcancel = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        var p = touchToPath[ct.identifier];
        p.strokeFinished = true;
        appRoot.try(function(root) {
          root.deviceState[params.device].paths[p.id] = p;
        });
      });
    };

   appRoot.try(function(root) {
      if (typeof root.deviceState === 'undefined')
        root.deviceState = {};
      if (typeof root.deviceState[params.device] === 'undefined')
        root.deviceState[params.device] = {'paths': {}, 'version': 0}
    })
    .then(function() {
      appRoot.get('deviceState.' + params.device, update);
      appRoot.subscribe('deviceState.' + params.device, update);
    }).done();
  };

  var version;
  function update(root) {
    console.log(version, root.version);
    if (root.version !== version) {
      console.log('screen cleared');
      clearScreen();
      version = root.version;
    }
    
    var currentlyDrawing = {};
    touchToPath.forEach(function(path) {
      currentlyDrawing[path.id] = true;
    });
    
    for (var prop in root.paths) {
      if (prop in currentlyDrawing) return;
      if (prop in paths) {
        paths[prop].X.push.apply(root.paths[prop].X.slice(paths[prop].X.lenth));
        paths[prop].Y.push.apply(root.paths[prop].Y.slice(paths[prop].Y.lenth));
        drawPath(paths[prop]);
      }
      else {
        paths[prop] = PathFactory(root.paths[prop]);
        drawPath(paths[prop]);
      }
    }
  }

  function clearScreen() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    lastDraw = [];
  }

  var Controls = {
    'controller': function() {
      return {
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
              }).then(function(state) {
                document.body.classList.remove('frozen');
                paths = {};
                clearScreen();
              });
            }
          }, ['Clear']),
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
