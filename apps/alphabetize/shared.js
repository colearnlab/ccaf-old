define(function() {
  var exports = {};

  exports.generateNewWords = function(deviceState, wordList) {
    var possibleWords = wordList[deviceState('wordList')];
    var push, newWords = [], alphabetizedWords = [];

    for (var i = 0, numToGenerate = deviceState('numToGenerate'); i < numToGenerate; i++) {
      do {
        cur = possibleWords[Math.floor(Math.random() * possibleWords.length)];
      } while (newWords.map(function(nw) { return nw.text; }).indexOf(cur) !== -1);

      push = {'text': cur, 'index': i, 'holderActive': false, 'holderDropped': false};
      newWords.push(push);
      alphabetizedWords.push(push);
    }

    alphabetizedWords.sort(function(a, b) {
      if (a.text < b.text) return -1;
      if (a.text > b.text) return 1;
      return 0;
    });

    deviceState('currentWords', newWords);
    deviceState('alphabetizedWords', alphabetizedWords);
    deviceState('correct', false);
  };

  return exports;
});
