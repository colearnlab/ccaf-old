define(function() {
  var exports = {};
  var cb, parentElement;

  var loaded;

  var canvas, ctx, paint, paths, lastDraw, version;

  function addToPath(path, x, y, drag) {
    if (isNaN(x) || x === null || isNaN(y) || y === null)
      return;

    if (typeof paths[path] === 'undefined' || paths[path] === null) {
      paths[path] = {'X': [], 'Y': [], 'drag': []};
      lastDraw[path] = 0;
    }
    paths[path].X.push(x);
    paths[path].Y.push(y);
    paths[path].drag.push(drag || false);

    redraw(paths);
  }

  function redraw(paths) {
    ctx.strokeStyle = "#df4b26";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;

    paths.forEach(function(path, index) {
      if (path === null || typeof path === 'undefined')
        return;

      for (var i = (lastDraw[index] || 0); i < path.X.length; i++) {
        ctx.beginPath();

        if (path.drag[i] && i) {
          ctx.moveTo(path.X[i-1], path.Y[i-1]);
        }
        else {
         ctx.moveTo(path.X[i]-1, path.Y[i]);
        }

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
    cb.on('attempt', update);

    parentElement.appendChild(canvas);
  };

  function update(state) {
    if (!loaded)
      return;

    paths = state.global.deviceState[state.device('id')]('paths');

    if (state.global.deviceState[state.device('id')]('version') !== version) {
      version = state.global.deviceState[state.device('id')]('version');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      lastDraw = [];
    }

    redraw(paths);
  }

  return exports;
});
