define('modal', ['mithril', 'clientUtil'], function(m, clientUtil) {
  var exports = {};
  
  var modal = {
    'controller': function(args) {
      return {
        'display': m.prop(args.display || true)
      };
    },
    'view': function(ctrl, args) {
      if (ctrl.display())
        return m('div#modal', {
          'onclick': function(e) {
            ctrl.display(false);
          }
        }, m.trust(args.text));
      else return m('span');
    }
  }
  
  clientUtil.css('/client/modal.css');
  
  exports.display = function(text) {
    var container;
    if ((container = document.getElementById('modal-container')) === null) {
      container = document.createElement('div');
      container.id = 'modal-container';
      document.body.appendChild(container)
    }
    
    m.mount(container, m.component(modal, {'text': text}));
  };
  
  return exports;
});