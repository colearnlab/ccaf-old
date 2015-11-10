define(['exports', 'clientUtil', 'mithril', 'interact', './main'], function(exports, clientUtil, m, interact, main) {
  var timeout, toggled = false;
  
  exports.view = function() {
    return m('span', [
      m('div.corner-shadow'),
      m('nav.circular-menu', [
        m('div.circle', {
          'config': function(el) {
            var items = el.childNodes;
            for(var i = 0, l = items.length; i < l; i++) {
              items[i].style.left = (50 - 75*Math.cos(-(Math.PI / 2) * Math.PI - 2*(1/(3*l))*i*Math.PI)).toFixed(4) + "%";
              items[i].style.top = (50 + 75*Math.sin(-(Math.PI / 2) * Math.PI - 2*(1/(3*l))*i*Math.PI)).toFixed(4) + "%";
            }
          }
        }, [
          m('span.glyphicon.glyphicon-remove', {
            'data-action': 'close',
            'style': 'color: red'
          }),
          m('span.glyphicon.glyphicon-arrow-left', {
            'data-action': 'return'
          }),
          m('span.glyphicon.glyphicon-phone', {
            'data-action': 'resetIdentity'
          }),
          m('span.glyphicon.glyphicon-share-alt', {
            'data-action': 'project'
          })
        ]),
        m('span.menu-button', {
          'ontouchstart': function(e) {
            toggled = true;
            document.querySelector('.menu-button').classList.add('activated');
            timeout = setTimeout(function() {
              if (toggled) {
                document.querySelector('.circle').classList.add('open');
                document.querySelector('.corner-shadow').style.width = '600px';
                document.querySelector('.corner-shadow').style.height = '700px';
                document.querySelector('.corner-shadow').style.opacity = '0.4';
              }
            }, 2000);
          },
          'ontouchend': function(e) {
            toggled = false;
            document.querySelector('.menu-button').classList.remove('activated');
            clearTimeout(timeout);
            setTimeout(function() {
              document.querySelector('.circle').classList.remove('open');
              document.querySelector('.corner-shadow').style.width = '400px';
              document.querySelector('.corner-shadow').style.height = '500px';
              document.querySelector('.corner-shadow').style.opacity = '0.25';
            }, 50);
          }
        }, [
          m('span.glyphicon.glyphicon-lock')
        ])
      ])
    ]);
  };

  interact('.menu-button')
    .draggable({
      'onmove': function(e) {
        var x, y;
        x = (parseFloat(e.target.getAttribute('data-x')) || 0) + e.dx;
        y = (parseFloat(e.target.getAttribute('data-y')) || 0) + e.dy;

        e.target.setAttribute('data-x', x);
        e.target.setAttribute('data-y', y);

        if (!document.querySelector('.circle').classList.contains('open') || !toggled)
          return (toggled = x < 20 && y < 29);

        e.target.style.webkitTransform =
        e.target.style.transform =
          'translate(' + x + 'px, ' + y + 'px)';
      },
      'onend': function(e) {
        e.target.setAttribute('data-x', 0);
        e.target.setAttribute('data-y', 0);

        e.target.style.webkitTransition = e.target.style.transition = '0.25s all';
        e.target.style.webkitTransform =
        e.target.style.transform = '';
        setTimeout(function() {
          e.target.style.webkitTransition = e.target.style.transition = '';
        }, 250);
      }
    })

  interact('.circle span')
    .dropzone({
      'accept': '.menu-button',
      'ondragenter': function(e) {
        if (!document.querySelector('.circle').classList.contains('open'))
          return;

        e.relatedTarget.style.opacity = 0;
        e.target.classList.add('activated');
      },
      'ondragleave': function(e) {
        if (!document.querySelector('.circle').classList.contains('open'))
          return;

        e.relatedTarget.style.opacity = 1;
        e.target.classList.remove('activated');
      },
      'ondrop': function(e) {
        if (!document.querySelector('.circle').classList.contains('open'))
          return;

        e.relatedTarget.style.opacity = 1;
        e.target.classList.remove('activated');

        switch (e.target.getAttribute('data-action')) {
          case 'close': if (clientUtil.parameter('electron')) require('ipc').send('close-window'); break;
          case 'resetIdentity': main.resetIdentity(); break;
          case 'return': break;
        }
      },
      'ondropdeactivate': function(e) {
        e.relatedTarget.style.opacity = 1;
        e.target.classList.remove('activated');
      }
    });
});