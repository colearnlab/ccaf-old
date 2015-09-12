define(function() {
  var exports = {};
  
  var classroomSelect = {}, deviceSelect = {};
  
  exports.controller = function(args) {
    return {
      'state': m.prop(classroomSelect)
    }
  };
  
  exports.view = function(ctrl, args) {
    return m('div', m.component(ctrl.state(), {ctrl: ctrl, stm: args.stm}))
  };

  classroomSelect.view = function(_, args) {
    return m('div', 'hi');
  }
  
  return exports;
});