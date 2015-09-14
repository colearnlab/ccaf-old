define(['clientUtil'], function(clientUtil) {
  var exports = {};
  var appRoot, parentElement, params;

  var canvas, ctx, touchToPath, paths, version, pen, lastPath = [], version;
  
  function Path(props) {
    if (arguments.length === 0) {
      this.X = [];
      this.Y = [];
      this.pen = pen;
      this.strokeFinished = false;
      this.id = Math.floor((1 + Math.random()) * 0x10000000).toString(16);
      this.lastPoint = null;
    } else {
      for (var p in props)
        this[p] = props[p];
      
      this.lastPoint = 0;
      
      this.draw();
    }
  }
  
  Path.prototype.add = function(x, y) {
    if (isNaN(x) || x === null || isNaN(y) || y === null)
      return;
    
    this.X.push(x);
    this.Y.push(y);
  }

  Path.prototype.draw = function() {
    ctx.strokeStyle = this.pen.strokeStyle;
    ctx.lineJoin = "round";
    ctx.lineWidth = this.pen.lineWidth;
    
    var startX, startY;
    for (var i = (this.lastPoint || 0); i < this.X.length; i++) {
      startX = this.X[i-1] || this.X[i]-1;
      startY = this.Y[i-1] || this.Y[i];
      ctx.beginPath();

      ctx.moveTo(startX, startY);

      ctx.lineTo(this.X[i], this.Y[i]);
      ctx.closePath();
      ctx.stroke();
    }
    
    this.lastPoint = this.X.length;
  }


  exports.startApp = function(_appRoot, _parentElement, _params) {
    console.log('hi');
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
        var p = touchToPath[ct.identifier] = new Path();
        p.add(ct.pageX - canvas.offsetLeft, ct.pageY - canvas.offsetTop);
        appRoot.try(function(root) {
          root.deviceState[params.device].paths[p.id] = p;
        });
      });
    };

    canvas.ontouchmove = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        touchToPath[ct.identifier].add(ct.pageX - canvas.offsetLeft, ct.pageY - canvas.offsetTop);
        var p = touchToPath[ct.identifier];
        appRoot.try(function(root) {
          if (typeof root.deviceState[params.device].paths[p.id] === 'undefined')
            return;
          root.deviceState[params.device].paths[p.id].X = p.X;
          root.deviceState[params.device].paths[p.id].Y = p.Y;
        });
      });
    };

    canvas.ontouchend = canvas.ontouchleave = canvas.ontouchcancel = function(e) {
      [].forEach.call(e.changedTouches, function(ct) {
        var p = touchToPath[ct.identifier];
        appRoot.try(function(root) {
          root.deviceState[params.device].paths[p.id].strokeFinished = true;
        }).then(function(state) {
          lastPath.push(p.id);
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
      appRoot.subscribe('deviceState.' + params.device, update);
    }).done();
  };

  function update(root, change) {
    for (var prop in change.paths) {
      if (prop in paths) {
        paths[prop].X = change.paths[prop].X;
        paths[prop].Y = change.paths[prop].Y;
        paths[prop].draw();
      }
      else {
        paths[prop] = new Path(change.paths[prop]);
        paths[prop].draw();
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
              cb.try(function(state) {
                var self = state.global.deviceState[state.device('id')];
                self('paths', {});
                self('version', self('version') + 1);
              }).then(function(state) {
                document.body.classList.remove('frozen');
                paths = state.global.deviceState[state.device('id')]('paths');
                clearScreen();
                for (var p in paths)
                  paths[p].draw();
              });
            }
          }, ['Clear']),
          m('span.spacer1', [m.trust('&nbsp;')]),
          m('button.btn.btn-default.btn-lg', {
            'onclick': function() {
              var myPath = lastPath.pop();
              if (typeof myPath === 'undefined')
                return;
              cb.try(function(state) {
                var self = state.global.deviceState[state.device('id')];
                self.paths(myPath, null);
              }).then(update);
            }
          }, ['Undo']),
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
