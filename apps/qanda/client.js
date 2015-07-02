define(function() {
  var exports = {};
  var cb, parentElement;

  var puzzles, currentPuzzle, currentPuzzleData, numCorrect, placed;
  var loaded;
  exports.startApp = function(_cb, _parentElement) {
    cb = _cb;
    parentElement = _parentElement;
    css('/apps/qanda/styles.css');

    cb.on('change', function(state) {
      if (!loaded)
        return;

      propegateChanges(state);
    });

    cb.on('attempt', function(state) {
      var currentPuzzleData = state.global.deviceState[state.device('id')]('currentPuzzleData');
      if (typeof currentPuzzleData === 'undefined')
        return;

      numCorrect = 0;
      placed = 0;
      currentPuzzleData.forEach(function(puzzleDatum, index) {
        if ('holderDrop' in puzzleDatum && puzzleDatum.holderDrop !== false) {
          placed++;
          if (puzzleDatum.holderDrop == index)
            numCorrect++;
        }
      });

      m.render(parentElement, Root);
    });

    requirejs(['/apps/qanda/puzzles.js'], function(_puzzles) {
      puzzles = _puzzles;
      cb.try(function(state) {
        if (typeof state.global('deviceState') === 'undefined')
          state.global('deviceState', {});
        if (typeof state.global.deviceState(state.device('id')) === 'undefined')
          state.global.deviceState(state.device('id'), {});
        if (typeof state.global.deviceState[state.device('id')]('currentPuzzle') === 'undefined') {
          state.global.deviceState[state.device('id')]('currentPuzzle', 'default');
          state.global.deviceState[state.device('id')]('currentPuzzleData', puzzles['default']);
        }
      }).then(function(state) {
        loaded = true;

        propegateChanges(state);
      }).done();
    });
  };

  function propegateChanges(state) {
    if (typeof state.global.deviceState === 'undefined')
      return;
    if (typeof currentPuzzle !== 'undefined' && state.global.deviceState[state.device('id')]('currentPuzzle') !== currentPuzzle) {
      currentPuzzle = state.global.deviceState[state.device('id')]('currentPuzzle');
      currentPuzzleData = state.global.deviceState[state.device('id')]('currentPuzzleData', puzzles[currentPuzzle]);
    }
    else
      currentPuzzleData = state.global.deviceState[state.device('id')]('currentPuzzleData');

    numCorrect = 0;
    placed = 0;
    currentPuzzleData.forEach(function(puzzleDatum, index) {
      if ('holderDrop' in puzzleDatum && puzzleDatum.holderDrop !== false) {
        placed++;
        if (puzzleDatum.holderDrop == index)
          numCorrect++;
      }
    });

    m.render(parentElement, Root);
  }

  function updateTransform(el) {
    var x = el.getAttribute('data-x');
    var y = el.getAttribute('data-y');

    el.style.webkitTransform =
    el.style.transform =
    'translate(' + x + 'px, ' + y + 'px)';
  }

  var Root = {
    'view': function(ctrl) {
      return (
        m('div', [
          m('div#clues', [
            currentPuzzleData.map(function(puzzleDatum, index) {
              return m('div', [
                m('span.clue', [puzzleDatum.clue]),
                m('span.clueHolder' + (puzzleDatum.activeDrop ? '.activeDrop' : '') + ('holderDrop' in puzzleDatum && puzzleDatum.holderDrop !== false ? '.dropped' : ''), {
                  'data-index': index
                }, [' '])
              ]);
            })
          ]),
          m('div', [
            currentPuzzleData.map(function(puzzleDatum, index) {
              return m('span.answer' + (puzzleDatum.answerDrop ? '.answerDrop' : ''), {
                'data-x': puzzleDatum.x || 0,
                'data-y': puzzleDatum.y || 0,
                'data-index': index,
                'config': updateTransform
              }, [
                puzzleDatum.answer
              ]);
            })
          ]),
          m('div.allAnswered', {
            'style': (placed === currentPuzzleData.length) ? 'visibility: visible;' : 'visibility: hidden;'
          }, [
            m('div', 'You got ' + numCorrect + ' out of ' + placed + '. ' + (numCorrect === placed ? 'Good job!': 'Keep trying!'))
          ])
        ])
      );
    }
  };

  requirejs(['apps/qanda/interact.js'], function(interact) {
    interact('.answer')
      .draggable({'restrict': {'restriction': '#app'}})
      .on('dragstart', function(e) {
        e.target.setAttribute('data-hold', 1);
      })
      .on('dragmove', function(e) {
        var x, y;
        e.target.setAttribute('data-x', x = parseFloat(e.target.getAttribute('data-x')) + e.dx);
        e.target.setAttribute('data-y', y = parseFloat(e.target.getAttribute('data-y')) + e.dy);

        cb.try(function(state) {
          var cur = state.global.deviceState[state.device('id')].currentPuzzleData[parseInt(e.target.getAttribute('data-index'))];
          cur('x', x);
          cur('y', y);
        });

        updateTransform(e.target);
      })
      .on('dragend', function(e) {
        e.target.setAttribute('data-hold', 0);
      })
      .preventDefault('never');

      interact('.clueHolder')
      .dropzone({
        'accept': '.answer',
        'overlap': 0.75,
        'ondragenter': function(e) {
          e.target.classList.add('activeDrop');

          cb.try(function(state) {
            var cur = state.global.deviceState[state.device('id')].currentPuzzleData[parseInt(e.target.getAttribute('data-index'))];
            if (cur('holderDrop') === 'undefined' || cur('holderDrop') === false)
              cur('activeDrop', true);
          });
        },
        'ondragleave': function(e) {
          cb.try(function(state) {
            var holder = state.global.deviceState[state.device('id')].currentPuzzleData[parseInt(e.target.getAttribute('data-index'))];
            var clue = state.global.deviceState[state.device('id')].currentPuzzleData[parseInt(e.relatedTarget.getAttribute('data-index'))];

            if (holder('holderDrop') == parseInt(e.relatedTarget.getAttribute('data-index'))) {
              e.target.classList.remove('activeDrop');
              e.target.classList.remove('dropped');
              e.relatedTarget.classList.remove('answerDrop');

              holder('activeDrop', false);
              holder('holderDrop', false);
              clue('answerDrop', false);
            }
          });
        },
        'ondrop': function(e) {
          e.target.classList.remove('activeDrop');
          e.target.classList.add('dropped');
          e.relatedTarget.classList.add('answerDrop');

          cb.try(function(state) {
            var holder = state.global.deviceState[state.device('id')].currentPuzzleData[parseInt(e.target.getAttribute('data-index'))];
            var clue = state.global.deviceState[state.device('id')].currentPuzzleData[parseInt(e.relatedTarget.getAttribute('data-index'))];
            holder('holderDrop', parseInt(e.relatedTarget.getAttribute('data-index')));
            clue('answerDrop', true);
          });
        },
      });
  });

  return exports;
});
