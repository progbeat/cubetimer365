// App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const moves = ['U', 'D', 'L', 'R', 'F', 'B'];
const modifiers = ['', "'", '2'];

function App() {
  const [scramble, setScramble] = useState('');
  const [isTiming, setIsTiming] = useState(false);
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('light');
  const [justStopped, setJustStopped] = useState(false);
  const timerRef = useRef(0);

  useEffect(() => {
    // Detect system color scheme
    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(matchMedia.matches ? 'dark' : 'light');
    const handleChange = (e) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    matchMedia.addEventListener('change', handleChange);

    // Generate today's scramble
    const today = new Date();
    const seed =
      today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    setScramble(generateScramble(seed));

    // Keyboard events
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (isTiming) {
          setIsTiming(false);
          setHistory((prev) => [...prev, timerRef.current]);
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
      matchMedia.removeEventListener('change', handleChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isTiming, justStopped]);

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

  return (
    <div className={`app ${theme}`}>
      <h1 className="scramble">{scramble}</h1>
      <div className="timer">{formatTime(timerDisplay)}</div>
      <h2>History</h2>
      <ul className="history">
        {[...history].reverse().map((time, index) => (
          <li key={index}>{formatTime(time)}</li>
        ))}
      </ul>
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
