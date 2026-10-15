export type AverageSize = 5 | 12;

export interface SolveStatisticsRow {
  attempt: number;
  time: number;
  ao5: number | null;
  ao12: number | null;
}

export interface SolveStatistics {
  data: SolveStatisticsRow[];
  bestSingle: number | null;
  bestAO5: number | null;
  bestAO12: number | null;
  maxFinite: number | null;
  totalTime: number;
}

export function formatTime(seconds: number | null) {
  if (seconds === null) {
    return "—";
  }
  if (seconds === Infinity) {
    return "DNF";
  }
  const centiseconds = Math.round(seconds * 100);
  const minutes = Math.floor(centiseconds / 6000);
  const remainder = (centiseconds % 6000) / 100;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(2).padStart(5, "0")}`;
}

function averageAt(history: readonly number[], size: AverageSize, end: number) {
  if (end < size) {
    return null;
  }
  // Inputs are effective seconds; Infinity represents DNF in the math layer.
  // Slice only this window, preserving chronology and the caller's history.
  const window = history
    .slice(end - size, end)
    .sort((a, b) => (a === b ? 0 : a - b));
  const counted = window.slice(1, -1);
  return counted.reduce((sum, time) => sum + time, 0) / counted.length;
}

const better = (best: number | null, value: number | null) =>
  value === null ? best : best === null ? value : Math.min(best, value);

export function calculateSolveStatistics(
  history: readonly number[],
): SolveStatistics {
  let bestSingle: number | null = null;
  let bestAO5: number | null = null;
  let bestAO12: number | null = null;
  let maxFinite: number | null = null;
  let totalTime = 0;
  const data: SolveStatisticsRow[] = history.map((time, index) => {
    const ao5 = averageAt(history, 5, index + 1);
    const ao12 = averageAt(history, 12, index + 1);
    bestSingle = better(bestSingle, time);
    bestAO5 = better(bestAO5, ao5);
    bestAO12 = better(bestAO12, ao12);
    if (Number.isFinite(time)) {
      maxFinite = maxFinite === null ? time : Math.max(maxFinite, time);
    }
    totalTime += time;
    return { attempt: index + 1, time, ao5, ao12 };
  });
  return { data, bestSingle, bestAO5, bestAO12, maxFinite, totalTime };
}
