define(['clientUtil', 'exports'], function(clientUtil, exports) {
  var canvasHeight = 5000;
  exports.load = function(el, action, store, params) {
    var deviceState, canvas, ctx, pen = {'strokeStyle': '#ff0000', 'lineWidth': 10};
    
    createActions();
    store.sendAction('init');
    deviceState = store.deviceState[params.device];

    initElements();
    initListeners();
    resizeCanvas();
    clearScreen();
    
    deviceState.paths.addObserver(drawPaths);
    
    function initElements() {
      clientUtil.css('/apps/whiteboard/styles.css');

      canvas = document.createElement('canvas'); 
      el.appendChild(canvas);
      
      var controls = document.createElement('div');
      m.mount(controls, m.component(Controls, {'pen': pen, 'deviceState': deviceState}));
      el.appendChild(controls);
    }
    
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = canvasHeight;
      canvas.style.height = canvasHeight + 'px';
      ctx = canvas.getContext('2d');
    }

    function createActions() {
      var curPath = {};
      action('init')
        .onReceive(function() {
          if (typeof this.deviceState === 'undefined')
            this.deviceState = {};
          if (typeof this.deviceState[params.device] === 'undefined')
            this.deviceState[params.device] = {'paths': []};
        });
        
      action('create-path')
        .onReceive(function(identifier) {
          this.paths[this.paths.length] = [pen];
          curPath[identifier] = this.paths.length - 1;
        })
        .onRevert(function(identifier) {
          delete curPath[identifier];
        });
        
      action('add-point')
        .onReceive(function(identifier, x, y) {
          if (curPath[identifier] >= 0) {
            this.paths[curPath[identifier]].sendAction('add-point-2', x, y);
          }
          return false;
        });
        
      action('add-point-2')
        .onReceive(function(x, y) {
          this.push({'x': x, 'y': y});
        });
        
      action('end-point')
        .onReceive(function(identifier) {
          delete curPath[identifier];
          return false;
        });
        
      action('clear-screen')
        .onReceive(function() {
          this.paths = [];
        });
    }
    
    function initListeners() {
      canvas.addEventListener('mousedown', function(e) {
        deviceState.sendAction('create-path', 0);
      });
      
      canvas.addEventListener('mousemove', function(e) {
        deviceState.sendAction('add-point', 0, e.pageX, e.pageY);
      });
      
      canvas.addEventListener('mouseup', function(e) {
        deviceState.sendAction('end-point', 0);
      });
      
      canvas.addEventListener('mouseleave', function(e) {
        deviceState.sendAction('end-point', 0);
      });
    };
    
    function drawPaths(newPaths, oldPaths) {
      console.log(newPaths);
      var path;
      oldPaths = oldPaths || [];
      
      if (newPaths.length < oldPaths.length) {
        oldPaths = [];
        clearScreen();
      }
      
      newPaths.forEach(function(newPath, i) {
        ctx.strokeStyle = newPath[0].strokeStyle;
        ctx.lineWidth = newPath[0].lineWidth;
        ctx.lineJoin = "round";
        
        for (var j = oldPaths[i] ? oldPaths[i].length : 1; j < newPaths[i].length; j++) {
          path = newPath;
          ctx.beginPath();
          if (path[j - 1])
            ctx.moveTo(path[j - 1].x, path[j - 1].y);
          else
            ctx.moveTo(path[j].x - 1, path[j].y);
            
          ctx.lineTo(path[j].x, path[j].y);
          ctx.closePath();
          ctx.stroke();
        }
      });
    }
    
    function clearScreen() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  var Controls = {
    'controller': function() {
      return {
        'colors': ['red', 'green', 'blue', 'black']
      };
    },
    'view': function(ctrl, args) {
      var pen = args.pen;
      var deviceState = args.deviceState;
      return (
        m('div#controls.form-inline', [
          m('#slidercontainer', [
            m('input#slider[type=range]', {
              min: 0,
              max: canvasHeight - window.innerHeight,
              value: canvasHeight - window.innerHeight,
              config: function(el) {
                el.addEventListener('input', function(e) {
                  canvasTop = (canvasHeight - window.innerHeight - e.target.value);
                  canvas.style.transform = 'translate(0px,-' + canvasTop + 'px)';
                });
              }
            })
          ]),
          m('button.btn.btn-default.btn-lg', {
            'onclick': function(e) {
              deviceState.sendAction('clear-screen');
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
});