// App.tsx
import '@mantine/charts/styles.css';
import '@mantine/core/styles.css';
import './App.css';

import React, { useState, useEffect, useRef } from 'react';
import {
  AppShell,
  Button,
  Divider,
  Flex,
  MantineProvider,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Title,
  createTheme,
  rem,
} from '@mantine/core';
import { useColorScheme } from '@mantine/hooks';
import { LineChart } from '@mantine/charts';
import { IconCube3dSphere, IconTrash } from '@tabler/icons-react';
import CubeNet from './CubeNet'; // Import the CubeNet component

// Theme setup
const theme = createTheme({
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#000000',
    ],
  },
  fontFamily: 'Roboto',
  headings: {
    sizes: {
      h1: { fontSize: rem(96), fontWeight: '900' },
      h2: { fontSize: rem(32), fontWeight: '900' },
    },
  },
});

// Utility functions
const formatTime = (timeInSeconds: number | null): string => {
  if (timeInSeconds === null) return '=+:+=.=+';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = (timeInSeconds % 60).toFixed(2).padStart(5, '0');
  return `${minutes.toString().padStart(2, '0')}:${seconds}`;
};

const calculateBest = (history: number[]): number | null => {
  if (history.length === 0) return null;
  return Math.min(...history);
};

const calculateTotalTime = (history: number[]): number => {
  return history.reduce((acc, time) => acc + time, 0);
};

const calculateAO = (history: number[], count: number): number | null => {
  if (history.length < count) return null;
  const selected = history.slice(-count).sort((a, b) => a - b);
  if (count >= 5) {
    const trimmed = selected.slice(1, -1);
    if (trimmed.length === 0) return null;
    return trimmed.reduce((acc, time) => acc + time, 0) / trimmed.length;
  }
  return selected.reduce((acc, time) => acc + time, 0) / selected.length;
};

const getAxis = (face: string): string => {
  if (face === 'U' || face === 'D') return 'Y';
  if (face === 'L' || face === 'R') return 'X';
  if (face === 'F' || face === 'B') return 'Z';
  return '';
};

function xoshiro128ss(seed: number): () => number {
  let s = new Uint32Array(4);
  // Initialize the state array with the seed
  function splitmix32(seed: number): number {
    let z = seed + 0x9e3779b9;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return z ^ (z >>> 16);
  }
  s[0] = splitmix32(seed);
  s[1] = splitmix32(s[0]);
  s[2] = splitmix32(s[1]);
  s[3] = splitmix32(s[2]);

  return function (): number {
    const t = s[1] << 9;
    let result = Math.imul(s[0], 5);
    result = ((result << 7) | (result >>> 25)) * 9;

    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];

    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);

    return (result >>> 0) / 4294967296;
  };
}

const generateScramble = (seed: number): string => {
  const moves = ['U', 'D', 'L', 'R', 'F', 'B'];
  const modifiers = ['', "'", '2'];
  const scrambleLength = 20;
  const rng = xoshiro128ss(seed);
  let scrambleMoves: string[] = [];
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
};

