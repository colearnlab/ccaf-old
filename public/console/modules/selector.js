define(['exports'], function(exports) {    
  exports.controller = function(store) {
    return {
      'classroom': m.prop(null)
    };
  };
  
  exports.view = function(ctrl, store) {
    if (ctrl.classroom() === null) {
      return (
        m('div.row', [
          m('div.col-md-4.col-md-offset-4', [
            m('h4', 'Select a classroom'),
            Object.keys(store.classrooms).map(function(classroomId) {
              return m('a.list-group-item', {
                'onclick': function() {
                  ctrl.classroom(classroomId);
                  store.sendAction('set-identity', ctrl.classroom());
                }
              }, store.classrooms[classroomId].name)
            })
          ])
        ])
      );
    }
  };
});