import React, { useState, useMemo } from 'react';
import { Calculator, Target, TrendingUp, Zap, Plus, X, BarChart3 } from 'lucide-react';

const WordleBot = () => {
  const [correctWord, setCorrectWord] = useState('');
  const [guesses, setGuesses] = useState(['']);
  const [analysis, setAnalysis] = useState(null);
  const [wordList, setWordList] = useState([
    'SLATE', 'ADIEU', 'ROATE', 'RAISE', 'ARISE', 'IRATE', 'ORATE', 'AROSE',
    'SOARE', 'STOAE', 'TARES', 'LARES', 'RALES', 'RATES', 'TALES', 'STARE'
  ]);
  const [wordListInput, setWordListInput] = useState('');
  const [showWordListInput, setShowWordListInput] = useState(false);

  // change ts to actual list from the txt later
  const processWordList = () => {
    if (!wordListInput.trim()) {
      alert('Please paste your word list');
      return;
    }

    const words = wordListInput
      .split('\n')
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length === 5);
    
    if (words.length === 0) {
      alert('No valid 5-letter words found. Please check your word list format.');
      return;
    }
    
    setWordList(words);
    setShowWordListInput(false);
    console.log(`Loaded ${words.length} words from pasted list`);
  };

  const getLetterFeedback = (guess, target) => {
    const result = [];
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    const targetCount = {};
    
    // letters in target
    targetLetters.forEach(letter => {
      targetCount[letter] = (targetCount[letter] || 0) + 1;
    });
    
    // mark correct positions
    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        result[i] = 'correct';
        targetCount[letter]--;
      } else {
        result[i] = 'absent';
      }
    });
    
    // mark present letters
    guessLetters.forEach((letter, i) => {
      if (result[i] === 'absent' && targetCount[letter] > 0) {
        result[i] = 'present';
        targetCount[letter]--;
      }
    });
    
    return result;
  };

  const getRemainingWords = (wordList, previousGuesses, target) => {
    return wordList.filter(word => {
      return previousGuesses.every(guess => {
        const feedback = getLetterFeedback(guess, target);
        const testFeedback = getLetterFeedback(guess, word);
        return JSON.stringify(feedback) === JSON.stringify(testFeedback);
      });
    });
  };

  const calculateWordScore = (word, remainingWords) => {
    if (remainingWords.length <= 1) return 0;
    
    const feedbackGroups = {};
    
    remainingWords.forEach(target => {
      const feedback = getLetterFeedback(word, target);
      const key = JSON.stringify(feedback);
      feedbackGroups[key] = (feedbackGroups[key] || 0) + 1;
    });
    
    let expectedRemaining = 0;
    Object.values(feedbackGroups).forEach(count => {
      const probability = count / remainingWords.length;
      expectedRemaining += probability * count;
    });
    
    return remainingWords.length - expectedRemaining;
  };

  const getBestGuess = (remainingWords, allWords = wordList) => {
    if (remainingWords.length <= 1) {
      return remainingWords[0] || allWords[0];
    }

    let bestWord = '';
    let bestScore = -1;
    
    // check remaining possible answers first
    remainingWords.forEach(word => {
      const score = calculateWordScore(word, remainingWords);
      if (score > bestScore) {
        bestScore = score;
        bestWord = word;
      }
    });
    
    // check common starting words if early in game
    if (remainingWords.length > 50) {
      allWords.slice(0, 20).forEach(word => {
        const score = calculateWordScore(word, remainingWords);
        if (score > bestScore) {
          bestScore = score;
          bestWord = word;
        }
      });
    }
    
    return bestWord || remainingWords[0] || allWords[0];
  };

  const calculateSkillScore = (guess, optimalGuess, remainingWords) => {
    if (!optimalGuess || !guess) return 50;
    
    const guessScore = calculateWordScore(guess, remainingWords);
    const optimalScore = calculateWordScore(optimalGuess, remainingWords);
    
    if (optimalScore === 0) return 99; // perf play when only one word left
    
    const efficiency = Math.min(100, Math.max(0, (guessScore / optimalScore) * 100));
    return Math.round(efficiency);
  };

  const calculateLuckScore = (guesses, correctWord) => {
    let totalLuck = 0;
    let remainingWords = [...wordList];
    
    guesses.forEach((guess, index) => {
      if (!guess || guess.length !== 5) return;
      
      const wordsBefore = remainingWords.length;
      remainingWords = getRemainingWords(remainingWords, [guess], correctWord);
      const wordsAfter = remainingWords.length;
      
      if (wordsBefore > 1) {
        const expectedReduction = calculateWordScore(guess, remainingWords);
        const actualReduction = wordsBefore - wordsAfter;
        const luckFactor = actualReduction > expectedReduction ? 
          Math.min(100, (actualReduction / expectedReduction) * 50) : 
          Math.max(0, 50 - (expectedReduction - actualReduction) * 2);
        totalLuck += luckFactor;
      }
    });
    
    return Math.round(totalLuck / Math.max(1, guesses.filter(g => g.length === 5).length));
  };

  const analyzeGame = () => {
    if (!correctWord || correctWord.length !== 5) {
      alert('Please enter a valid 5-letter word');
      return;
    }

    const validGuesses = guesses.filter(g => g.length === 5);
    if (validGuesses.length === 0) {
      alert('Please enter at least one guess');
      return;
    }

    let remainingWords = [...wordList];
    const results = [];
    let totalSkill = 0;

    validGuesses.forEach((guess, index) => {
      const optimalGuess = getBestGuess(remainingWords);
      const feedback = getLetterFeedback(guess, correctWord.toUpperCase());
      const skill = calculateSkillScore(guess, optimalGuess, remainingWords);
      const wordsRemaining = remainingWords.length;
      
      remainingWords = getRemainingWords(remainingWords, validGuesses.slice(0, index + 1), correctWord.toUpperCase());
      
      results.push({
        guess: guess.toUpperCase(),
        feedback,
        optimalGuess,
        skill,
        wordsRemaining,
        wordsAfter: remainingWords.length
      });
      
      totalSkill += skill;
    });

    const averageSkill = Math.round(totalSkill / validGuesses.length);
    const luck = calculateLuckScore(validGuesses.map(g => g.toUpperCase()), correctWord.toUpperCase());
    const solved = validGuesses[validGuesses.length - 1].toUpperCase() === correctWord.toUpperCase();

    setAnalysis({
      results,
      averageSkill,
      luck,
      solved,
      attempts: validGuesses.length
    });
  };

  const addGuess = () => {
    setGuesses([...guesses, '']);
  };

  const updateGuess = (index, value) => {
    const newGuesses = [...guesses];
    newGuesses[index] = value.toUpperCase();
    setGuesses(newGuesses);
  };

  const removeGuess = (index) => {
    if (guesses.length > 1) {
      const newGuesses = guesses.filter((_, i) => i !== index);
      setGuesses(newGuesses);
    }
  };

  const getSkillRating = (score) => {
    if (score >= 95) return { text: 'Genius', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' };
    if (score >= 85) return { text: 'Excellent', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' };
    if (score >= 70) return { text: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    if (score >= 50) return { text: 'Average', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
    return { text: 'Needs Work', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
  };

  const getLuckRating = (score) => {
    if (score >= 80) return { text: 'Very Lucky', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' };
    if (score >= 60) return { text: 'Lucky', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    if (score >= 40) return { text: 'Average', color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' };
    if (score >= 20) return { text: 'Unlucky', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    return { text: 'Very Unlucky', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
  };

  const getFeedbackStyle = (feedback) => {
    switch (feedback) {
      case 'correct': 
        return 'bg-green-500 border-green-600 text-white';
      case 'present': 
        return 'bg-yellow-400 border-yellow-500 text-white';
      default: 
        return 'bg-gray-400 border-gray-500 text-white';
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setCorrectWord('');
    setGuesses(['']);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Wordle Bot
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Analyze your Wordle performance with detailed statistics and optimal play suggestions
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* input */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Game Input
            </h2>
            
            <div className="space-y-6">
              {/* corr */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Today's Word
                </label>
                <input
                  type="text"
                  value={correctWord}
                  onChange={(e) => setCorrectWord(e.target.value.slice(0, 5).toUpperCase())}
                  className="w-full px-4 py-3 text-lg font-mono uppercase tracking-wider border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="SLATE"
                  maxLength={5}
                />
              </div>

              {/* guess */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Your Guesses
                </label>
                <div className="space-y-3">
                  {guesses.map((guess, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex items-center gap-1 text-sm font-medium text-slate-500 w-8">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        value={guess}
                        onChange={(e) => updateGuess(index, e.target.value.slice(0, 5))}
                        className="flex-1 px-4 py-3 text-lg font-mono uppercase tracking-wider border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder={`GUESS ${index + 1}`}
                        maxLength={5}
                      />
                      {guesses.length > 1 && (
                        <button
                          onClick={() => removeGuess(index)}
                          className="flex items-center justify-center w-12 h-12 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    onClick={addGuess}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-green-600 border-2 border-dashed border-green-300 rounded-xl hover:bg-green-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Guess
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* analyssi */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" />
            Analysis
            </h2>
            
            <div className="space-y-6">
              {/* word dict */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                {/* <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Dictionary</span>
                  <span className="text-xs text-blue-600 font-mono">
                    {wordList.length.toLocaleString()} words
                  </span>
                </div> */}
                {/* <button 
                  onClick={() => setShowWordListInput(!showWordListInput)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline transition-colors"
                >
                  {showWordListInput ? 'Hide word list editor' : 'Update word list'}
                </button> */}
              </div>

              {/* Word List Input */}
              {showWordListInput && (
                <div className="space-y-4">
                  <textarea
                    value={wordListInput}
                    onChange={(e) => setWordListInput(e.target.value)}
                    placeholder="Paste your word list here (one word per line)&#10;cigar&#10;rebut&#10;sissy&#10;humph&#10;awake&#10;..."
                    className="w-full h-32 px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={processWordList}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Load Words
                    </button>
                    <button
                      onClick={() => setShowWordListInput(false)}
                      className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* analyze Button */}
              <button
                onClick={analyzeGame}
                className="w-full px-6 py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg"
              >
                <BarChart3 className="w-5 h-5" />
                Analyze Performance
              </button>

              {analysis && (
                <button
                  onClick={resetAnalysis}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  New Analysis
                </button>
              )}
            </div>
          </div>
        </div>

        {/* results */}
        {analysis && (
          <div className="space-y-8">
            {/* stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${getSkillRating(analysis.averageSkill).bgColor} ${getSkillRating(analysis.averageSkill).borderColor} border-2 rounded-2xl p-6 text-center`}>
                <TrendingUp className={`w-8 h-8 mx-auto mb-3 ${getSkillRating(analysis.averageSkill).color}`} />
                <h3 className="text-sm font-medium text-slate-600 mb-1">Overall Skill</h3>
                <p className={`text-3xl font-bold mb-1 ${getSkillRating(analysis.averageSkill).color}`}>
                  {analysis.averageSkill}
                </p>
                <p className={`text-sm font-medium ${getSkillRating(analysis.averageSkill).color}`}>
                  {getSkillRating(analysis.averageSkill).text}
                </p>
              </div>

              <div className={`${getLuckRating(analysis.luck).bgColor} ${getLuckRating(analysis.luck).borderColor} border-2 rounded-2xl p-6 text-center`}>
                <Zap className={`w-8 h-8 mx-auto mb-3 ${getLuckRating(analysis.luck).color}`} />
                <h3 className="text-sm font-medium text-slate-600 mb-1">Luck</h3>
                <p className={`text-3xl font-bold mb-1 ${getLuckRating(analysis.luck).color}`}>
                  {analysis.luck}
                </p>
                <p className={`text-sm font-medium ${getLuckRating(analysis.luck).color}`}>
                  {getLuckRating(analysis.luck).text}
                </p>
              </div>

              <div className={`${analysis.solved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border-2 rounded-2xl p-6 text-center`}>
                <Target className={`w-8 h-8 mx-auto mb-3 ${analysis.solved ? 'text-green-600' : 'text-red-600'}`} />
                <h3 className="text-sm font-medium text-slate-600 mb-1">Result</h3>
                <p className={`text-3xl font-bold mb-1 ${analysis.solved ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.solved ? `${analysis.attempts}/6` : 'X/6'}
                </p>
                <p className={`text-sm font-medium ${analysis.solved ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.solved ? 'Solved!' : 'Failed'}
                </p>
              </div>
            </div>

            {/* analysis */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-6">Guess by Guess Analysis</h3>
              <div className="space-y-4">
                {analysis.results.map((result, index) => (
                  <div key={index} className="p-5 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-slate-900">
                        Guess {index + 1}
                      </h4>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-600">
                          Skill: <span className={`font-bold ${getSkillRating(result.skill).color}`}>
                            {result.skill}
                          </span>
                        </span>
                        {/* <span className="text-slate-600">
                          Bot suggested: <span className="font-mono font-bold text-slate-900">
                            {result.optimalGuess}
                          </span>
                        </span> */}
                      </div>
                    </div>

                    {/* wordle grid */}
                    <div className="flex gap-1 mb-4">
                      {result.guess.split('').map((letter, i) => (
                        <div
                          key={i}
                          className={`w-12 h-12 ${getFeedbackStyle(result.feedback[i])} font-bold text-lg rounded border-2 flex items-center justify-center`}
                        >
                          {letter}
                        </div>
                      ))}
                    </div>

                    <div className="text-sm text-slate-600">
                      {/* <span>Words eliminated: {result.wordsRemaining} → {result.wordsAfter}</span> */}
                      <span className="ml-4 text-slate-400">
                        ({result.wordsRemaining - result.wordsAfter} eliminated)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* perf summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-slate-900 mb-3">Performance Summary</h4>
              <p className="text-slate-700 leading-relaxed">
                You {analysis.solved ? `solved the puzzle in ${analysis.attempts} ${analysis.attempts === 1 ? 'guess' : 'guesses'}` : 'did not solve the puzzle'}
                {' '}with an average skill score of <span className="font-semibold">{analysis.averageSkill}</span> and a luck score of <span className="font-semibold">{analysis.luck}</span>.
                {analysis.averageSkill >= 80 ? ' Awesome strategic play!' : 
                 analysis.averageSkill >= 60 ? ' Good performance with room for improvement.' :
                 ' Consider starting with words like SLATE or FEAST for better frequency coverage.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WordleBot;