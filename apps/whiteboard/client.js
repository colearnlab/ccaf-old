define(function() {
  var exports = {};
  var cb, parentElement;

  var loaded;

  var canvas, ctx, paint, paths;

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


          if (!('X' in path))
            debugger;
      for (var i = lastDraw[index]; i < path.X.length; i++) {
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

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    canvas.onmousedown = function(e) {
      paint[0] = true;
      addToPath(0, e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
    }

    canvas.onmousemove = function(e) {
      if (paint[0])
        addToPath(0, e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
    }

    canvas.onmouseleave = canvas.onmouseup = function(e) {
      paint[0] = false;

      cb.try(function(state) {
        state.global.deviceState[state.device('id')]('paths', paths);
      });
    }

    canvas.ontouchstart = function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        paint[e.changedTouches[i].identifier + 1] = true;
        addToPath(e.changedTouches[i].identifier + 1, e.changedTouches[i].pageX - this.offsetLeft, e.changedTouches[i].pageY - this.offsetTop);
      }
    }

    canvas.ontouchmove = function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (paint[e.changedTouches[i].identifier + 1])
          addToPath(e.changedTouches[i].identifier + 1, e.changedTouches[i].pageX - this.offsetLeft, e.changedTouches[i].pageY - this.offsetTop, true);
      }
    }

    canvas.ontouchend = canvas.ontouchleave = canvas.ontouchcancel = function(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        paint[e.changedTouches[i].identifier + 1] = false;
      }

      cb.try(function(state) {
        state.global.deviceState[state.device('id')]('paths', paths);
      });
    }

    cb.try(function(state) {
      if (typeof state.global('deviceState') === 'undefined')
        state.global('deviceState', {});
      if (typeof state.global.deviceState(state.device('id')) === 'undefined')
        state.global.deviceState(state.device('id'), {});
      if (typeof state.global.deviceState[state.device('id')]('paths') === 'undefined')
        state.global.deviceState[state.device('id')]('paths', []);
    }).then(function(state) {
      loaded = true;

      paths = state.global.deviceState[state.device('id')]('paths');
      for (var i = 0; i < paths.length; i++)
        lastDraw[i] = 0;
      redraw(paths);
    }).done();

    cb.on('change', function(state) {
      if (!loaded)
        return;

      var repaint = true;
      for (var i = 0; i < paint.length; i++)
        if (paint[i]) repaint = false;

      if (repaint) {
        paths = state.global.deviceState[state.device('id')]('paths');
        redraw(paths);
      }
    });

    parentElement.appendChild(canvas);

  };

  function propegateChanges(state) {

  }

  return exports;
});
