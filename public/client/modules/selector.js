define(function() {
  var exports = {};
  
  var fnRef;
  
  exports.controller = function(args) {
    var classrooms = m.prop({});
    m.startComputation();
    args.cb.get('classrooms', fnRef = function(data) {
      classrooms(data);
      m.endComputation();
    });
    return {
      'state': m.prop(0),
      'selectedClassroom': m.prop(null),
      'classrooms': classrooms
    }
  };
  
  exports.view = function(ctrl, args) {
    if (ctrl.state() === 0) {
      return (
        m('div.row', [
          m('div.col-md-4.col-md-offset-4', [
            m('h4', 'Select a classroom'),
            Object.keys(ctrl.classrooms()).map(function(classroomId) {
              if(isNaN(classroomId))
                return '';
              return m('a.list-group-item', {
                'onclick': function() {
                  ctrl.selectedClassroom(classroomId);
                  ctrl.state(1);
                }
              }, ctrl.classrooms()[classroomId].name)
            })
          ])
        ])
      );
    } else if (ctrl.state() === 1) {
      return (
        m('div.row', [
          m('div.col-md-4.col-md-offset-4', [
            m('h4', 'Select a device'),
            Object.keys(ctrl.classrooms()[ctrl.selectedClassroom()].devices).map(function(deviceId) {
              if (isNaN(deviceId))
                return '';
                
              return m('a.list-group-item', {
                'onclick': function() {
                  args.callback(ctrl.selectedClassroom(), deviceId);
                }
              }, ctrl.classrooms()[ctrl.selectedClassroom()].devices[deviceId].name)
            })
          ])
        ])
      );
    }
  };
  
  return exports;
});