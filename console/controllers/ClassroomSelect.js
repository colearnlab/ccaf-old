var ClassroomSelect = (function() {
  var ClassroomSelect = {
    'view': function(ctrl) {
      return (
        m('div.row', [
          m('div.col-md-4.col-md-offset-4', [
            m('h4', ['Select a classroom']),
            m('div.list-group', [
              classrooms.map(function(classroom) {
                return m('a.list-group-item', {'href': classroom.id, 'config': m.route}, classroom.props.name);
              })
            ])
          ])
        ])
      );
    }
  };

  return ClassroomSelect;
}());
