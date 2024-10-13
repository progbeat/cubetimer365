// App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const moves = ['U', 'D', 'L', 'R', 'F', 'B'];
const modifiers = ['', "'", '2'];

function App() {
  const [scramble, setScramble] = useState('');
  const [isTiming, setIsTiming] = useState(false);
  const [history, setHistory] = useState([]);
  const [justStopped, setJustStopped] = useState(false);
  const timerRef = useRef(0);

  // Generate today's seed based on the date
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const HISTORY_KEY = `cubeTimerHistory_${seed}`; // Use seed in the key

  // Handle theme detection and switching
  useEffect(() => {
    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
    };

    // Initial theme detection
    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = matchMedia.matches ? 'dark' : 'light';
    applyTheme(currentTheme);

    // Listen for system theme changes
    const handleChange = (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      applyTheme(newTheme);
    };

    matchMedia.addEventListener('change', handleChange);

    return () => {
      matchMedia.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    // Load history from localStorage using the seed-based key
    const savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    setHistory(savedHistory);

    // Generate today's scramble using the seed
    setScramble(generateScramble(seed));

    // Keyboard events
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (isTiming) {
          setIsTiming(false);
          setHistory((prev) => {
            const newHistory = [...prev, timerRef.current];
            // Save updated history to localStorage
            localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
            return newHistory;
          });
          setJustStopped(true);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (justStopped) {
          setJustStopped(false);
        } else if (!isTiming) {
          timerRef.current = 0;
          setIsTiming(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTiming, justStopped, seed, HISTORY_KEY]);

  useEffect(() => {
    let interval;
    if (isTiming) {
      interval = setInterval(() => {
        timerRef.current += 10;
        setTimerDisplay(timerRef.current);
      }, 10);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTiming]);

  const [timerDisplay, setTimerDisplay] = useState(0);

  const formatTime = (time) => {
    const ms = ('0' + ((time / 10) % 100)).slice(-2);
    const s = ('0' + (Math.floor(time / 1000) % 60)).slice(-2);
    const m = Math.floor(time / 60000);
    return `${m}:${s}.${ms}`;
  };

  // Function to handle deleting a history record
  const handleDelete = (index) => {
    setHistory((prevHistory) => {
      const newHistory = prevHistory.filter((_, i) => i !== index);
      // Save updated history to localStorage
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return (
    <div className="app">
      <h1 className="scramble">{scramble}</h1>
      <div className="timer">{formatTime(timerDisplay)}</div>
      <div className="history-container">
        <h2 className="history-header">History</h2>
        <ul className="history">
          {history.slice(0).reverse().map((time, reversedIndex) => {
            const originalIndex = history.length - 1 - reversedIndex;
            return (
              <li key={originalIndex}>
                <span className="history-index">{originalIndex + 1}:</span>
                <span className="history-time">{formatTime(time)}</span>
                <button
                  className="delete-button"
                  onClick={() => handleDelete(originalIndex)}
                >
                  x
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function generateScramble(seed) {
  const scrambleLength = 20;
  const rng = seedRandom(seed);
  let scrambleMoves = [];
  let lastFace = '';
  let lastAxis = '';

  while (scrambleMoves.length < scrambleLength) {
    const moveIndex = Math.floor(rng() * moves.length);
    const moveFace = moves[moveIndex];
    const moveAxis = getAxis(moveFace);

    if (moveFace === lastFace) continue;

    if (
      scrambleMoves.length >= 2 &&
      moveAxis === lastAxis &&
      getAxis(scrambleMoves[scrambleMoves.length - 2][0]) === moveAxis &&
      getAxis(scrambleMoves[scrambleMoves.length - 1][0]) === moveAxis
    ) {
      continue;
    }

    const modifier = modifiers[Math.floor(rng() * modifiers.length)];
    scrambleMoves.push(moveFace + modifier);
    lastFace = moveFace;
    lastAxis = moveAxis;
  }

  return scrambleMoves.join(' ');
}

function getAxis(face) {
  if (face === 'U' || face === 'D') return 'Y';
  if (face === 'L' || face === 'R') return 'X';
  if (face === 'F' || face === 'B') return 'Z';
}

function seedRandom(seed) {
  return function () {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

export default App;
