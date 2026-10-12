import "@mantine/charts/styles.css";
import "@mantine/core/styles.css";
import "./App.css";

import React, { useEffect, useRef, useState } from "react";
import { LineChart } from "@mantine/charts";
import { createTheme, MantineProvider } from "@mantine/core";
import {
  IconChartLine,
  IconCube,
  IconList,
  IconStopwatch,
  IconTrash,
} from "@tabler/icons-react";
import CubeNet from "./CubeNet";
import { generateScramble } from "./scramble";

const theme = createTheme({
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
});
const ScrambleCube = React.memo(CubeNet);
const HISTORY_KEY = "history";
const HISTORY_DATE_KEY = "today";
const formatTime = (seconds: number | null) => {
  if (seconds === null) {
    return "—";
  }
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
};
const calculateAO = (history: number[], count: number) => {
  if (history.length < count) {
    return null;
  }
  const selected = history.slice(-count).sort((a, b) => a - b);
  const trimmed = count >= 5 ? selected.slice(1, -1) : selected;
  return trimmed.reduce((sum, time) => sum + time, 0) / trimmed.length;
};
const isControl = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      'button, a, input, select, textarea, [contenteditable="true"], [role="dialog"], [role="menu"]',
    ),
  );

function CubeStyleReview({ scramble }: { scramble: string }) {
  const options = [
    [
      "original",
      "01 / Original",
      "Unchanged source rendering. Current baseline.",
    ],
    [
      "clear",
      "02 / Clear separators",
      "Original palette, stronger graphite separators.",
    ],
    [
      "soft",
      "03 / Soft enamel",
      "Softer six-color palette and quiet separators.",
    ],
    [
      "depth",
      "04 / Subtle depth",
      "Original palette with a restrained shadow and fine edges.",
    ],
  ];
  return (
    <main className="cube-review">
      <a className="back-link" href="?">
        ← Back to timer
      </a>
      <p className="eyebrow">CUBE APPEARANCE / REVIEW ONLY</p>
      <h1>Same projection. A few finishing touches.</h1>
      <p className="review-intro">
        Every option renders the same daily scramble with the original front
        square and four perspective faces. The timer keeps the original until
        you choose.
      </p>
      <div className="cube-options">
        {options.map(([style, title, description]) => (
          <section
            className={`panel cube-option cube-style-${style}`}
            key={style}
          >
            <div className="option-cube">
              <ScrambleCube scramble={scramble} side={115} />
            </div>
            <h2>{title}</h2>
            <p>{description}</p>
            {style === "original" && (
              <span className="baseline-tag">CURRENT BASELINE</span>
            )}
          </section>
        ))}
      </div>
      <p className="review-footnote">
        Appearance only: sticker positions, face orientation, projection
        coordinates and move permutations are identical.
      </p>
    </main>
  );
}

