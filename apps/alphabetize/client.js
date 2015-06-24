define(function() {
  var exports = {};
  var cb, parentElement;

  var wordlist, currentWordlist, currentWords, alphabetizedWords, orderedWords, correct, generating = true;
  var loaded;
  exports.startApp = function(_cb, _parentElement) {
    cb = _cb;
    parentElement = _parentElement;
    css('/apps/alphabetize/styles.css');

    cb.on('change', propegateChanges);
    cb.on('attempt', function(state) {
      if (state.global.deviceState[state.device('id')]('correct') === true)
        propegateChanges(state);
    });

    require(['/apps/alphabetize/wordlist.js'], function(_wordlist) {
      wordlist = _wordlist;
      cb.try(function(state) {
        if (typeof state.global('deviceState') === 'undefined')
          state.global('deviceState', {});
        if (typeof state.global.deviceState(state.device('id')) === 'undefined')
          state.global.deviceState(state.device('id'), {});
        if (typeof state.global.deviceState[state.device('id')]('wordlist') === 'undefined')
          state.global.deviceState[state.device('id')]('wordlist', 'animals');
        if (typeof state.global.deviceState[state.device('id')]('numToGenerate') === 'undefined')
          state.global.deviceState[state.device('id')]('numToGenerate', 6);
        if (typeof state.global.deviceState[state.device('id')]('currentWords') === 'undefined')
          generating = true;

      }).then(function(state) {
        loaded = true;
        propegateChanges(state);
      }).done();
    });
  };

  function generateNewWords(state) {
    var self = state.global.deviceState[state.device('id')];
    var numToGenerate = self('numToGenerate');
    var possibleWords = wordlist[self('wordlist')];
    var maxIndex = possibleWords.length;
    var newWords = [];

    for (var i = 0; i < numToGenerate; i++) {
      do {
        cur = possibleWords[Math.floor(Math.random() * maxIndex)];
      } while (newWords.indexOf(cur) !== -1);

      newWords.push(cur);
    }

    newWords = newWords.map(function(word, index) { return {'text': word, 'index': index}; });
    currentWordlist = state.global.deviceState[state.device('id')]('wordlist');

    self('currentWords', newWords);
    correct = self('correct', false);
    alphabetizedWords = undefined;
  }

  function propegateChanges(state) {
    if (typeof state.global.deviceState[state.device('id')]('currentWords') === 'undefined' && generating) {
      cb.try(function(state) {
        generateNewWords(state);
      }).then(function(state) {
        propegateChanges(state);
        generating = false;
      });
      return;
    }

    currentWords = state.global.deviceState[state.device('id')]('currentWords');
    correct = state.global.deviceState[state.device('id')]('correct');
    console.log(currentWords);

    if (typeof alphabetizedWords === 'undefined') {
      alphabetizedWords = [];
      currentWords.forEach(function(w) {
        alphabetizedWords.push(w);
      });
      alphabetizedWords.sort(function(a, b) {
        if (a.text < b.text) return -1;
        if (a.text > b.text) return 1;
        return 0;
      });
    }

    m.render(parentElement, Root);
  }

  function updateTransform(el, _, _, _, force) {
    if (parseInt(el.getAttribute('data-hold')) === 1 && !force)
      return;

    var getX = (force ? 'data-x' : 'new-x');
    var getY = (force ? 'data-y' : 'new-y');
    var x = parseFloat(el.getAttribute(getX));
    var y = parseFloat(el.getAttribute(getY));

    if (isNaN(x) || isNaN(y))
      return;

    if (!force) {
      el.setAttribute('data-x', x);
      el.setAttribute('data-y', y);
    }

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
                  'new-x': cur.x || 0,
                  'new-y': cur.y || 0,
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
                generating = true;
                cb.try(function(state) {
                  state.global.deviceState[state.device('id')]('currentWords', undefined);
               }).then(function() {
                 generating = false;
               });
              }
            }, ['Try some more'])
          ])
        ])
      );
    }
  };

  var inertia = false;
  require(['apps/alphabetize/interact.js'], function(interact) {
    interact('.word')
      .draggable({'restrict': {'restriction': '#app'}, 'inertia': true})
      .on('dragstart', function(e) {
        e.target.setAttribute('data-hold', 1);
      })
      .on('dragmove', function(e) {
        var x, y;

        e.target.setAttribute('data-x', x = parseFloat(e.target.getAttribute('data-x')) + e.dx);
        e.target.setAttribute('data-y', y = parseFloat(e.target.getAttribute('data-y')) + e.dy);

        updateTransform(e.target, true, true, true, true);

        cb.try(function(state) {
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
          cb.try(function(state) {
            var words = state.global.deviceState[state.device('id')].currentWords;
            var holder = words[currentWords.map(function(w) { return w.index; }).indexOf(parseInt(e.target.getAttribute('data-index')))];
            if (typeof holder('holderDropped') === 'undefined' || holder('holderDropped') === false) {
              holder('holderActive', true);
              e.target.classList.add('holderActive');
            }
          });
        },
        'ondragleave': function(e) {
          cb.try(function(state) {
            var words = state.global.deviceState[state.device('id')].currentWords;
            var holder = words[currentWords.map(function(w) { return w.index; }).indexOf(parseInt(e.target.getAttribute('data-index')))];
            holder('holderActive', false);
            e.target.classList.remove('holderActive');
            if (holder('holderDropped') === parseInt(e.relatedTarget.getAttribute('data-index'))) {
              e.target.classList.remove('holderDropped');
              holder('holderDropped', false);
            }
          });
        },
        'ondrop': function(e) {
          cb.try(function(state) {
            var words = state.global.deviceState[state.device('id')].currentWords;
            var holder = words[currentWords.map(function(w) { return w.index; }).indexOf(parseInt(e.target.getAttribute('data-index')))];
            if (typeof holder('holderDropped') === 'undefined' || holder('holderDropped') === false) {
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
