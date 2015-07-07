define(function() {
  var exports = {};

  var stm, parentElement, api, shared;

  var wordList;
  var currentWords, alphabetizedWords, correct;
  var loaded;

  exports.startApp = function(_stm, _parentElement, _api, _shared) {
    stm = _stm;
    parentElement = _parentElement;
    shared = _shared;
    api = _api;

    css('/apps/alphabetize/styles.css');

    stm.on('change', propegateChanges);
    stm.on('attempt', function(state) {
      if (state.global.deviceState[state.device('id')]('correct') === true)
        propegateChanges(state);
    });

    requirejs(['/apps/alphabetize/wordList.js'], function(_wordList) {
      wordList = _wordList;
      stm.try(function(state) {
        var config = {};
        config['global.deviceState'] = {};
        config['global.deviceState.' + state.device('id')] = {};
        config['global.deviceState.' + state.device('id') + '.wordList'] = 'animals';
        config['global.deviceState.' + state.device('id') + '.numToGenerate'] = 6;
        api(state).config(config);
        if (typeof state.global.deviceState[state.device('id')]('currentWords') === 'undefined')
          shared.generateNewWords(state.global.deviceState[state.device('id')], wordList);
      }).then(function(state) {
        loaded = true;
        propegateChanges(state);
      }).done();
    });
  };

  function propegateChanges(state) {
    var self = state.global.deviceState[state.device('id')];

    currentWords = self('currentWords');
    alphabetizedWords = self('alphabetizedWords');
    correct = self('correct');

    m.render(parentElement, Root);
  }

  function updateTransform(el) {
    var x = parseFloat(el.getAttribute('data-x'));
    var y = parseFloat(el.getAttribute('data-y'));

    if (isNaN(x) || isNaN(y))
      return;

    el.style.webkitTransform =
    el.style.transform =
    'translate(' + x + 'px, ' + y + 'px)';
  }

  var Root = {
    'view': function(ctrl) {
      return (
        m('div', [
          m('div#allWords' + (correct ? '.dim' : ''), [
            m('div.directive', 'Alphabetize the words!'),
            currentWords.map(function(cur, index) {
              return m('div.wordHolder' + (cur.holderActive ? '.holderActive' : cur.holderDropped !== false && cur.holderDropped >= 0 ? '.holderDropped' : ''), {
                'data-index': index
              }, [
                m.trust('&#8203;'),
                m('span.word', {
                  'data-x': cur.x || 0,
                  'data-y': cur.y || 0,
                  'data-index': index,
                  'config': updateTransform
                }, [cur.text])
              ]);
            })
          ]),
          m('div' + (correct ? '#success' : '.noshow'), [
            'Congratulations! ',
            m('button', {
              'onclick': function(e) {
                stm.try(function(state) {
                  shared.generateNewWords(state.global.deviceState[state.device('id')], wordList);
               }).then(function(state) {
                 propegateChanges(state);
               });
              }
            }, ['Try some more'])
          ])
        ])
      );
    }
  };

  requirejs(['apps/alphabetize/interact.js'], function(interact) {
    interact('.word')
      .draggable({'restrict': {'restriction': '#app'}, 'inertia': true})
      .on('dragstart', function(e) {
        e.target.setAttribute('data-hold', 1);
      })
      .on('dragmove', function(e) {
        var x, y;

        e.target.setAttribute('data-x', x = parseFloat(e.target.getAttribute('data-x')) + e.dx);
        e.target.setAttribute('data-y', y = parseFloat(e.target.getAttribute('data-y')) + e.dy);

        updateTransform(e.target);

        stm.try(function(state) {
          var words = state.global.deviceState[state.device('id')].currentWords;
          var cur = words[currentWords.map(function(w) { return w.index; }).indexOf(parseInt(e.target.getAttribute('data-index')))];
          cur('x', x);
          cur('y', y);
        }).done();
      })
      .on('dragend', function(e) {
        e.target.setAttribute('data-hold', 0);
      })
      .preventDefault('never');

      interact('.wordHolder')
      .dropzone({
        'accept': '.word',
        'overlap': 0.75,
        'ondragenter': function(e) {
          stm.try(function(state) {
            var words = state.global.deviceState[state.device('id')].currentWords;
            var holder = words[currentWords.map(function(w) { return w.index; }).indexOf(parseInt(e.target.getAttribute('data-index')))];
            if (typeof holder('holderDropped') === 'undefined' || holder('holderDropped') === false) {
              holder('holderActive', true);
              e.target.classList.add('holderActive');
            }
          });
        },
        'ondragleave': function(e) {
          stm.try(function(state) {
            var words = state.global.deviceState[state.device('id')].currentWords;
            var holder = words[currentWords.map(function(w) { return w.index; }).indexOf(parseInt(e.target.getAttribute('data-index')))];
            holder('holderActive', false);
            e.target.classList.remove('holderActive');
            if (holder('holderDropped') == parseInt(e.relatedTarget.getAttribute('data-index'))) {
              e.target.classList.remove('holderDropped');
              holder('holderDropped', false);
            }
          });
        },
        'ondrop': function(e) {
          stm.try(function(state) {
            var words = state.global.deviceState[state.device('id')].currentWords;
            var holder = words[currentWords.map(function(w) { return w.index; }).indexOf(parseInt(e.target.getAttribute('data-index')))];
            if (holder('holderDropped') === false || holder('holderDropped') === parseInt(e.relatedTarget.getAttribute('data-index'))) {
              holder('holderActive', false);
              holder('holderDropped', parseInt(e.relatedTarget.getAttribute('data-index')));
              state.global.deviceState[state.device('id')]('correct', true);
              state.global.deviceState[state.device('id')]('currentWords').forEach(function(w, index) {
                if (typeof w.holderDropped === 'undefined' || w.holderDropped === false || w.holderDropped !== alphabetizedWords[index].index)
                  state.global.deviceState[state.device('id')]('correct', false);
              });

              e.target.classList.remove('holderActive');
              e.target.classList.add('holderDropped');
            }
          });
        },
      });
  });

  return exports;
});