const App: React.FC = () => {
  const [today, setToday] = useState(() => new Date());
  const todayString = today.toISOString().split("T")[0];
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  const scramble = React.useMemo(() => generateScramble(seed), [seed]);
  const [history, setHistory] = useState<number[]>(() => {
    // Retain the existing storage keys and daily history behavior.
    if (localStorage.getItem(HISTORY_DATE_KEY) !== todayString) {
      localStorage.removeItem(HISTORY_KEY);
      localStorage.setItem(HISTORY_DATE_KEY, todayString);
    }
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as number[];
  });
  const historyDate = useRef(todayString);
  useEffect(() => {
    let boundaryTimeout: number;
    const refreshDate = () => {
      window.clearTimeout(boundaryTimeout);
      const now = new Date();
      setToday((previous) =>
        previous.toDateString() === now.toDateString() &&
        previous.toISOString().split("T")[0] === now.toISOString().split("T")[0]
          ? previous
          : now,
      );
      const localMidnight = new Date(now);
      localMidnight.setHours(24, 0, 0, 0);
      const utcMidnight = new Date(now);
      utcMidnight.setUTCHours(24, 0, 0, 0);
      boundaryTimeout = window.setTimeout(
        refreshDate,
        Math.min(localMidnight.getTime(), utcMidnight.getTime()) -
          now.getTime() +
          10,
      );
    };
    const visible = () => {
      if (!document.hidden) {
        refreshDate();
      }
    };
    refreshDate();
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearTimeout(boundaryTimeout);
      window.removeEventListener("focus", refreshDate);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  useEffect(() => {
    if (historyDate.current !== todayString) {
      historyDate.current = todayString;
      localStorage.setItem(HISTORY_DATE_KEY, todayString);
      setHistory([]);
    }
  }, [todayString]);
  const [phase, setPhase] = useState<"idle" | "holding" | "ready" | "running">(
    "idle",
  );
  const [timerDisplay, setTimerDisplay] = useState(0);
  const phaseRef = useRef(phase);
  const startedAt = useRef(0);
  const keyboardHeld = useRef<string | null>(null);
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    stopped: boolean;
  } | null>(null);
  const lastStopAt = useRef(-Infinity);
  const holdTimeout = useRef<number | null>(null);

  const changePhase = (next: typeof phase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const start = () => {
    if (phaseRef.current !== "ready") {
      return;
    }
    startedAt.current = performance.now();
    setTimerDisplay(0);
    changePhase("running");
  };
  const stop = () => {
    if (
      phaseRef.current !== "running" ||
      performance.now() - startedAt.current < 200
    ) {
      return;
    }
    lastStopAt.current = performance.now();
    const elapsed = (performance.now() - startedAt.current) / 1000;
    setTimerDisplay(elapsed);
    changePhase("idle");
    setHistory((previous) => [...previous, elapsed]);
  };
  const clearHold = () => {
    if (holdTimeout.current !== null) {
      window.clearTimeout(holdTimeout.current);
    }
    holdTimeout.current = null;
  };
  const cancel = () => {
    clearHold();
    if (phaseRef.current === "ready" || phaseRef.current === "holding") {
      changePhase("idle");
    }
  };

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    if (phase !== "running") {
      return undefined;
    }
    const interval = window.setInterval(
      () => setTimerDisplay((performance.now() - startedAt.current) / 1000),
      10,
    );
    return () => window.clearInterval(interval);
  }, [phase]);
  // csTimer defaults: 300ms readiness hold and 200ms input debounce.
  const beginHold = (stillHeld: () => boolean) => {
    if (
      phaseRef.current !== "idle" ||
      performance.now() - lastStopAt.current < 200
    ) {
      return;
    }
    changePhase("holding");
    holdTimeout.current = window.setTimeout(() => {
      holdTimeout.current = null;
      if (stillHeld() && phaseRef.current === "holding") {
        setTimerDisplay(0);
        changePhase("ready");
      }
    }, 300);
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (isControl(event.target) || event.repeat) {
      return;
    }
    if (event.code === "Escape") {
      if (phaseRef.current !== "idle") {
        event.preventDefault();
        keyboardHeld.current = null;
        pointer.current = null;
        cancel();
        if (phaseRef.current === "running") {
          // History has only numeric times; cancel an unsaved attempt rather than fabricate a DNF.
          lastStopAt.current = performance.now();
          changePhase("idle");
          setTimerDisplay(0);
        }
      }
      return;
    }
    const trigger =
      event.code === "Space" ||
      (event.code === "Enter" &&
        event.target instanceof HTMLElement &&
        Boolean(event.target.closest(".timer-surface")));
    if (phaseRef.current === "running") {
      if (trigger) {
        event.preventDefault();
        keyboardHeld.current = event.code;
      }
      stop();
      return;
    }
    if (!trigger) {
      return;
    }
    event.preventDefault();
    if (keyboardHeld.current || pointer.current) {
      return;
    }
    keyboardHeld.current = event.code;
    beginHold(() => keyboardHeld.current === event.code);
  };
  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.code !== keyboardHeld.current) {
      return;
    }
    event.preventDefault();
    keyboardHeld.current = null;
    clearHold();
    if (phaseRef.current === "ready") {
      start();
    } else {
      cancel();
    }
  };
  const review = new URLSearchParams(window.location.search).has(
    "cube-options",
  );
  useEffect(() => {
    if (review) {
      return undefined;
    }
    const blur = () => {
      keyboardHeld.current = null;
      pointer.current = null;
      cancel();
    };
    const visibility = () => {
      if (document.hidden) {
        blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", blur);
      document.removeEventListener("visibilitychange", visibility);
      clearHold();
    };
  }, [review]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      keyboardHeld.current ||
      pointer.current ||
      isControl(event.target)
    ) {
      return;
    }
    const stopped = phaseRef.current === "running";
    pointer.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      stopped,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (stopped) {
      stop();
    } else {
      beginHold(() => pointer.current?.id === event.pointerId);
    }
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = pointer.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      active?.id === event.pointerId &&
      (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 12 ||
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    ) {
      pointer.current = null;
      cancel();
    }
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove(event);
    const active = pointer.current;
    if (active?.id !== event.pointerId) {
      return;
    }
    pointer.current = null;
    clearHold();
    if (!active.stopped && phaseRef.current === "ready") {
      start();
    } else {
      cancel();
    }
  };
  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current?.id !== event.pointerId) {
      return;
    }
    pointer.current = null;
    cancel();
  };
  const best = history.length ? Math.min(...history) : null;
  const total = history.reduce((sum, time) => sum + time, 0);
  const data = history.map((time, index) => ({
    attempt: index + 1,
    time,
    ao5: calculateAO(history.slice(0, index + 1), 5),
    ao12: calculateAO(history.slice(0, index + 1), 12),
  }));
  const stats = [
    ["Best", best],
    ["AO5", calculateAO(history, 5)],
    ["AO12", calculateAO(history, 12)],
    ["Total time", total],
  ] as const;
  const ready = phase === "ready";
  const status =
    phase === "running"
      ? "Solving"
      : ready
        ? "Ready · release to start"
        : phase === "holding"
          ? "Keep holding…"
          : "Ready for your next solve";

  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      {review ? (
        <CubeStyleReview scramble={scramble} />
      ) : (
        <div className="app-layout">
          <header className="app-header">
            <a className="brand" href="#timer" aria-label="CubeTimer365 timer">
              <IconCube size={26} stroke={1.8} />
              <span>
                CubeTimer<span className="lime">365</span>
              </span>
            </a>
            <span className="header-caption">DAILY CUBE PRACTICE</span>
            <time dateTime={todayString}>
              {today.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </time>
          </header>
          <main className="practice-grid">
            <section
              className="panel scramble-panel"
              aria-labelledby="scramble-title"
            >
              <div className="scramble-content">
                <h1 className="eyebrow" id="scramble-title">
                  Daily scramble <span className="muted">/ 20 moves</span>
                </h1>
                <p className="scramble-moves">{scramble}</p>
                <p className="scramble-note">
                  <span className="shared-dot" />
                  One scramble. Shared by everyone today.
                </p>
              </div>
              <div className="cube-display">
                <ScrambleCube scramble={scramble} side={96} />
                <a href="?cube-options" className="cube-review-link">
                  Explore cube finishes ↗
                </a>
              </div>
            </section>
            <section
              id="timer"
              className={`panel timer-panel ${phase}`}
              aria-label="Solve timer"
            >
              <div
                className="timer-surface"
                role="button"
                tabIndex={0}
                aria-label="Timer surface. Hold Space or touch until ready, release to start. Press any key or touch to stop. Escape cancels the attempt."
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onLostPointerCapture={onPointerCancel}
                onContextMenu={(event) => event.preventDefault()}
                onKeyDown={(event) => handleKeyDown(event.nativeEvent)}
                onKeyUp={(event) => handleKeyUp(event.nativeEvent)}
              >
                <div className="timer-status" aria-live="polite">
                  <span className="status-dot" />
                  {status}
                </div>
                <div className="timer-digits" data-testid="timer-digits">
                  {formatTime(timerDisplay)}
                </div>
                <p className="keyboard-hint">
                  <kbd>SPACE</kbd>
                  <span>
                    {phase === "running"
                      ? "Press any key to stop"
                      : ready
                        ? "Release to start"
                        : phase === "holding"
                          ? "Keep holding until ready"
                          : "Hold until ready · release to start"}
                  </span>
                </p>
                <p className="touch-hint">
                  {phase === "running"
                    ? "Touch anywhere here to stop"
                    : ready
                      ? "Release to start"
                      : phase === "holding"
                        ? "Keep holding until ready"
                        : "Hold here until ready · release to start"}
                </p>
              </div>
            </section>
            <section
              className="stats-grid"
              id="stats"
              aria-label="Today's statistics"
            >
              {stats.map(([label, value]) => (
                <div className="stat" key={label}>
                  <h2 className="eyebrow">{label}</h2>
                  <p
                    className={label === "Best" && best !== null ? "lime" : ""}
                  >
                    {formatTime(value)}
                  </p>
                </div>
              ))}
            </section>
            <section
              className="panel history-panel"
              id="history"
              aria-labelledby="history-title"
            >
              <div className="panel-heading">
                <h2 className="eyebrow" id="history-title">
                  Today's solves
                </h2>
                <span className="count">
                  {history.length} {history.length === 1 ? "solve" : "solves"}
                </span>
              </div>
              {history.length === 0 ? (
                <div className="empty-history">
                  <IconList size={28} stroke={1.2} />
                  <p>Your session starts here.</p>
                  <span>Complete a solve to build your history.</span>
                </div>
              ) : (
                <div className="history-scroll">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>±</th>
                        <th>
                          <span className="sr-only">Delete</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history
                        .slice()
                        .reverse()
                        .map((time, row) => {
                          const index = history.length - 1 - row;
                          const delta =
                            index > 0 ? time - history[index - 1] : null;
                          return (
                            <tr
                              key={index}
                              className={row === 0 ? "latest-solve" : ""}
                            >
                              <td>{index + 1}</td>
                              <td className={time === best ? "best-solve" : ""}>
                                {formatTime(time)}
                              </td>
                              <td className="delta">
                                {delta === null
                                  ? "—"
                                  : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="delete-solve"
                                  aria-label={`Delete solve ${index + 1}`}
                                  onClick={() =>
                                    setHistory((previous) =>
                                      previous.filter((_, i) => i !== index),
                                    )
                                  }
                                >
                                  <IconTrash size={16} stroke={1.5} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="history-footer">
                Saved on this device <span className="shared-dot" />
              </div>
            </section>
            <section
              className="panel chart-panel"
              aria-labelledby="chart-title"
            >
              <div className="panel-heading">
                <h2 className="eyebrow" id="chart-title">
                  Session rhythm
                </h2>
                <div className="chart-legend">
                  <span>
                    <i className="solve-key" />
                    Solve time
                  </span>
                  <span>
                    <i className="ao5-key" />
                    AO5
                  </span>
                  <span>
                    <i className="ao12-key" />
                    AO12
                  </span>
                </div>
              </div>
              {history.length === 0 ? (
                <div className="empty-chart">
                  <IconChartLine size={32} stroke={1.2} />
                  <p>A little practice. A clearer picture.</p>
                  <span>Your solve times and averages will appear here.</span>
                </div>
              ) : (
                <LineChart
                  h={230}
                  data={data}
                  dataKey="attempt"
                  series={[
                    { name: "time", color: "#b1f54b" },
                    { name: "ao5", color: "#62b1ed" },
                    { name: "ao12", color: "#efaa59" },
                  ]}
                  unit="s"
                  withTooltip={false}
                  tickLine="none"
                  gridAxis="xy"
                  curveType="linear"
                  yAxisProps={{
                    domain: [
                      Math.max(0, Math.floor(Math.min(...history) - 0.25)),
                      Math.ceil(Math.max(...history) + 0.25),
                    ],
                  }}
                />
              )}
              <p className="chart-caption">
                {history.length
                  ? "Solve number →"
                  : "Keep showing up. Every solve counts."}
              </p>
            </section>
          </main>
          <footer className="app-footer">
            <span>One day. One scramble. Your progress.</span>
            <span>NIGHT / PRECISION</span>
          </footer>
          <nav className="mobile-nav" aria-label="Session sections">
            <a href="#timer">
              <IconStopwatch size={22} stroke={1.6} />
              Timer
            </a>
            <a href="#stats">
              <IconChartLine size={22} stroke={1.6} />
              Stats
            </a>
            <a href="#history">
              <IconList size={22} stroke={1.6} />
              History
            </a>
          </nav>
        </div>
      )}
    </MantineProvider>
  );
};
export default App;
