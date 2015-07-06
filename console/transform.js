function updateTransform(target) {
  var x = (parseFloat(target.getAttribute('data-x')) || 0);
  var y = (parseFloat(target.getAttribute('data-y')) || 0);

  target.style.webkitTransform =
  target.style.transform =
  'translate(' + x + 'px, ' + y + 'px)';
}

interact('.resizeTile')
  .draggable({'restrict': {'restriction': '#device-well'}})
  .on('dragmove', function (event) {
      x = (parseFloat(event.target.parentNode.getAttribute('data-x')) || 0) + event.dx;
      y = (parseFloat(event.target.parentNode.getAttribute('data-y')) || 0) + event.dy;

      // update the posiion attributes
      event.target.parentNode.setAttribute('data-x', x);
      event.target.parentNode.setAttribute('data-y', y);

      updateTransform(event.target.parentNode);
  })
  .on('dragend', function(event) {
    stm.try(function(state) {
      var device = state.devices[state('devices').map(function(d) { return d.id; }).indexOf(parseInt(event.target.parentNode.getAttribute('data-id')))];
      if (typeof device === 'undefined')
        return;
      device.location('x', 100 * 100 * event.target.parentNode.getAttribute('data-x') / (60 * document.documentElement.clientWidth));
      device.location('y', 100 * 100 * event.target.parentNode.getAttribute('data-y') / (40 * document.documentElement.clientWidth));
    });
  });

interact('.resizeTile')
  .resizable({edges: { left: false, right: true, bottom: true, top: false }})
  .on('resizemove', function (event) {
    var target = event.target;

    // update the element's style
    target.style.width  = event.rect.width / (document.documentElement.clientWidth / 100) + 'vw';
    target.style.height = event.rect.height / (document.documentElement.clientWidth / 100) + 'vw';
  })
  .on('resizeend', function(event) {
    stm.try(function(state) {
      var device = state.devices[state('devices').map(function(d) { return d.id; }).indexOf(parseInt(event.target.parentNode.getAttribute('data-id')))];

      device.screen('width', event.target.style.width.replace('vw', ''));
      device.screen('height', event.target.style.height.replace('vw', ''));
    });
  });

interact('.deviceActive')
.dropzone({
  'accept': '.appIcon',
  'ondragenter': function(event) {
    event.target.classList.add('drop-target');
    document.getElementById('device-well').classList.add('panel-drop');
  },
  'ondragleave': function(event) {
    event.target.classList.remove('drop-target');
    document.getElementById('device-well').classList.remove('panel-drop');
  },
  'ondrop': function(event) {
    event.target.classList.remove('drop-target');
    document.getElementById('device-well').classList.remove('panel-drop');

    stm.try(function(state) {
      api(state)
        .device(event.target.getAttribute('data-id'))
        .loadApp(event.relatedTarget.getAttribute('data-path'));
        /*
      var device = state.devices[state('devices').map(function(d) { return d.id; }).indexOf(parseInt(event.target.getAttribute('data-id')))];
      device('app', event.relatedTarget.getAttribute('data-path'));
      device('project', undefined);*/
    });
  }
});

interact('.trash')
.dropzone({
  'accept': '.trashable',
  'ondragenter': function(event) {
    event.target.classList.add('trash-active');
    document.getElementById('device-well').classList.add('panel-drop');
  },
  'ondragleave': function(event) {
    event.target.classList.remove('trash-active');
    document.getElementById('device-well').classList.remove('panel-drop');
  },
  'ondrop': function(event) {
    event.relatedTarget.parentNode.setAttribute('data-deleted', '1');
    event.target.classList.remove('trash-active');
    document.getElementById('device-well').classList.remove('panel-drop');
    stm.try(function(state) {
      var devices = state('devices');
      var deviceIndex = state('devices').map(function(d) { return d.id; }).indexOf(parseInt(event.relatedTarget.parentNode.getAttribute('data-id')));
      devices.splice(deviceIndex, 1);
      state('devices', devices);
    });
  }
});

interact('.appIcon')
.draggable({
  'onstart': function(event) {
    event.target.setAttribute('data-save-webkit-transform', event.target.style.webkitTransform);
    event.target.setAttribute('data-save-transform', event.target.style.transform);

    event.target.style.visibility = 'visible';

    event.target.classList.remove('docked');
  },
  'onmove': function (event) {
    x = (parseFloat(event.target.getAttribute('data-x')) || 0) + event.dx;
    y = (parseFloat(event.target.getAttribute('data-y')) || 0) + event.dy;

    // update the posiion attributes
    event.target.setAttribute('data-x', x);
    event.target.setAttribute('data-y', y);

    updateTransform(event.target);
  },
  'onend': function(event) {
    event.target.style.visibility = 'inherit';

    event.target.setAttribute('data-x', 0);
    event.target.setAttribute('data-y', 0);

    event.target.classList.add('docked');

    event.target.style.webkitTransform = event.target.getAttribute('data-save-webkit-transform');
    event.target.style.transform = event.target.getAttribute('data-save-transform');
  }
});
