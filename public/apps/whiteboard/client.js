define(['clientUtil'], function(clientUtil) {
  var exports = {};
  var appRoot, parentElement, params;

  var canvas, ctx, touchToPath, touchToSub, paths, version, pen, lastPath = [], version;
  
  function PathFactory(props) {
    var obj = {};
    if (arguments.length === 0) {
      obj.X = {};
      obj.Y = {};
      obj.t = {};
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
  
 addToPath = function(path, x, y, t) {
    if (isNaN(x) || x === null || isNaN(y) || y === null)
      return;
    
    var loc = Object.keys(path.X).length;
    
    path.X[loc] = parseInt(x);
    path.Y[loc] = parseInt(y);
    path.t[loc] = t;
    
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
      startX = path.X[i-1] || path.X[i]-1;
      startY = path.Y[i-1] || path.Y[i];
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

    var mouse = 0;
    canvas.onmousedown = function(e) {
      var id = 0;
      mouse = 1;
      var path = path = PathFactory();
      drawnByMe[path.id] = true;
      addToPath(path, e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop, e.timeStamp);
      drawSub.try(function(root) {
         root[path.id] = JSON.parse(JSON.stringify(path));
      }, function(root) {
        var tmp = drawSub.subscribe(path.id, undefined, function() {
          touchToSub[id] = tmp;
        });
      }); 
    }
    
    canvas.onmousemove = function(e) {
      if (mouse === 0)
        return;

      var id = 0;
      var path = touchToPath[id];
      addToPath(path, e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop, e.timeStamp);
      if (typeof touchToSub[id] !== 'undefined') {
        touchToSub[id].try(function(_path) {
          _path.X = path.X;
          _path.Y = path.Y;
          _path.t = path.t;
        });
      }
    }
    
    canvas.onmouseup = canvas.onmouseout = function(e) {
      if (mouse === 0)
        return;
      mouse = 0;
      var id = 0;
      var path = touchToPath[id];
      if (typeof touchToSub[id] !== 'undefined') {
        touchToSub[id].try(function(_path) {
          _path.X = path.X;
          _path.Y = path.Y;
          _path.t = path.t;
          _path.strokeFinished = true;
        }, function() {
          touchToSub[id].unsubscribe();
          delete touchToSub[id];
        });
      }
    }

    canvas.ontouchstart = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        var id = ct.identifier + 1;
        var path = touchToPath[id] = PathFactory();
        drawnByMe[path.id] = true;
        addToPath(path, ct.pageX - canvas.offsetLeft, ct.pageY - canvas.offsetTop, e.timeStamp);
        drawSub.try(function(root) {
           root[path.id] = JSON.parse(JSON.stringify(path));
        }, function(root) {
          var tmp = drawSub.subscribe(path.id, undefined, function() {
            tmp.try(function(_path) {
              _path.X = path.X;
              _path.Y = path.Y;
              _path.t = path.t;
            });
            touchToSub[id] = tmp;
          });
        });
      });
    };
 
    canvas.ontouchmove = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        var id = ct.identifier + 1;
        var path = touchToPath[id];
        addToPath(path, ct.pageX - canvas.offsetLeft, ct.pageY - canvas.offsetTop, e.timeStamp);
        if (typeof touchToSub[id] !== 'undefined') {
          touchToSub[id].try(function(_path) {
            _path.X = path.X;
            _path.Y = path.Y;
            _path.t = path.t;
          });
        }
      });
    };

    canvas.ontouchend = canvas.ontouchcancel = canvas.ontouchleave = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        var id = ct.identifier + 1;
        var path = touchToPath[id];
        if (typeof touchToSub[id] !== 'undefined') {
          touchToSub[id].try(function(_path) {
            _path.X = path.X;
            _path.Y = path.Y;
            _path.t = path.t;
            _path.strokeFinished = true;
          }, function() {
            touchToSub[id].unsubscribe();
            delete touchToSub[id];
            delete touchToPath[id];
          });
        }
      });
    };

   appRoot.try(function(root) {
      if (typeof root.deviceState === 'undefined')
        root.deviceState = {};
      if (typeof root.deviceState[params.device] === 'undefined')
        root.deviceState[params.device] = {'drawings': {0:{}}, 'version': [0]}
      root.deviceState[params.device].device = params.device;
    }, function(root) {
      drawSub = appRoot.subscribe('deviceState.' + params.device + '.drawings.' + root.deviceState[params.device].version[0], update, update);
      appRoot.subscribe('deviceState.' + params.device + '.version', newVersion);
    });
  };
  var drawSub;
  var version;
  var drawnByMe = {};
  
  function newVersion(vArray) {
    drawSub.unsubscribe();
    clearScreen();
    drawnByMe = {};
    touchToSub = {};
    touchToPath = {};
    paths = {};
    drawSub = appRoot.subscribe('deviceState.' + params.device + '.drawings.' + vArray[0], update, update);
  }
  
  function update(_root) {
    root = {paths: _root};

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
            'onclick': function(e) {
              canvas.classList.add('frozen');
              appRoot.try(function(root) {
                root.deviceState[params.device].drawings[++root.deviceState[params.device].version[0]] = {};
              }, function(root) {
                canvas.classList.remove('frozen');
                newVersion(root.deviceState[params.device].version);
              });
            }
          }, ['Clear']),
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