define(function() {
  var exports = {};
  var cb, parentElement;

  var wordlist, currentWords, correct;
  var loaded;
  exports.startApp = function(_cb, _parentElement) {
    cb = _cb;
    parentElement = _parentElement;
    css('/apps/alphabetize/styles.css');

    cb.on('change', function(state) {
      if (!loaded)
        return;

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
        if (typeof state.global.deviceState[state.device('id')]('currentWords') === 'undefined') {
          generateNewWords(state);
        }
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

    self('currentWords', newWords);
  }

  function propegateChanges(state) {
    if (typeof state.global.deviceState[state.device('id')]('currentWords') === 'undefined') {
      cb.try(function(state) {
        generateNewWords(state);
      });
      return;
    }

    currentWords = state.global.deviceState[state.device('id')]('currentWords');

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
      var orderedWords = currentWords.reduce(function(acc, cur) {
        acc[cur.index] = cur;
        return acc;
      }, []);

      return (
        m('div', [
          m('div#allWords', [
            m('div.directive', 'Alphabetize the words!'),
            orderedWords.map(function(cur, index) {
              return m('div.wordHolder', {
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
          ])
        ])
      );
    }
  };

  var inertia = false;
  require(['apps/alphabetize/interact.js'], function(interact) {
    interact('.word')
      .draggable({'restrict': {'restriction': '#app'}})
      .on('dragstart', function(e) {
        e.target.setAttribute('data-hold', 1);
      })
      .on('dragmove', function(e) {
        var x, y;

        e.target.setAttribute('data-x', x = parseFloat(e.target.getAttribute('data-x')) + e.dx);
        e.target.setAttribute('data-y', y = parseFloat(e.target.getAttribute('data-y')) + e.dy);

        cb.try(function(state) {
          var words = state.global.deviceState[state.device('id')].currentWords;
          var cur = words[currentWords.map(function(w) { return w.index; }).indexOf(parseInt(e.target.getAttribute('data-index')))];
          cur('x', x);
          cur('y', y);
        }).done();

        updateTransform(e.target, true, true, true, true);
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
          e.target.classList.add('activeDrop');
        },
        'ondragleave': function(e) {
          e.target.classList.remove('activeDrop');
          e.target.classList.remove('dropped');
          e.relatedTarget.classList.remove('answerDrop');
        },
        'ondrop': function(e) {
          e.target.classList.remove('activeDrop');
          e.target.classList.add('dropped');
          e.relatedTarget.classList.add('answerDrop');
        },
      });
  });

  return exports;
});
