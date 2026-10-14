import "@mantine/charts/styles.css";
import "@mantine/core/styles.css";
import "./App.css";

import React, { useEffect, useRef, useState } from "react";
import { LineChart } from "@mantine/charts";
import { createTheme, MantineProvider, Popover } from "@mantine/core";
import {
  IconChartLine,
  IconCube,
  IconList,
  IconStopwatch,
  IconTrash,
} from "@tabler/icons-react";
import CubeNet, { CubeStyle } from "./CubeNet";
import ScrambleText from "./ScrambleText";
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
  const centiseconds = Math.round(seconds * 100);
  const minutes = Math.floor(centiseconds / 6000);
  const remainder = (centiseconds % 6000) / 100;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(2).padStart(5, "0")}`;
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
    target.isContentEditable ||
      target.closest(
        'button, a, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="menu"]',
      ),
  );

function CubeStyleReview({
  scramble,
  selected,
}: {
  scramble: string;
  selected: CubeStyle;
}) {
  const options: [CubeStyle, string][] = [
    ["flat", "Flat"],
    ["neon", "Neon"],
    ["cyber", "Cyber"],
  ];
  return (
    <main className="cube-review">
      <a className="back-link" href="?">
        Back to timer
      </a>
      <h1>Cube finishes</h1>
      <div className="cube-options">
        {options.map(([style, title]) => (
          <a
            className={`panel cube-option cube-style-${style}`}
            key={style}
            href={`?cube=${style}`}
            aria-label={`Use ${title} finish`}
            aria-current={selected === style ? "true" : undefined}
          >
            <div className="option-cube">
              <ScrambleCube scramble={scramble} side={85} style={style} />
            </div>
            <h2>{title}</h2>
          </a>
        ))}
      </div>
    </main>
  );
}

const App: React.FC = () => {
  const [cubeStyle, setCubeStyle] = useState<CubeStyle>(() => {
    const requested = new URLSearchParams(window.location.search).get("cube");
    return requested === "flat" || requested === "neon" ? requested : "cyber";
  });
  const [finishOpen, setFinishOpen] = useState(false);
  const finishOpenRef = useRef(finishOpen);
  finishOpenRef.current = finishOpen;
  const timerSurface = useRef<HTMLDivElement>(null);
  const finishWasOpen = useRef(false);
  useEffect(() => {
    const closed = finishWasOpen.current && !finishOpen;
    finishWasOpen.current = finishOpen;
    if (!closed) {
      return undefined;
    }
    // Let the closing input event finish its native focus action first.
    const focusTimeout = window.setTimeout(() => {
      const active = document.activeElement;
      // Resume timing after the picker; preserve deliberate outside-control focus.
      if (
        !active ||
        active === document.body ||
        active.closest(".cube-display, .cube-finish-popover")
      ) {
        timerSurface.current?.focus({ preventScroll: true });
      }
    }, 0);
    return () => window.clearTimeout(focusTimeout);
  }, [finishOpen]);
  const scramblePanel = useRef<HTMLElement>(null);
  const [today, setToday] = useState(() => new Date());
  const todayString = today.toISOString().split("T")[0];
  const localDateString = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
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
    const panel = scramblePanel.current;
    if (panel) {
      const bounds = panel.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        panel.scrollIntoView({ block: "start", behavior: "instant" });
      }
    }
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
    if (event.code === "Escape" && finishOpenRef.current) {
      event.preventDefault();
      setFinishOpen(false);
      return;
    }
    if (isControl(event.target)) {
      return;
    }
    // Repeated Space keydowns have their own browser scrolling default.
    // Consume them without changing the hold/start/stop lifecycle.
    if (event.code === "Space") {
      event.preventDefault();
    }
    if (finishOpenRef.current) {
      return;
    }
    if (event.repeat) {
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
    if (isControl(event.target)) {
      if (event.code === keyboardHeld.current) {
        keyboardHeld.current = null;
        cancel();
      }
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
    }
    if (finishOpenRef.current) {
      keyboardHeld.current = null;
      cancel();
      return;
    }
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
    const focus = (event: FocusEvent) => {
      if (isControl(event.target)) {
        keyboardHeld.current = null;
        cancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", blur);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("focusin", focus);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", blur);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("focusin", focus);
      clearHold();
    };
  }, [review]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Closing the picker through the timer must not become a timing gesture.
    if (finishOpenRef.current) {
      setFinishOpen(false);
      return;
    }
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
        <CubeStyleReview scramble={scramble} selected={cubeStyle} />
      ) : (
        <div className="app-layout">
          <header className="app-header">
            <a className="brand" href="#timer" aria-label="CubeTimer365 timer">
              <IconCube size={26} stroke={1.8} />
              <span>
                CubeTimer<span className="lime">365</span>
              </span>
            </a>
            <span className="header-caption">One day. One scramble.</span>
            <time dateTime={localDateString}>
              {today.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </time>
          </header>
          <main className="practice-grid">
            <section
              ref={scramblePanel}
              className="panel scramble-panel"
              aria-labelledby="scramble-title"
            >
              <div className="scramble-content">
                <h1 className="eyebrow" id="scramble-title">
                  Daily scramble
                </h1>
                <ScrambleText scramble={scramble} />
              </div>
              <div className="cube-display">
                <Popover
                  opened={finishOpen}
                  onChange={setFinishOpen}
                  position="bottom"
                  width={304}
                  trapFocus
                  returnFocus={false}
                  transitionProps={{ duration: 0 }}
                >
                  <Popover.Target>
                    <button
                      type="button"
                      className="cube-style-trigger"
                      aria-label="Choose cube finish"
                      onClick={() => setFinishOpen((open) => !open)}
                    >
                      <ScrambleCube
                        scramble={scramble}
                        side={96}
                        style={cubeStyle}
                      />
                    </button>
                  </Popover.Target>
                  <Popover.Dropdown
                    className="cube-finish-popover"
                    aria-label="Cube finish"
                  >
                    <div className="cube-finish-grid">
                      {(
                        [
                          ["cyber", "Cyber · Round"],
                          ["neon", "Neon · Round"],
                          ["flat", "Flat · Round"],
                        ] as const
                      ).map(([style, label]) => (
                        <button
                          key={style}
                          type="button"
                          className="cube-finish-choice"
                          aria-label={label}
                          aria-pressed={cubeStyle === style}
                          data-autofocus={cubeStyle === style || undefined}
                          onClick={() => {
                            setCubeStyle(style);
                            setFinishOpen(false);
                          }}
                        >
                          <span
                            className="cube-finish-preview"
                            aria-hidden="true"
                          >
                            <ScrambleCube
                              scramble={scramble}
                              side={38}
                              style={style}
                            />
                          </span>
                          <span
                            className="cube-finish-check"
                            aria-hidden="true"
                          >
                            {cubeStyle === style ? "✓" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </Popover.Dropdown>
                </Popover>
              </div>
            </section>
            <section
              id="timer"
              className={`panel timer-panel ${phase}`}
              aria-label="Solve timer"
            >
              <div
                ref={timerSurface}
                className="timer-surface"
                role="button"
                tabIndex={0}
                aria-label="Timer surface. Hold Space or touch until ready, release to start. Press Space or touch to stop and save. Escape cancels the attempt."
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onLostPointerCapture={onPointerCancel}
                onContextMenu={(event) => event.preventDefault()}
              >
                <div className="timer-status" aria-live="polite">
                  <span className="status-dot" />
                  {status}
                </div>
                <div className="timer-digits" data-testid="timer-digits">
                  {Array.from(formatTime(timerDisplay)).map(
                    (character, index) => (
                      <span
                        key={index}
                        className={
                          character === ":" || character === "."
                            ? "timer-separator"
                            : "timer-digit"
                        }
                      >
                        {character}
                      </span>
                    ),
                  )}
                </div>
                <p className="keyboard-hint">
                  <kbd>SPACE</kbd>
                  <span>
                    {phase === "running"
                      ? "Press Space to save · Esc to cancel"
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
                  <p>No solves yet.</p>
                </div>
              ) : (
                <div className="history-scroll">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Time</th>
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
                          return (
                            <tr
                              key={index}
                              className={row === 0 ? "latest-solve" : ""}
                            >
                              <td>{index + 1}</td>
                              <td className={time === best ? "best-solve" : ""}>
                                {formatTime(time)}
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
                  Solve times
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
                  <p>No data yet.</p>
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
              {history.length > 0 && (
                <p className="chart-caption">Solve number →</p>
              )}
            </section>
          </main>
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
