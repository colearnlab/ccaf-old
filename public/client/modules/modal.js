define('modal', ['exports', 'mithril', 'clientUtil'], function(exports, m, clientUtil) {  
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
        }, [
          m('span', m.trust(args.text)),
          m('div.close-text', 'Tap to close')
        ]);
        
      else return m('span');
    }
  }
  
  clientUtil.css('/client/modal.css', true);
  
  exports.display = function(text) {
    var container;
    if ((container = document.getElementById('modal-container')) === null) {
      container = document.createElement('div');
      container.id = 'modal-container';
      document.body.appendChild(container)
    }
    
    m.mount(container, m.component(modal, {'text': text}));
  };
});