// Custom Hook for Timer Logic
function useTimer(isTiming: boolean, justStopped: boolean) {
  const [timerDisplay, setTimerDisplay] = useState(0);
  const timerRef = useRef<number>(0);

  useEffect(() => {
    let interval: number | undefined;
    if (isTiming) {
      interval = window.setInterval(() => {
        timerRef.current += 0.01;
        setTimerDisplay(timerRef.current);
      }, 10);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTiming]);

  return { timerDisplay, timerRef };
}

// StatsPanel Component
interface StatsPanelProps {
  history: number[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ history }) => {
  const bestTime = calculateBest(history);
  const totalTime = calculateTotalTime(history);
  const ao5 = calculateAO(history, 5);
  const ao12 = calculateAO(history, 12);

  return (
    <Paper px="md">
      <Table fz="md">
        <Table.Tbody>
          <Table.Tr>
            <Table.Td style={{ fontWeight: 'bold' }} c='purple.5'>Σ</Table.Td>
            <Table.Td
              style={{
                textAlign: 'right',
              }}
            >
              {formatTime(totalTime)}
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td style={{ fontWeight: 'bold' }} c='green.5'>ao12</Table.Td>
            <Table.Td
              style={{
                textAlign: 'right',
              }}
            >
              {formatTime(ao12)}
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td style={{ fontWeight: 'bold' }} c='blue.5'>ao5</Table.Td>
            <Table.Td
              style={{
                textAlign: 'right',
              }}
            >
              {formatTime(ao5)}
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td style={{ fontWeight: 'bold' }} c='orange.5'>best</Table.Td>
            <Table.Td
              style={{
                textAlign: 'right',
              }}
            >
              {formatTime(bestTime)}
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Paper>
  );
};

// HistoryList Component
interface HistoryListProps {
  history: number[];
  handleDelete: (index: number) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, handleDelete }) => {
  return (
    <ScrollArea style={{ flex: 1 }}>
      <Paper px="md" pt='sm'>
        <Table verticalSpacing="0" style={{ borderSpacing: 0 }} fz="sm">
          <Table.Tbody>
            {history.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={3}
                  style={{ textAlign: 'center', padding: '1rem' }}
                >
                  No records yet. Start timing to see your solves here.
                </Table.Td>
              </Table.Tr>
            ) : (
              history
                .slice()
                .reverse()
                .map((time, idx) => {
                  const originalIndex = history.length - 1 - idx;
                  return (
                    <Table.Tr key={originalIndex}>
                      <Table.Td
                        style={{
                          textAlign: 'right',
                          width: 1,
                          fontWeight: 'bold',
                        }}
                      >
                        {originalIndex + 1}
                      </Table.Td>
                      <Table.Td
                        style={{
                          padding: 0,
                          textAlign: 'left',
                          fontFamily: theme.fontFamilyMonospace,
                        }}
                      >
                        {formatTime(time)}
                      </Table.Td>
                      <Table.Td style={{ padding: 0, width: 1 }}>
                        <Button
                          variant="subtle"
                          color="red"
                          size="xs"
                          onClick={() => handleDelete(originalIndex)}
                        >
                          <IconTrash size={16} />
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </ScrollArea>
  );
};

// TimerDisplay Component
interface TimerDisplayProps {
  timerDisplay: number;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ timerDisplay }) => {
  return (
    <Paper withBorder shadow="md" radius="md" pr="xl">
      <Title
        order={1}
        style={{ fontFamily: theme.fontFamilyMonospace }}
      >
        {formatTime(timerDisplay)}
      </Title>
    </Paper>
  );
};

// ScrambleDisplay Component
interface ScrambleDisplayProps {
  scramble: string;
}

const ScrambleDisplay: React.FC<ScrambleDisplayProps> = ({ scramble }) => {
  return (
    <Paper mb="lg" radius="md" px="md" py="sm">
      <Title order={2}>
        {scramble}
      </Title>
    </Paper>
  );
};

// ChartArea Component (Updated)
interface ChartAreaProps {
  history: number[];
}

interface ChartDataPoint {
  attempt: number;
  time: number;
  ao5: number | null;
  ao12: number | null;
}

const ChartArea: React.FC<ChartAreaProps> = ({ history }) => {
  const chartData: ChartDataPoint[] = history.map((time, index) => {
    const historyUpToPoint = history.slice(0, index + 1);

    const ao5 = calculateAO(historyUpToPoint, 5);
    const ao12 = calculateAO(historyUpToPoint, 12);

    return {
      attempt: index + 1,
      time: time,
      ao5: ao5,
      ao12: ao12,
    };
  });

  const yDomain =
    history.length > 0
      ? [
          Math.max(0, Math.floor(Math.min(...history) - 0.25)),
          Math.ceil(Math.max(...history) + 0.25),
        ]
      : [0, 30]; // default domain

  return history.length === 0 ? (
    <Paper
      mb="lg"
      radius="md"
      px="md"
      py="sm"
      style={{
        minHeight: rem(300),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Title order={2}>
        No data to display. Complete some solves to see your performance chart here.
      </Title>
    </Paper>
  ) : (
    <LineChart
      h={rem(300)}
      data={chartData}
      dataKey="attempt"
      withLegend
      series={[
        { name: 'time', color: 'blue.9' },
        { name: 'ao5', color: 'blue.6' },
        { name: 'ao12', color: 'blue.3' },
      ]}
      unit="s"
      withTooltip={false}
      tickLine="none"
      gridAxis="xy"
      withRightYAxis={true}
      yAxisProps={{
        domain: yDomain,
      }}
      legendProps={{ layout: 'horizontal', align: 'center', verticalAlign: 'top' }}
    />
  );
};

const App: React.FC = () => {
  const preferredColorScheme = useColorScheme();
  const [scramble, setScramble] = useState('');
  const [isTiming, setIsTiming] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [justStopped, setJustStopped] = useState(false);

  const { timerDisplay, timerRef } = useTimer(isTiming, justStopped);

  // Generate today's seed based on the date
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  const HISTORY_KEY = `cubeTimerHistory_${seed}`; // Use seed in the key

  useEffect(() => {
    // Load history from localStorage using the seed-based key
    const savedHistory = JSON.parse(
      localStorage.getItem(HISTORY_KEY) || '[]'
    ) as number[];
    setHistory(savedHistory);

    // Generate today's scramble using the seed
    setScramble(generateScramble(seed));

    // Keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
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

    const handleKeyUp = (e: KeyboardEvent) => {
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
  }, [isTiming, justStopped, seed, HISTORY_KEY, timerRef]);

  const handleDelete = (index: number) => {
    setHistory((prevHistory) => {
      const newHistory = [...prevHistory];
      newHistory.splice(index, 1);
      // Save updated history to localStorage
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return (
      <MantineProvider theme={theme} forceColorScheme={preferredColorScheme}>
        <AppShell
          aside={{ width: 256, breakpoint: 'sm' }}
          style={{ height: '100vh' }}
        >
          <AppShell.Aside
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <Flex justify="center" direction="row" py={rem(4)} c="yellow">
              <IconCube3dSphere size={28}/>
              <Title order={3} style={{ fontFamily: "Rubik Puddles", fontWeight: 700 }}>&nbsp; CubeTimer365&nbsp;</Title>
            </Flex>
            <Divider mb={0} />
            <StatsPanel history={history} />
            <Divider mb={0} />
            <HistoryList history={history} handleDelete={handleDelete} />
          </AppShell.Aside>

          <AppShell.Main
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Stack align="center" gap="sm">
              <Flex align="center" justify="center" gap="xl">
                <TimerDisplay timerDisplay={timerDisplay} />
                <CubeNet scramble={scramble} side={96} />
              </Flex>
              <ScrambleDisplay scramble={scramble} />
              <ChartArea history={history} />
            </Stack>
          </AppShell.Main>
        </AppShell>
      </MantineProvider>
  );
};

export default App;
