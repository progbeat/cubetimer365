import "@mantine/charts/styles.css";
import "@mantine/core/styles.css";
import "./App.css";

import React, { useEffect, useRef, useState } from "react";
import { LineChart } from "@mantine/charts";
import { createTheme, MantineProvider, Popover, Tooltip } from "@mantine/core";
import {
  IconChartLine,
  IconCrown,
  IconList,
  IconStopwatch,
  IconTrash,
} from "@tabler/icons-react";
import CubeNet, { CubeStyle } from "./CubeNet";
import ScrambleText from "./ScrambleText";
import { generateScramble } from "./scramble";
import { startAnalytics } from "./analytics";
import { calculateSolveStatistics, formatTime } from "./solveStatistics";
import LegacyHistoryImport from "./LegacyHistoryImport";
import { loadCubeStyle, rememberCubeStyle } from "./cubeStylePreference";
import About from "./About";
import DailyLogo from "./DailyLogo";
import { createCalendarMark } from "./calendarMark";
import { useDailyFavicon } from "./useDailyFavicon";
import {
  SOLVE_STORAGE_KEY,
  loadDailyHistory,
  saveDailyHistory,
  readLegacyHistory,
  type DailyHistory,
} from "./solveStorage";

const theme = createTheme({
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
});
const ScrambleCube = React.memo(CubeNet);
const sameDailyHistory = (left: DailyHistory, right: DailyHistory) =>
  left.date === right.date &&
  left.legacyMigration === right.legacyMigration &&
  left.history.length === right.history.length &&
  left.history.every((time, index) => time === right.history[index]);
const isControl = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.isContentEditable ||
      target.closest(
        'button, a, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="menu"], .history-best-label',
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
  useEffect(() => {
    startAnalytics();
  }, []);
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutOpenRef = useRef(aboutOpen);
  aboutOpenRef.current = aboutOpen;
  const [cubeStyle, setCubeStyle] = useState<CubeStyle>(() =>
    loadCubeStyle(window.location.search),
  );
  const [finishOpen, setFinishOpen] = useState(false);
  const finishOpenRef = useRef(finishOpen);
  finishOpenRef.current = finishOpen;
  const timerSurface = useRef<HTMLDivElement>(null);
  const closeAbout = () => {
    setAboutOpen(false);
    window.setTimeout(
      () => timerSurface.current?.focus({ preventScroll: true }),
      0,
    );
  };
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
  const calendarMark = React.useMemo(
    () => createCalendarMark(scramble),
    [scramble],
  );
  useDailyFavicon(calendarMark);
  const [initialStorage] = useState(() => loadDailyHistory(todayString));
  const [daily, setDaily] = useState(initialStorage.record);
  const [storageFailed, setStorageFailed] = useState(initialStorage.blocked);
  const [saving, setSaving] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const utcDay = useRef(todayString);
  utcDay.current = todayString;
  const dailyRef = useRef(daily);
  dailyRef.current = daily;
  const expectedRaw = useRef(initialStorage.raw);
  const persistedRecord = useRef(initialStorage.record);
  const writesBlocked = useRef(initialStorage.blocked);
  const writeQueue = useRef(Promise.resolve());
  const writeInFlight = useRef(false);
  const externalUpdatePending = useRef(false);
  const pendingWrites = useRef(0);
  const migrationBusy = useRef(false);
  const blockStorage = React.useCallback(() => {
    writesBlocked.current = true;
    if (mounted.current) {
      setStorageFailed(true);
    }
  }, []);
  const enqueueWrite = React.useCallback(
    (write: () => Promise<void>) => {
      pendingWrites.current += 1;
      setSaving(true);
      const queued = writeQueue.current
        .then(async () => {
          writeInFlight.current = true;
          try {
            await write();
          } finally {
            writeInFlight.current = false;
          }
        })
        .catch(blockStorage)
        .finally(() => {
          pendingWrites.current -= 1;
          if (mounted.current) {
            setSaving(pendingWrites.current > 0);
            if (externalUpdatePending.current) {
              setSyncVersion((version) => version + 1);
            }
          }
        });
      writeQueue.current = queued;
      return queued;
    },
    [blockStorage],
  );
  const reconcileExternal = React.useCallback(() => {
    if (writesBlocked.current) {
      return false;
    }
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    if (date !== utcDay.current) {
      utcDay.current = date;
      setToday(now);
    }
    const latest = loadDailyHistory(date);
    if (latest.blocked) {
      blockStorage();
      return false;
    }
    if (latest.raw === expectedRaw.current) {
      return false;
    }
    const local = dailyRef.current;
    const baseline = persistedRecord.current;
    const resetOnly =
      local.date > baseline.date &&
      sameDailyHistory(local, {
        ...baseline,
        date: local.date,
        history: [],
      });
    // Advancing an untouched daily record is automatic; solves/deletions remain edits.
    if (
      !sameDailyHistory(local, baseline) &&
      !resetOnly &&
      !sameDailyHistory(local, latest.record)
    ) {
      blockStorage();
      return false;
    }
    expectedRaw.current = latest.raw;
    persistedRecord.current = latest.record;
    dailyRef.current = latest.record;
    setDaily(latest.record);
    return true;
  }, [blockStorage]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === SOLVE_STORAGE_KEY || event.key === null) {
        externalUpdatePending.current = true;
        if (!writeInFlight.current) {
          setSyncVersion((version) => version + 1);
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    // Process acknowledgement state updates before deciding whether a local edit conflicts.
    if (externalUpdatePending.current && !writeInFlight.current) {
      externalUpdatePending.current = false;
      reconcileExternal();
    }
  }, [syncVersion, daily, reconcileExternal]);
  const [legacyCandidate] = useState(() =>
    !initialStorage.blocked &&
    initialStorage.record.legacyMigration === "unresolved"
      ? readLegacyHistory(todayString)
      : null,
  );
  const history = daily.date === todayString ? daily.history : [];
  const storagePending =
    saving ||
    daily.date !== todayString ||
    JSON.stringify(daily) !== expectedRaw.current;
  const setHistory = React.useCallback(
    (next: React.SetStateAction<number[]>) => {
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      if (date !== utcDay.current) {
        utcDay.current = date;
        setToday(now);
      }
      setDaily((current) => {
        const previous = current.date === date ? current.history : [];
        return {
          ...current,
          date,
          history: typeof next === "function" ? next(previous) : next,
        };
      });
    },
    [],
  );
  const commitLegacy = (choice: "imported" | "ignored") => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    if (date !== utcDay.current) {
      utcDay.current = date;
      setToday(now);
    }
    if (
      !legacyCandidate ||
      migrationBusy.current ||
      phaseRef.current !== "idle" ||
      writesBlocked.current ||
      dailyRef.current.history.length > 0 ||
      legacyCandidate.date !== date
    ) {
      return;
    }
    migrationBusy.current = true;
    void enqueueWrite(async () => {
      const current = dailyRef.current;
      const canCommit = () =>
        mounted.current &&
        !writesBlocked.current &&
        dailyRef.current === current &&
        current.history.length === 0 &&
        current.legacyMigration === "unresolved" &&
        phaseRef.current === "idle" &&
        date === new Date().toISOString().slice(0, 10);
      if (!canCommit()) {
        return;
      }
      const next = {
        ...current,
        date,
        history: choice === "imported" ? legacyCandidate.history.slice() : [],
        legacyMigration: choice,
      };
      const snapshot = expectedRaw.current;
      const saved = await saveDailyHistory(next, snapshot, canCommit);
      if (saved) {
        // A storage notification may already have adopted a later transaction.
        if (mounted.current && expectedRaw.current === snapshot) {
          expectedRaw.current = JSON.stringify(next);
          persistedRecord.current = next;
          // A rollover may have updated state while this acknowledgement waited.
          setDaily((latest) =>
            latest === current
              ? next
              : {
                  ...latest,
                  legacyMigration: choice,
                },
          );
        }
      } else if (
        expectedRaw.current === snapshot &&
        canCommit() &&
        !reconcileExternal()
      ) {
        blockStorage();
      }
    }).finally(() => {
      migrationBusy.current = false;
    });
  };
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
    setDaily((current) =>
      current.date === todayString
        ? current
        : { ...current, date: todayString, history: [] },
    );
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
  const consumedTouch = useRef({
    pointers: new Set<number>(),
    pendingClick: false,
  });

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
  const stop = (respectStartDebounce = true) => {
    if (
      phaseRef.current !== "running" ||
      (respectStartDebounce && performance.now() - startedAt.current < 200)
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
    if (daily.date !== todayString || writesBlocked.current) {
      return;
    }
    const encoded = JSON.stringify(daily);
    if (encoded === expectedRaw.current) {
      return;
    }
    void enqueueWrite(async () => {
      const canCommit = () =>
        mounted.current &&
        !writesBlocked.current &&
        JSON.stringify(dailyRef.current) === encoded &&
        daily.date === new Date().toISOString().slice(0, 10);
      if (!canCommit() || encoded === expectedRaw.current) {
        return;
      }
      const snapshot = expectedRaw.current;
      const saved = await saveDailyHistory(daily, snapshot, canCommit);
      if (saved) {
        if (expectedRaw.current === snapshot) {
          expectedRaw.current = encoded;
          persistedRecord.current = daily;
        }
      } else if (
        expectedRaw.current === snapshot &&
        canCommit() &&
        !reconcileExternal()
      ) {
        blockStorage();
      }
    });
  }, [daily, todayString, blockStorage, enqueueWrite, reconcileExternal]);
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
      migrationBusy.current ||
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
    if (aboutOpenRef.current) {
      return;
    }
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
    if (aboutOpenRef.current) {
      return;
    }
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
    const consume = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const touchTypes = ["touchstart", "touchmove", "touchend", "touchcancel"];
    const touchOptions = { capture: true, passive: false };
    let consumingTouchEvents = false;
    const removeTouchListeners = () => {
      for (const type of touchTypes) {
        window.removeEventListener(type, pageTouch as EventListener, true);
      }
      consumingTouchEvents = false;
    };
    const pageTouch = (event: TouchEvent) => {
      const gesture = consumedTouch.current;
      if (gesture.pointers.size || gesture.pendingClick) {
        consume(event);
      }
      if (
        (event.type === "touchend" || event.type === "touchcancel") &&
        event.touches.length === 0
      ) {
        removeTouchListeners();
      }
    };
    const installTouchListeners = () => {
      if (consumingTouchEvents) {
        return;
      }
      // Pointerdown precedes touchstart, so only a consumed stop needs blockers.
      for (const type of touchTypes) {
        window.addEventListener(type, pageTouch as EventListener, touchOptions);
      }
      consumingTouchEvents = true;
    };
    const blur = () => {
      keyboardHeld.current = null;
      pointer.current = null;
      consumedTouch.current.pointers.clear();
      // Late compatibility clicks remain consumed until a new physical input.
      removeTouchListeners();
      cancel();
    };
    const pagePointerDown = (event: PointerEvent) => {
      const gesture = consumedTouch.current;
      const touch = event.pointerType === "touch";
      const stopping = phaseRef.current === "running" && event.button === 0;
      if (!touch || !consumingTouchEvents) {
        // A new physical interaction is independent of the previous stop.
        gesture.pendingClick = false;
      }
      if (!touch || (!stopping && !consumingTouchEvents)) {
        return;
      }
      gesture.pointers.add(event.pointerId);
      gesture.pendingClick = true;
      installTouchListeners();
      consume(event);
      keyboardHeld.current = null;
      pointer.current = null;
      clearHold();
      // A fresh touch contact is already a separate gesture from the release
      // that starts timing. Keep the existing keyboard/mouse debounce.
      stop(false);
    };
    const pagePointerEvent = (event: PointerEvent) => {
      const gesture = consumedTouch.current;
      if (!gesture.pointers.has(event.pointerId)) {
        return;
      }
      consume(event);
      if (event.type === "pointerup" || event.type === "pointercancel") {
        gesture.pointers.delete(event.pointerId);
      }
    };
    const pageClick = (event: MouseEvent) => {
      // Cancel compatibility clicks from the stopping touch, including
      // duplicates. Keyboard activation has detail 0 and remains available.
      if (consumedTouch.current.pendingClick && event.detail !== 0) {
        consume(event);
      }
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
    window.addEventListener("pointerdown", pagePointerDown, true);
    window.addEventListener("pointermove", pagePointerEvent, true);
    window.addEventListener("pointerup", pagePointerEvent, true);
    window.addEventListener("pointercancel", pagePointerEvent, true);
    window.addEventListener("click", pageClick, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", blur);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("focusin", focus);
      window.removeEventListener("pointerdown", pagePointerDown, true);
      window.removeEventListener("pointermove", pagePointerEvent, true);
      window.removeEventListener("pointerup", pagePointerEvent, true);
      window.removeEventListener("pointercancel", pagePointerEvent, true);
      window.removeEventListener("click", pageClick, true);
      removeTouchListeners();
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
  const statistics = React.useMemo(() => {
    const calculated = calculateSolveStatistics(history);
    const chartValue = (value: number | null) =>
      value !== null && Number.isFinite(value) ? value : null;
    return {
      ...calculated,
      newestFirst: calculated.data.slice().reverse(),
      chartData: calculated.data.map((row) => ({
        ...row,
        time: chartValue(row.time),
        ao5: chartValue(row.ao5),
        ao12: chartValue(row.ao12),
      })),
    };
  }, [history]);
  const best = statistics.bestSingle;
  const stats = [
    ["Best single", best],
    ["Best AO5", statistics.bestAO5],
    ["Best AO12", statistics.bestAO12],
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
              <DailyLogo mark={calendarMark} />
              <span>
                CubeTimer<span className="brand-year">365</span>
              </span>
            </a>
            <div className="header-tools">
              <time
                dateTime={localDateString}
                aria-label={today.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              >
                {today.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
                <span className="header-year"> {today.getFullYear()}</span>
              </time>
              <button
                type="button"
                className="about-trigger"
                aria-expanded={aboutOpen}
                aria-controls="about-cubetimer"
                aria-haspopup="dialog"
                disabled={phase !== "idle"}
                onClick={() => setAboutOpen(true)}
              >
                About
              </button>
            </div>
          </header>
          <About opened={aboutOpen} onClose={closeAbout} />
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
                            rememberCubeStyle(style);
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
                aria-label="Timer surface. Hold Space or touch until ready, release to start. Press Space to stop and save, or tap anywhere on a touchscreen. Escape cancels the attempt."
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
                    ? "Tap anywhere to stop and save"
                    : ready
                      ? "Release to start"
                      : phase === "holding"
                        ? "Keep holding until ready"
                        : "Hold here until ready · release to start"}
                </p>
              </div>
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
              {phase === "idle" &&
                !storageFailed &&
                legacyCandidate &&
                legacyCandidate.date === todayString &&
                daily.legacyMigration === "unresolved" &&
                history.length === 0 && (
                  <LegacyHistoryImport
                    candidate={legacyCandidate}
                    onImport={() => commitLegacy("imported")}
                    onIgnore={() => commitLegacy("ignored")}
                  />
                )}
              {storageFailed && (
                <p className="storage-notice" role="alert">
                  Browser storage could not be saved. New results remain in this
                  tab; existing stored data was left intact.
                </p>
              )}
              <div
                className={`history-scroll${history.length === 0 ? " history-scroll--empty" : ""}`}
              >
                <table className="history-table">
                  <caption className="sr-only">
                    Solve times and rolling averages, newest first
                  </caption>
                  <thead id="stats">
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Time</th>
                      <th
                        scope="col"
                        title="Last five solves ending at this solve"
                      >
                        AO5
                      </th>
                      <th
                        scope="col"
                        title="Last twelve solves ending at this solve"
                      >
                        AO12
                      </th>
                      <th scope="col">
                        <span className="sr-only">Delete</span>
                      </th>
                    </tr>
                    <tr
                      className="history-best"
                      aria-label="Daily best results"
                    >
                      <th scope="row">
                        <Tooltip
                          label="Today's best"
                          events={{ hover: true, focus: true, touch: false }}
                          position="top"
                          offset={8}
                          withArrow
                          classNames={{ tooltip: "history-best-tooltip" }}
                        >
                          <span
                            className="history-best-label"
                            role="img"
                            aria-label="Today's best"
                            // Informational tooltip needs keyboard focus, without button semantics.
                            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                            tabIndex={0}
                          >
                            <IconCrown
                              size={16}
                              stroke={1.5}
                              aria-hidden="true"
                            />
                          </span>
                        </Tooltip>
                      </th>
                      {stats.map(([label, value], index) => (
                        <td
                          key={label}
                          className={`history-best-value ${value === null ? "incomplete-average" : ["best-single-value", "ao5-cell", "ao12-cell"][index]}`}
                        >
                          {formatTime(value)}
                        </td>
                      ))}
                      <td aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.newestFirst.map(
                      ({ attempt, time, ao5, ao12 }) => {
                        const index = attempt - 1;
                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{formatTime(time)}</td>
                            <td
                              className={
                                ao5 === null ? "incomplete-average" : "ao5-cell"
                              }
                            >
                              {formatTime(ao5)}
                            </td>
                            <td
                              className={
                                ao12 === null
                                  ? "incomplete-average"
                                  : "ao12-cell"
                              }
                            >
                              {formatTime(ao12)}
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
                      },
                    )}
                  </tbody>
                </table>
                {history.length === 0 && (
                  <div className="empty-history">
                    <IconList size={28} stroke={1.2} />
                    <p>No solves yet.</p>
                  </div>
                )}
              </div>
              <div className="history-footer">
                <div className="history-meta">
                  <span>Total {formatTime(statistics.totalTime)}</span>
                  <span>
                    {storageFailed
                      ? "Only in this tab"
                      : storagePending
                        ? "Saving…"
                        : "Saved on this device"}{" "}
                    <span className="shared-dot" />
                  </span>
                </div>
              </div>
            </section>
            <section
              className="panel chart-panel"
              aria-labelledby="chart-title"
            >
              <div className="panel-heading">
                <h2 className="sr-only" id="chart-title">
                  Solve times
                </h2>
                <div className="chart-legend">
                  <span>
                    <i className="solve-key" />
                    Time
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
              <div className="chart-plot">
                {history.length === 0 ? (
                  <div className="empty-chart">
                    <IconChartLine size={32} stroke={1.2} />
                    <p>No data yet.</p>
                  </div>
                ) : (
                  <LineChart
                    h="100%"
                    data={statistics.chartData}
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
                        best !== null && Number.isFinite(best)
                          ? Math.max(0, Math.floor(best - 0.25))
                          : 0,
                        statistics.maxFinite !== null
                          ? Math.ceil(statistics.maxFinite + 0.25)
                          : 1,
                      ],
                    }}
                  />
                )}
              </div>
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
