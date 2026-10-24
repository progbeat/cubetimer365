import { setImmediate as nextTask } from "node:timers/promises";
import {
  act,
  fireEvent,
  render,
  screen,
  cleanup,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { generateScramble } from "./scramble";
import { SOLVE_STORAGE_KEY, type DailyHistory } from "./solveStorage";
import * as solveStorage from "./solveStorage";
import { CUBE_STYLE_KEY } from "./cubeStylePreference";
import { cubeFaceColors } from "./cubeGeometry";

vi.mock("@mantine/charts", () => ({
  LineChart: ({
    data,
  }: {
    data: {
      attempt: number;
      time: number;
      ao5: number | null;
      ao12: number | null;
    }[];
  }) => <div data-testid="chart-data">{JSON.stringify(data)}</div>,
}));
const stored = () =>
  JSON.parse(
    localStorage.getItem(SOLVE_STORAGE_KEY) || "null",
  ) as DailyHistory | null;
const seedHistory = (raw: string) =>
  localStorage.setItem(
    SOLVE_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      date: stored()?.date || new Date().toISOString().slice(0, 10),
      history: JSON.parse(raw),
      legacyMigration: "ignored",
    }),
  );
const seedDate = (date: string) =>
  localStorage.setItem(
    SOLVE_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      date,
      history: stored()?.history || [],
      legacyMigration: "ignored",
    }),
  );
const surface = () => screen.getByRole("button", { name: /Timer surface/ });
const saved = () => stored()?.history || [];
const flushStorage = async () => {
  for (let turn = 0; turn < 200; turn += 1) {
    await act(async () => {
      await nextTask();
    });
    if (turn >= 5 && screen.queryAllByText("Saving…").length === 0) {
      return;
    }
  }
  throw new Error("Storage did not settle");
};
const pointerEvent = (
  type: string,
  options: Record<string, unknown> = {},
  target: HTMLElement = surface(),
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: 100,
    clientY: 100,
    ...options,
  });
  fireEvent(target, event);
  return event;
};
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const touchStart = () => {
  pointerEvent("pointerdown");
  advance(310);
  pointerEvent("pointerup");
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "performance",
      "Date",
    ],
  });
  localStorage.clear();
  seedDate(new Date().toISOString().split("T")[0]);
  vi.spyOn(console, "log").mockImplementation(() => {});
  HTMLElement.prototype.setPointerCapture = vi.fn();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    width: 400,
    height: 250,
    top: 0,
    left: 0,
    right: 400,
    bottom: 250,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("preserved scramble and daily data", () => {
  it.each(["holding", "ready", "running"] as const)(
    "does not offer legacy actions while the timer is %s",
    async (phase) => {
      localStorage.removeItem(SOLVE_STORAGE_KEY);
      localStorage.setItem("history", "[12]");
      localStorage.setItem("today", new Date().toISOString().slice(0, 10));
      render(<App />);
      await flushStorage();
      expect(
        screen.getByRole("button", { name: "Review previous browser results" }),
      ).toBeInTheDocument();
      fireEvent.keyDown(window, { code: "Space" });
      if (phase !== "holding") {
        advance(310);
      }
      if (phase === "running") {
        fireEvent.keyUp(window, { code: "Space" });
      }
      expect(
        screen.queryByRole("button", {
          name: "Review previous browser results",
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Import into CubeTimer365" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Keep separate" }),
      ).not.toBeInTheDocument();
      fireEvent.keyDown(window, { code: "Escape" });
      fireEvent.keyUp(window, { code: "Space" });
      expect(
        screen.getByRole("button", { name: "Review previous browser results" }),
      ).toBeInTheDocument();
      expect(saved()).toEqual([]);
      expect(localStorage.getItem("history")).toBe("[12]");
    },
  );
  it.each(["rollover", "solve", "deletion"] as const)(
    "reconciles a stale %s after a peer's new-day solve without losing user edits",
    async (edit) => {
      vi.setSystemTime(
        new Date(
          edit === "deletion" ? "2026-10-13T00:00:01Z" : "2026-10-12T23:59:50Z",
        ),
      );
      seedDate(edit === "deletion" ? "2026-10-13" : "2026-10-12");
      seedHistory("[12]");
      render(<App />);
      await flushStorage();
      const save = solveStorage.saveDailyHistory;
      let attempt: (() => Promise<void>) | undefined;
      vi.spyOn(solveStorage, "saveDailyHistory").mockImplementationOnce(
        (...args) =>
          new Promise<boolean>((resolve) => {
            attempt = async () => {
              resolve(await save(...args));
            };
          }),
      );
      if (edit === "rollover") {
        advance(10_100);
      } else if (edit === "deletion") {
        fireEvent.click(screen.getByRole("button", { name: "Delete solve 1" }));
      } else {
        vi.setSystemTime(new Date("2026-10-13T00:00:01Z"));
        touchStart();
        advance(500);
        pointerEvent("pointerdown");
        pointerEvent("pointerup");
        fireEvent.touchEnd(document.body, { touches: [] });
      }
      for (let turn = 0; !attempt && turn < 200; turn += 1) {
        await act(async () => {
          await nextTask();
        });
      }
      expect(attempt).toBeTypeOf("function");
      const newer = JSON.stringify({
        ...stored(),
        date: "2026-10-13",
        history: edit === "deletion" ? [12, 0.75] : [0.75],
      });
      localStorage.setItem(SOLVE_STORAGE_KEY, newer);
      fireEvent(
        window,
        new StorageEvent("storage", {
          key: SOLVE_STORAGE_KEY,
          newValue: newer,
        }),
      );
      await act(async () => {
        await attempt?.();
      });
      await flushStorage();
      expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(newer);
      if (edit === "rollover") {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(
          within(screen.getByRole("table").querySelector("tbody")!).getByRole(
            "cell",
            { name: "00:00.75" },
          ),
        ).toBeInTheDocument();
        touchStart();
        advance(500);
        pointerEvent("pointerdown");
        pointerEvent("pointerup");
        fireEvent.touchEnd(document.body, { touches: [] });
        await flushStorage();
        expect(saved()).toEqual([0.75, 0.5]);
        expect(screen.getByText("Saved on this device")).toBeInTheDocument();
      } else {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "New results remain in this tab",
        );
        if (edit === "solve") {
          expect(
            within(screen.getByRole("table").querySelector("tbody")!).getByRole(
              "cell",
              { name: "00:00.50" },
            ),
          ).toBeInTheDocument();
        } else {
          expect(screen.getByText("No solves yet.")).toBeInTheDocument();
        }
      }
    },
  );
  it.each([false, true])(
    "defers incoming changes until save acknowledgement; additional local edit: %s",
    async (dirty) => {
      seedHistory("[12]");
      render(<App />);
      await flushStorage();
      const save = solveStorage.saveDailyHistory;
      let acknowledge: (() => void) | undefined;
      vi.spyOn(solveStorage, "saveDailyHistory").mockImplementationOnce(
        async (...args) => {
          const result = await save(...args);
          await new Promise<void>((resolve) => {
            acknowledge = resolve;
          });
          return result;
        },
      );
      touchStart();
      advance(500);
      pointerEvent("pointerdown");
      pointerEvent("pointerup");
      fireEvent.touchEnd(document.body, { touches: [] });
      for (let turn = 0; !acknowledge && turn < 200; turn += 1) {
        await act(async () => {
          await nextTask();
        });
      }
      expect(acknowledge).toBeTypeOf("function");
      expect(saved()).toEqual([12, 0.5]);
      if (dirty) {
        fireEvent.click(screen.getByRole("button", { name: "Delete solve 1" }));
      }
      const newer = JSON.stringify({ ...stored(), history: [12, 0.5, 0.75] });
      localStorage.setItem(SOLVE_STORAGE_KEY, newer);
      fireEvent(
        window,
        new StorageEvent("storage", {
          key: SOLVE_STORAGE_KEY,
          newValue: newer,
        }),
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      await act(async () => {
        acknowledge?.();
      });
      await flushStorage();
      if (dirty) {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "New results remain in this tab",
        );
        expect(screen.getByText("1 solve")).toBeInTheDocument();
        expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(newer);
      } else {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByText("3 solves")).toBeInTheDocument();
        advance(210);
        touchStart();
        advance(500);
        pointerEvent("pointerdown");
        pointerEvent("pointerup");
        fireEvent.touchEnd(document.body, { touches: [] });
        await flushStorage();
        expect(saved()).toEqual([12, 0.5, 0.75, 0.5]);
        expect(screen.getByText("Saved on this device")).toBeInTheDocument();
      }
    },
  );
  it("adopts identical simultaneous day resets and still saves subsequent solves", async () => {
    vi.setSystemTime(new Date("2026-10-12T23:59:59.900Z"));
    seedDate("2026-10-12");
    seedHistory("[12]");
    const first = render(<App />);
    render(<App />);
    await flushStorage();
    const save = solveStorage.saveDailyHistory;
    let notified = false;
    vi.spyOn(solveStorage, "saveDailyHistory").mockImplementation(
      async (...args) => {
        const result = await save(...args);
        if (result && args[0].date === "2026-10-13" && !notified) {
          notified = true;
          act(() => {
            fireEvent(
              window,
              new StorageEvent("storage", {
                key: SOLVE_STORAGE_KEY,
                newValue: localStorage.getItem(SOLVE_STORAGE_KEY),
              }),
            );
          });
        }
        return result;
      },
    );
    advance(200);
    await flushStorage();
    expect(notified).toBe(true);
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
    expect(screen.getAllByText("Saved on this device")).toHaveLength(2);
    first.unmount();
    touchStart();
    advance(500);
    pointerEvent("pointerdown");
    pointerEvent("pointerup");
    await flushStorage();
    expect(stored()?.date).toBe("2026-10-13");
    expect(saved()).toEqual([0.5]);
  });
  it("removes open migration actions when the initial save fails", async () => {
    localStorage.removeItem(SOLVE_STORAGE_KEY);
    localStorage.setItem("history", "[12]");
    localStorage.setItem("today", new Date().toISOString().slice(0, 10));
    vi.spyOn(solveStorage, "saveDailyHistory").mockResolvedValue(false);
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Review previous browser results" }),
    );
    advance(250);
    expect(
      screen.getByRole("button", { name: "Import into CubeTimer365" }),
    ).toBeInTheDocument();
    await flushStorage();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Browser storage could not be saved",
    );
    expect(
      screen.queryByRole("button", { name: "Review previous browser results" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Import into CubeTimer365" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Keep separate" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem("history")).toBe("[12]");
  });
  it.each(["imported", "ignored"] as const)(
    "keeps the new UTC day when a %s acknowledgement arrives after rollover",
    async (choice) => {
      vi.setSystemTime(new Date("2026-10-12T23:59:50Z"));
      localStorage.removeItem(SOLVE_STORAGE_KEY);
      localStorage.setItem("history", "[12,23]");
      localStorage.setItem("today", "2026-10-12");
      const first = render(<App />);
      await flushStorage();
      const save = solveStorage.saveDailyHistory;
      let acknowledge: (() => void) | undefined;
      vi.spyOn(solveStorage, "saveDailyHistory").mockImplementationOnce(
        async (...args) => {
          const result = await save(...args);
          await new Promise<void>((resolve) => {
            acknowledge = resolve;
          });
          return result;
        },
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Review previous browser results" }),
      );
      advance(250);
      fireEvent.click(
        screen.getByRole("button", {
          name:
            choice === "imported"
              ? "Import into CubeTimer365"
              : "Keep separate",
        }),
      );
      for (let turn = 0; !acknowledge && turn < 200; turn += 1) {
        await act(async () => {
          await nextTask();
        });
      }
      expect(acknowledge).toBeTypeOf("function");
      expect(stored()?.legacyMigration).toBe(choice);
      advance(10_000);
      expect(screen.getByText("No solves yet.")).toBeInTheDocument();
      await act(async () => {
        acknowledge?.();
      });
      await flushStorage();
      expect(stored()).toEqual({
        version: 1,
        date: "2026-10-13",
        history: [],
        legacyMigration: choice,
      });
      expect(screen.getByText("No solves yet.")).toBeInTheDocument();
      expect(screen.getByText("Saved on this device")).toBeInTheDocument();
      first.unmount();
      render(<App />);
      await flushStorage();
      expect(
        screen.queryByRole("button", {
          name: "Review previous browser results",
        }),
      ).not.toBeInTheDocument();
      expect(localStorage.getItem("history")).toBe("[12,23]");
    },
  );
  it("keeps persistence enabled when another tab is adopted before a stale write rejects", async () => {
    localStorage.removeItem(SOLVE_STORAGE_KEY);
    let rejectStale: (() => void) | undefined;
    let competing: DailyHistory | undefined;
    vi.spyOn(solveStorage, "saveDailyHistory").mockImplementationOnce(
      (record) => {
        competing = record;
        return new Promise<boolean>((resolve) => {
          rejectStale = () => resolve(false);
        });
      },
    );
    render(<App />);
    for (let turn = 0; !rejectStale && turn < 200; turn += 1) {
      await act(async () => {
        await nextTask();
      });
    }
    expect(rejectStale).toBeTypeOf("function");
    const raw = JSON.stringify(competing);
    localStorage.setItem(SOLVE_STORAGE_KEY, raw);
    fireEvent(
      window,
      new StorageEvent("storage", { key: SOLVE_STORAGE_KEY, newValue: raw }),
    );
    await act(async () => {
      rejectStale?.();
    });
    await flushStorage();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    touchStart();
    advance(500);
    pointerEvent("pointerdown");
    pointerEvent("pointerup");
    await flushStorage();
    expect(saved()).toEqual([0.5]);
    expect(screen.getByText("Saved on this device")).toBeInTheDocument();
  });
  it("shows pending persistence immediately and saves the latest rapid deletion", async () => {
    seedHistory("[10,20,30]");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Delete solve 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete solve 1" }));
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(saved()).toEqual([10, 20, 30]);
    await flushStorage();
    expect(saved()).toEqual([30]);
    expect(screen.getByText("Saved on this device")).toBeInTheDocument();
  });
  it("adopts a competing initial save when this instance has no local edits", async () => {
    localStorage.removeItem(SOLVE_STORAGE_KEY);
    render(<App />);
    render(<App />);
    await flushStorage();
    expect(stored()?.history).toEqual([]);
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
    expect(screen.getAllByText("Saved on this device")).toHaveLength(2);
  });
  it("carries rounded centiseconds into the next minute without changing stored times", async () => {
    seedHistory("[59.999,119.999]");
    render(<App />);
    const times = Array.from(
      screen.getByRole("table").querySelectorAll("tbody td:nth-child(2)"),
      (cell) => cell.textContent,
    );
    await flushStorage();
    expect(times).toEqual(["02:00.00", "01:00.00"]);

    await flushStorage();
    expect(saved()).toEqual([59.999, 119.999]);
  });
  it("matches the original daily scramble fixture exactly", async () => {
    await flushStorage();
    expect(generateScramble(20261012)).toBe(
      "L2 R2 D2 B' U2 F' B2 L2 D2 F R' D' L' U2 B2 U2 B L' F' R'",
    );
  });
  it("updates the daily scramble and existing UTC history boundary while open", async () => {
    vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    seedDate("2026-10-12");
    seedHistory("[12]");
    const { container } = render(<App />);
    const moves = () => container.querySelector(".scramble-moves")?.textContent;
    const logoColors = () =>
      Array.from(container.querySelectorAll("[data-logo-sticker]"), (cell) =>
        cell.getAttribute("data-logo-color"),
      );
    await flushStorage();
    expect(moves()).toBe(generateScramble(20261012));
    expect(logoColors()).toEqual(
      cubeFaceColors(generateScramble(20261012), "B").flat(),
    );
    advance(24 * 60 * 60 * 1000);
    await flushStorage();
    expect(moves()).toBe(generateScramble(20261013));
    expect(logoColors()).toEqual(
      cubeFaceColors(generateScramble(20261013), "B").flat(),
    );

    await flushStorage();
    expect(stored()?.date).toBe("2026-10-13");

    await flushStorage();
    expect(saved()).toEqual([]);

    expect(
      Array.from(
        screen
          .getByRole("row", { name: "Daily best results" })
          .querySelectorAll(".history-best-value"),
      ).map((value) => value.textContent),
    ).toEqual(["—", "—", "—"]);
  });
  it.each(["focus", "visibilitychange"])(
    "refreshes both the logo and scramble on %s after a suspended day",
    async (event) => {
      vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
      seedDate("2026-10-20");
      localStorage.setItem(CUBE_STYLE_KEY, "flat");
      const { container } = render(<App />);
      await flushStorage();
      const logo = () => container.querySelector(".daily-logo");
      expect(logo()).toHaveAttribute(
        "data-logo-scramble",
        generateScramble(20261020),
      );
      // Change the wall clock without running the scheduled boundary timeout.
      vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
      if (event === "focus") {
        fireEvent(window, new Event("focus"));
      } else {
        vi.spyOn(document, "hidden", "get").mockReturnValue(false);
        fireEvent(document, new Event("visibilitychange"));
      }
      await flushStorage();
      const expected = generateScramble(20261021);
      expect(container.querySelector(".scramble-moves")?.textContent).toBe(
        expected,
      );
      expect(logo()).toHaveAttribute("data-logo-scramble", expected);
      expect(
        Array.from(container.querySelectorAll("[data-logo-sticker]"), (cell) =>
          cell.getAttribute("data-logo-color"),
        ),
      ).toEqual(cubeFaceColors(expected, "B").flat());
      expect(localStorage.getItem(CUBE_STYLE_KEY)).toBe("flat");
    },
  );
  it("loads existing history, keeps averages and deletion persistent", async () => {
    seedHistory("[10,20,30,40,50]");
    const first = render(<App />);
    await flushStorage();
    expect(screen.getByText("5 solves")).toBeInTheDocument();

    expect(screen.getByTestId("chart-data").textContent).toContain('"ao5":30');
    fireEvent.click(screen.getByRole("button", { name: "Delete solve 3" }));
    await flushStorage();
    expect(saved()).toEqual([10, 20, 40, 50]);
    first.unmount();
    render(<App />);
    await flushStorage();
    expect(screen.getByText("4 solves")).toBeInTheDocument();

    await flushStorage();
    expect(saved()).toEqual([10, 20, 40, 50]);
  });
});
it("requires a reviewed choice to import ambiguous shared history and never repeats it", async () => {
  localStorage.removeItem(SOLVE_STORAGE_KEY);
  localStorage.setItem("history", "[12.34,23.45]");
  localStorage.setItem("today", new Date().toISOString().slice(0, 10));
  localStorage.setItem("lights-out.reaction-lab.v2", "keep");
  const first = render(<App />);
  await flushStorage();
  expect(saved()).toEqual([]);
  fireEvent.click(
    screen.getByRole("button", { name: "Review previous browser results" }),
  );
  advance(250);
  await flushStorage();
  expect(screen.getByText(/do not identify the app/)).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Import into CubeTimer365" }),
  );
  await flushStorage();
  expect(saved()).toEqual([12.34, 23.45]);

  await flushStorage();
  expect(stored()?.legacyMigration).toBe("imported");
  first.unmount();
  render(<App />);
  await flushStorage();
  expect(saved()).toEqual([12.34, 23.45]);

  expect(
    screen.queryByRole("button", { name: "Review previous browser results" }),
  ).not.toBeInTheDocument();

  await flushStorage();
  expect(localStorage.getItem("history")).toBe("[12.34,23.45]");

  await flushStorage();
  expect(localStorage.getItem("lights-out.reaction-lab.v2")).toBe("keep");
});
it("saves keyboard and page-touch stops under the new UTC day after midnight", async () => {
  vi.setSystemTime(new Date("2026-10-12T23:59:59.900Z"));
  seedDate("2026-10-12");
  seedHistory("[12]");
  render(<App />);
  advance(150);
  await flushStorage();
  expect(stored()?.date).toBe("2026-10-13");

  await flushStorage();
  expect(saved()).toEqual([]);
  fireEvent.keyDown(window, { code: "Space" });
  advance(310);
  fireEvent.keyUp(window, { code: "Space" });
  advance(500);
  fireEvent.keyDown(window, { code: "Space" });
  fireEvent.keyUp(window, { code: "Space" });
  await flushStorage();
  expect(saved()).toEqual([0.5]);
  advance(210);
  touchStart();
  advance(400);
  pointerEvent("pointerdown", {}, document.body);
  pointerEvent("pointerup", {}, document.body);
  fireEvent.touchEnd(document.body, { touches: [] });
  await flushStorage();
  expect(saved()).toEqual([0.5, 0.4]);

  await flushStorage();
  expect(stored()?.date).toBe("2026-10-13");

  expect(screen.getByText("2 solves")).toBeInTheDocument();
});
it("preserves another tab's new-day results before this tab's delayed midnight refresh", async () => {
  vi.setSystemTime(new Date("2026-10-12T23:59:59.900Z"));
  seedDate("2026-10-12");
  seedHistory("[12]");
  render(<App />);
  // Jump wall-clock time without firing the already scheduled date timeout.
  vi.setSystemTime(new Date("2026-10-13T00:00:00.100Z"));
  const newer = JSON.stringify({
    version: 1,
    date: "2026-10-13",
    history: [0.5],
    legacyMigration: "ignored",
  });
  localStorage.setItem(SOLVE_STORAGE_KEY, newer);
  fireEvent(
    window,
    new StorageEvent("storage", { key: SOLVE_STORAGE_KEY, newValue: newer }),
  );
  await flushStorage();
  expect(screen.getByText("1 solve")).toBeInTheDocument();

  await flushStorage();
  expect(saved()).toEqual([0.5]);

  await flushStorage();
  expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(newer);
  advance(1000);
  await flushStorage();
  expect(saved()).toEqual([0.5]);

  await flushStorage();
  expect(stored()?.date).toBe("2026-10-13");

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("keeps writes blocked for this mount after an initial read failure even if storage recovers", async () => {
  seedHistory("[12.34,23.45]");
  const original = localStorage.getItem(SOLVE_STORAGE_KEY);
  const get = Storage.prototype.getItem;
  let fail = true;
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (
    this: Storage,
    key,
  ) {
    if (key === SOLVE_STORAGE_KEY && fail) {
      fail = false;
      throw new Error("temporary read failure");
    }
    return get.call(this, key);
  });
  render(<App />);
  touchStart();
  advance(500);
  pointerEvent("pointerdown", {}, document.body);
  pointerEvent("pointerup", {}, document.body);
  fireEvent.touchEnd(document.body, { touches: [] });
  await flushStorage();
  expect(screen.getByText("1 solve")).toBeInTheDocument();

  expect(screen.getByRole("alert")).toHaveTextContent(
    "New results remain in this tab",
  );

  await flushStorage();
  expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(original);
});
it("remembers keeping shared data separate without dropping the original", async () => {
  localStorage.removeItem(SOLVE_STORAGE_KEY);
  localStorage.setItem("history", "[99]");
  localStorage.setItem("today", new Date().toISOString().slice(0, 10));
  const first = render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Review previous browser results" }),
  );
  advance(250);
  fireEvent.click(screen.getByRole("button", { name: "Keep separate" }));
  await flushStorage();
  expect(saved()).toEqual([]);
  first.unmount();
  render(<App />);
  await flushStorage();
  expect(
    screen.queryByRole("button", { name: "Review previous browser results" }),
  ).not.toBeInTheDocument();

  await flushStorage();
  expect(localStorage.getItem("history")).toBe("[99]");
});
it("distinguishes saving with Space from cancelling with Escape in the timer instructions", async () => {
  render(<App />);
  await flushStorage();
  expect(surface()).toHaveAccessibleName(
    /Press Space to stop and save, or tap anywhere on a touchscreen\. Escape cancels the attempt\./,
  );
  touchStart();
  advance(250);
  await flushStorage();
  expect(
    screen.getByText("Press Space to save · Esc to cancel"),
  ).toBeInTheDocument();
  fireEvent.keyDown(window, { code: "Escape" });
  await flushStorage();
  expect(saved()).toEqual([]);

  expect(screen.queryByText("Solving")).not.toBeInTheDocument();
  advance(200);
  touchStart();
  advance(250);
  fireEvent.keyDown(window, { code: "Space" });
  fireEvent.keyUp(window, { code: "Space" });
  await flushStorage();
  expect(saved()).toHaveLength(1);

  await flushStorage();
  expect(saved()[0]).toBeCloseTo(0.25);
});
it("keeps About keyboard input out of the timer and returns focus when closed", async () => {
  seedHistory("[12,15]");
  render(<App />);
  await flushStorage();
  fireEvent.click(screen.getByRole("button", { name: "About" }));
  advance(200);
  await flushStorage();
  const dialog = screen.getByRole("dialog", { name: "About CubeTimer365" });
  fireEvent.keyDown(window, { code: "Space" });
  advance(350);
  fireEvent.keyUp(window, { code: "Space" });
  await flushStorage();
  expect(screen.queryByText("Solving")).not.toBeInTheDocument();
  expect(saved()).toEqual([12, 15]);
  fireEvent.click(within(dialog).getByRole("button", { name: "Close About" }));
  advance(200);
  await flushStorage();
  expect(surface()).toHaveFocus();
});
it("keeps About unavailable during an active solve", async () => {
  render(<App />);
  touchStart();
  const about = screen.getByRole("button", { name: "About" });
  expect(about).toBeDisabled();
  fireEvent.click(about);
  expect(
    screen.queryByRole("dialog", { name: "About CubeTimer365" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Solving")).toBeInTheDocument();
  await flushStorage();
});
it.each(["flat", "neon", "cyber"] as const)(
  "restores saved %s on the initial render instead of the default",
  async (style) => {
    localStorage.setItem(CUBE_STYLE_KEY, style);
    const { container } = render(<App />);
    expect(
      screen.getByRole("img", {
        name: `Daily scramble cube, rounded ${style} finish (simplified preview)`,
      }),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll("[data-screen-interference]"),
    ).toHaveLength(style === "cyber" ? 1 : 0);
    await flushStorage();
    expect(
      container.querySelectorAll("[data-screen-interference]"),
    ).toHaveLength(style === "cyber" ? 1 : 0);
  },
);
it("keeps the chosen finish in memory if its storage write is blocked", async () => {
  seedHistory("[12,15]");
  const originalSet = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key: string,
    value: string,
  ) {
    if (key === CUBE_STYLE_KEY) {
      throw new Error("blocked preference");
    }
    originalSet.call(this, key, value);
  });
  render(<App />);
  await flushStorage();
  fireEvent.click(screen.getByRole("button", { name: "Choose cube finish" }));
  fireEvent.click(screen.getByRole("button", { name: "Flat · Round" }));
  await flushStorage();
  expect(
    screen.getByRole("img", {
      name: "Daily scramble cube, rounded flat finish (simplified preview)",
    }),
  ).toBeInTheDocument();
  expect(saved()).toEqual([12, 15]);
  expect(localStorage.getItem(CUBE_STYLE_KEY)).toBeNull();
});
it("defaults to Neon without a query and switches finishes without altering history", async () => {
  seedHistory("[12,15]");
  const { container } = render(<App />);
  await flushStorage();
  expect(container.querySelectorAll("[data-screen-interference]")).toHaveLength(
    0,
  );

  expect(container.querySelectorAll("[data-scanlines]")).toHaveLength(0);
  const picker = screen.getByRole("button", { name: "Choose cube finish" });
  await flushStorage();
  expect(
    screen.getByRole("img", {
      name: "Daily scramble cube, rounded neon finish (simplified preview)",
    }),
  ).toBeInTheDocument();
  fireEvent.click(picker);
  await flushStorage();
  expect(screen.getByRole("button", { name: "Neon · Round" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  expect(
    screen.queryByRole("button", { name: "Original" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Flat · Round" }));
  await flushStorage();
  expect(localStorage.getItem(CUBE_STYLE_KEY)).toBe("flat");
  expect(container.querySelector("[data-screen-interference]")).toBeNull();

  expect(
    screen.getByRole("img", {
      name: "Daily scramble cube, rounded flat finish (simplified preview)",
    }),
  ).toBeInTheDocument();
  fireEvent.click(picker);
  fireEvent.click(screen.getByRole("button", { name: "Neon · Round" }));
  await flushStorage();
  expect(localStorage.getItem(CUBE_STYLE_KEY)).toBe("neon");
  expect(container.querySelector("[data-screen-interference]")).toBeNull();
  fireEvent.keyDown(picker, { code: "Space" });
  advance(310);
  fireEvent.keyUp(picker, { code: "Space" });
  await flushStorage();
  expect(screen.queryByText("Solving")).not.toBeInTheDocument();
  fireEvent.click(picker);
  fireEvent.click(screen.getByRole("button", { name: "Cyber · Round" }));
  await flushStorage();
  expect(container.querySelectorAll("[data-screen-interference]")).toHaveLength(
    1,
  );

  await flushStorage();
  expect(saved()).toEqual([12, 15]);
});
it("shows per-solve rolling averages without restoring the comparison column", async () => {
  seedHistory("[10,20,30,40,50]");
  render(<App />);
  const table = screen.getByRole("table");
  await flushStorage();
  expect(
    within(table)
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent),
  ).toEqual(["#", "Time", "AO5", "AO12", "Delete"]);

  expect(
    table.querySelectorAll("tbody tr")[0].querySelectorAll("td"),
  ).toHaveLength(5);

  expect(table.querySelector("tbody tr")?.textContent).toContain("00:30.00");

  expect(screen.queryByText("±")).not.toBeInTheDocument();

  expect(screen.getByTestId("chart-data").textContent).toContain('"ao5":30');

  await flushStorage();
  expect(saved()).toEqual([10, 20, 30, 40, 50]);
});
it.each([
  { history: [], expected: ["—", "—", "—"] },
  { history: [10, 20, 30, 40], expected: ["00:10.00", "—", "—"] },
  { history: [10, 20, 30, 40, 50], expected: ["00:10.00", "00:30.00", "—"] },
])(
  "keeps the Best summary separate from $history.length recorded solves",
  async ({ history, expected }) => {
    seedHistory(JSON.stringify(history));
    render(<App />);
    await flushStorage();
    const summary = screen.getByRole("row", { name: "Daily best results" });
    expect(
      within(summary).getByRole("rowheader", { name: "Today's best" }),
    ).toBeInTheDocument();
    expect(
      Array.from(
        summary.querySelectorAll(".history-best-value"),
        (cell) => cell.textContent,
      ),
    ).toEqual(expected);
    expect(within(summary).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(
      history.length,
    );
    expect(saved()).toEqual(history);
  },
);

it("uses uniform recorded rows and keeps metric emphasis only in the Best summary", async () => {
  seedHistory("[30,10,20]");
  const { container } = render(<App />);
  await flushStorage();
  expect(container.querySelector(".stats-grid")).toBeNull();
  const rows = Array.from(container.querySelectorAll("tbody tr"));
  expect(rows).toHaveLength(3);
  expect(rows.every((row) => row.className === "")).toBe(true);
  expect(
    rows.every((row) => row.querySelectorAll("td")[1].className === ""),
  ).toBe(true);
  expect(
    container.querySelector(".history-best .best-single-value"),
  ).toHaveTextContent("00:10.00");
  expect(container.querySelector("#stats")).toBe(
    container.querySelector("thead"),
  );
});

it("keeps the informative crown separate from timer keyboard input", async () => {
  seedHistory("[12.34]");
  render(<App />);
  await flushStorage();
  const crown = screen.getByRole("img", { name: "Today's best" });
  expect(crown).toHaveAttribute("tabindex", "0");
  act(() => crown.focus());
  fireEvent.keyDown(crown, { code: "Space" });
  advance(350);
  fireEvent.keyUp(crown, { code: "Space" });
  expect(screen.getByText("Ready for your next solve")).toBeInTheDocument();
  expect(saved()).toEqual([12.34]);
});

it("shows chronological rolling values and earlier best averages, recalculating after deletion and reload", async () => {
  seedHistory(
    JSON.stringify(Array.from({ length: 13 }, (_, i) => (i + 1) * 10)),
  );
  const first = render(<App />);
  const row = (attempt: number) =>
    screen
      .getByRole("button", { name: `Delete solve ${attempt}` })
      .closest("tr")!;
  const cells = (attempt: number) =>
    Array.from(row(attempt).querySelectorAll("td"))
      .slice(0, 4)
      .map((cell) => cell.textContent);
  const summaryValues = () =>
    Array.from(
      document.querySelectorAll(".history-best-value"),
      (cell) => cell.textContent,
    );
  const bestValue = (label: string) =>
    screen
      .getByRole("row", { name: "Daily best results" })
      .querySelectorAll(".history-best-value")[
      ["Best single", "Best AO5", "Best AO12"].indexOf(label)
    ];
  await flushStorage();
  expect(cells(13)).toEqual(["13", "02:10.00", "01:50.00", "01:15.00"]);
  expect(summaryValues()).toEqual(["00:10.00", "00:30.00", "01:05.00"]);

  expect(cells(5)).toEqual(["5", "00:50.00", "00:30.00", "—"]);

  expect(cells(1)).toEqual(["1", "00:10.00", "—", "—"]);

  expect(bestValue("Best single")).toHaveTextContent("00:10.00");

  expect(bestValue("Best AO5")).toHaveTextContent("00:30.00");

  expect(bestValue("Best AO12")).toHaveTextContent("01:05.00");

  expect(screen.getByText("Total 15:10.00")).toBeInTheDocument();

  expect(
    screen.queryByText("Rolling averages end at each solve."),
  ).not.toBeInTheDocument();

  expect(
    screen.queryByRole("heading", { name: "Total time" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete solve 3" }));
  await flushStorage();
  expect(bestValue("Best AO5")).toHaveTextContent("00:36.67");

  expect(bestValue("Best AO12")).toHaveTextContent("01:14.00");
  expect(summaryValues()).toEqual(["00:10.00", "00:36.67", "01:14.00"]);

  expect(cells(12)).toEqual(["12", "02:10.00", "01:50.00", "01:14.00"]);
  first.unmount();
  render(<App />);
  await flushStorage();
  expect(bestValue("Best AO12")).toHaveTextContent("01:14.00");
  fireEvent.click(screen.getByRole("button", { name: "Delete solve 1" }));
  await flushStorage();
  expect(bestValue("Best single")).toHaveTextContent("00:20.00");
  expect(summaryValues()).toEqual(["00:20.00", "00:50.00", "—"]);

  expect(bestValue("Best AO12")).toHaveTextContent("—");

  expect(cells(11)[3]).toBe("—");
  touchStart();
  advance(500);
  pointerEvent("pointerdown", {}, document.body);
  pointerEvent("pointerup", {}, document.body);
  fireEvent.touchEnd(document.body, { touches: [] });
  await flushStorage();
  expect(bestValue("Best single")).toHaveTextContent("00:00.50");

  expect(bestValue("Best AO12")).toHaveTextContent("01:14.00");

  expect(cells(12)).toEqual(["12", "00:00.50", "01:50.00", "01:14.00"]);
});
it("closes the finish picker with Escape without cancelling a running solve", async () => {
  render(<App />);
  fireEvent.keyDown(window, { code: "Space" });
  advance(310);
  fireEvent.keyUp(window, { code: "Space" });
  advance(400);
  fireEvent.click(screen.getByRole("button", { name: "Choose cube finish" }));
  await flushStorage();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(window, { code: "Escape" });
  await flushStorage();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  expect(screen.getByText("Solving")).toBeInTheDocument();

  await flushStorage();
  expect(saved()).toEqual([]);
  advance(240);
  fireEvent.keyDown(window, { code: "KeyA" });
  await flushStorage();
  expect(saved()[0]).toBeCloseTo(0.64);
});
describe("Space timer lifecycle", () => {
  it("returns focus after selection and runs a fresh hold/release/stop without clicking the timer", async () => {
    render(<App />);
    const picker = screen.getByRole("button", { name: "Choose cube finish" });
    act(() => picker.focus());
    fireEvent.click(picker);
    const choice = screen.getByRole("button", { name: "Neon · Round" });
    act(() => choice.focus());
    fireEvent.click(choice);
    advance(0);
    await flushStorage();
    expect(surface()).toHaveFocus();
    // The release used to select a finish must never start a solve.
    fireEvent.keyUp(surface(), { code: "Space" });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(surface(), { code: "Space" });
    advance(150);
    fireEvent.keyDown(surface(), { code: "Space", repeat: true });
    advance(160);
    await flushStorage();
    expect(screen.getByText("Ready · release to start")).toBeInTheDocument();
    fireEvent.keyUp(surface(), { code: "Space" });
    await flushStorage();
    expect(screen.getByText("Solving")).toBeInTheDocument();
    advance(500);
    fireEvent.keyDown(surface(), { code: "Space" });
    fireEvent.keyDown(surface(), { code: "Space", repeat: true });
    fireEvent.keyUp(surface(), { code: "Space" });
    await flushStorage();
    expect(saved()).toEqual([0.5]);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("returns focus to the timer on Escape but preserves intentional outside-control focus", async () => {
    seedHistory("[12]");
    render(<App />);
    const picker = screen.getByRole("button", { name: "Choose cube finish" });
    act(() => picker.focus());
    fireEvent.click(picker);
    fireEvent.keyDown(window, { code: "Escape" });
    advance(0);
    await flushStorage();
    expect(surface()).toHaveFocus();
    const outside = screen.getByRole("button", { name: "Delete solve 1" });
    fireEvent.click(picker);
    act(() => outside.focus());
    fireEvent.keyDown(outside, { code: "Escape" });
    advance(0);
    await flushStorage();
    expect(outside).toHaveFocus();
    const space = new KeyboardEvent("keydown", {
      code: "Space",
      bubbles: true,
      cancelable: true,
    });
    fireEvent(outside, space);
    await flushStorage();
    expect(space.defaultPrevented).toBe(false);
    advance(350);
    fireEvent.keyUp(outside, { code: "Space" });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();

    await flushStorage();
    expect(saved()).toEqual([12]);
  });
  it("consumes background Space and a long outside press used to close the finish picker", async () => {
    render(<App />);
    const timer = surface();
    fireEvent.click(screen.getByRole("button", { name: "Choose cube finish" }));
    fireEvent.keyDown(window, { code: "Space" });
    advance(350);
    fireEvent.keyUp(window, { code: "Space" });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerdown", {}, timer);
    await flushStorage();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    advance(350);
    pointerEvent("pointerup");
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();

    await flushStorage();
    expect(saved()).toEqual([]);
  });
  it("consumes repeated Space keydown and keyup defaults without a second solve", async () => {
    render(<App />);
    const down = new KeyboardEvent("keydown", {
      code: "Space",
      cancelable: true,
    });
    fireEvent(window, down);
    await flushStorage();
    expect(down.defaultPrevented).toBe(true);
    advance(310);
    const repeat = new KeyboardEvent("keydown", {
      code: "Space",
      repeat: true,
      cancelable: true,
    });
    fireEvent(window, repeat);
    await flushStorage();
    expect(repeat.defaultPrevented).toBe(true);
    const up = new KeyboardEvent("keyup", { code: "Space", cancelable: true });
    fireEvent(window, up);
    await flushStorage();
    expect(up.defaultPrevented).toBe(true);

    expect(screen.getByText("Solving")).toBeInTheDocument();
    advance(300);
    fireEvent.keyDown(window, { code: "Space" });
    fireEvent.keyDown(window, { code: "Space", repeat: true });
    fireEvent.keyUp(window, { code: "Space" });
    await flushStorage();
    expect(saved()).toHaveLength(1);
  });
  it.each(["input", "textarea", "contenteditable", "plaintext-only"])(
    "cancels a pending hold when focus enters %s and leaves editing Space untouched",
    async (kind) => {
      render(<App />);
      const control = document.createElement(
        kind === "input" || kind === "textarea" ? kind : "div",
      );
      if (kind === "contenteditable" || kind === "plaintext-only") {
        control.setAttribute(
          "contenteditable",
          kind === "contenteditable" ? "" : "plaintext-only",
        );
        control.tabIndex = 0;
      }
      document.body.append(control);
      fireEvent.keyDown(window, { code: "Space" });
      advance(310);
      act(() => control.focus());
      const up = new KeyboardEvent("keyup", {
        code: "Space",
        bubbles: true,
        cancelable: true,
      });
      fireEvent(control, up);
      const down = new KeyboardEvent("keydown", {
        code: "Space",
        bubbles: true,
        cancelable: true,
      });
      fireEvent(control, down);
      await flushStorage();
      expect(up.defaultPrevented).toBe(false);

      expect(down.defaultPrevented).toBe(false);

      expect(screen.queryByText("Solving")).not.toBeInTheDocument();

      expect(
        screen.queryByText("Ready · release to start"),
      ).not.toBeInTheDocument();

      await flushStorage();
      expect(saved()).toEqual([]);
      control.remove();
    },
  );
  it("cancels keyboard readiness on blur, but preserves an already running solve", async () => {
    render(<App />);
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.blur(window);
    fireEvent.keyUp(window, { code: "Space" });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(400);
    fireEvent.blur(window);
    advance(200);
    await flushStorage();
    expect(screen.getByText("Solving")).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "KeyA" });
    await flushStorage();
    expect(saved()[0]).toBeCloseTo(0.6);
  });
  it("starts on release, stops on press, consumes stop release and repeat events", async () => {
    render(<App />);
    fireEvent.keyDown(window, { code: "Space" });
    await flushStorage();
    expect(screen.getByText("Keep holding…")).toBeInTheDocument();
    advance(500);
    await flushStorage();
    expect(screen.getByText("Ready · release to start")).toBeInTheDocument();

    await flushStorage();
    expect(saved()).toEqual([]);
    fireEvent.keyUp(window, { code: "Space" });
    advance(1250);
    fireEvent.keyDown(window, { code: "Space" });
    await flushStorage();
    expect(saved()[0]).toBeCloseTo(1.25);
    fireEvent.keyDown(window, { code: "Space", repeat: true });
    fireEvent.keyUp(window, { code: "Space" });
    advance(1000);
    await flushStorage();
    expect(saved()).toHaveLength(1);

    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(620);
    fireEvent.keyDown(window, { code: "Space" });
    fireEvent.keyUp(window, { code: "Space" });
    await flushStorage();
    expect(saved()).toHaveLength(2);

    await flushStorage();
    expect(saved()[1]).toBeCloseTo(0.62);
  });
  it("cancels early Space release and Escape; uses any key to stop after the csTimer debounce", async () => {
    render(<App />);
    fireEvent.keyDown(window, { code: "Space" });
    advance(100);
    fireEvent.keyUp(window, { code: "Space" });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyDown(window, { code: "Escape" });
    fireEvent.keyUp(window, { code: "Space" });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(100);
    fireEvent.keyDown(window, { code: "KeyA" });
    await flushStorage();
    expect(saved()).toEqual([]);

    expect(screen.getByText("Solving")).toBeInTheDocument();
    advance(150);
    fireEvent.keyDown(window, { code: "KeyA" });
    await flushStorage();
    expect(saved()[0]).toBeCloseTo(0.25);
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    advance(200);
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(400);
    fireEvent.keyDown(window, { code: "Escape" });
    await flushStorage();
    expect(saved()).toHaveLength(1);

    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
  });
  it("does not record hidden solves on the cube review page", async () => {
    window.history.replaceState(null, "", "?cube-options");
    render(<App />);
    await flushStorage();
    expect(screen.queryByText("Original / Baseline")).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Use Flat finish" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(500);
    fireEvent.keyDown(window, { code: "Space" });
    await flushStorage();
    expect(saved()).toEqual([]);
    window.history.replaceState(null, "", "/");
  });
  it("does not use Space on interactive controls to arm the timer", async () => {
    seedHistory("[12]");
    render(<App />);
    const button = screen.getByRole("button", { name: "Delete solve 1" });
    fireEvent.keyDown(button, { code: "Space" });
    fireEvent.keyUp(button, { code: "Space" });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();

    await flushStorage();
    expect(saved()).toEqual([12]);
  });
});
describe("large touch surface lifecycle", () => {
  it("requires a 300ms hold, stops on first contact and consumes release", async () => {
    render(<App />);
    pointerEvent("pointerdown");
    advance(100);
    pointerEvent("pointerup");
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    touchStart();
    await flushStorage();
    expect(screen.getByText("Solving")).toBeInTheDocument();
    advance(850);
    pointerEvent("pointerdown");
    await flushStorage();
    expect(saved()[0]).toBeCloseTo(0.85);
    pointerEvent("pointerup");
    fireEvent.touchEnd(surface(), { touches: [] });
    advance(500);
    await flushStorage();
    expect(saved()).toHaveLength(1);

    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    touchStart();
    advance(400);
    pointerEvent("pointerdown");
    pointerEvent("pointerup");
    fireEvent.touchEnd(surface(), { touches: [] });
    await flushStorage();
    expect(saved()).toHaveLength(2);
  });
  it.each(["pointercancel", "lostpointercapture", "blur", "resize"])(
    "cancels an unstarted hold on %s",
    async (type) => {
      render(<App />);
      pointerEvent("pointerdown");
      advance(310);
      if (type === "blur" || type === "resize") {
        fireEvent(window, new Event(type));
      } else {
        pointerEvent(type);
      }
      pointerEvent("pointerup");
      advance(500);
      await flushStorage();
      expect(saved()).toEqual([]);

      expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    },
  );
  it("cancels drags and leaving the target; ignores second fingers while arming", async () => {
    render(<App />);
    pointerEvent("pointerdown");
    pointerEvent("pointermove", { clientY: 125 });
    advance(400);
    pointerEvent("pointerup");
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerdown", { clientX: 398 });
    advance(310);
    pointerEvent("pointermove", { clientX: 403 });
    pointerEvent("pointerup");
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerdown");
    advance(310);
    pointerEvent("pointerdown", { pointerId: 2, isPrimary: false });
    pointerEvent("pointerup", { pointerId: 2, isPrimary: false });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerup");
    advance(700);
    pointerEvent("pointerdown", { pointerId: 2, isPrimary: false });
    pointerEvent("pointerup", { pointerId: 2, isPrimary: false });
    await flushStorage();
    expect(saved()[0]).toBeCloseTo(0.7);

    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerdown");
    pointerEvent("pointerup");
    await flushStorage();
    expect(saved()).toHaveLength(1);
  });
  it("ignores a second finger's cancellation and checks final release position", async () => {
    render(<App />);
    pointerEvent("pointerdown");
    advance(310);
    pointerEvent("pointercancel", { pointerId: 2, isPrimary: false });
    pointerEvent("lostpointercapture", { pointerId: 2, isPrimary: false });
    await flushStorage();
    expect(screen.getByText("Ready · release to start")).toBeInTheDocument();
    pointerEvent("pointerup", { clientX: 450 });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();

    await flushStorage();
    expect(saved()).toEqual([]);
  });
  it("cancels holding when the page is backgrounded", async () => {
    render(<App />);
    pointerEvent("pointerdown");
    advance(310);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    pointerEvent("pointerup");
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();

    await flushStorage();
    expect(saved()).toEqual([]);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });
});

describe("page-wide touchscreen stop", () => {
  it.each([
    ["blur", "cube"],
    ["blur", "delete"],
    ["blur", "link"],
    ["resize", "cube"],
    ["resize", "delete"],
    ["resize", "link"],
  ])(
    "keeps delayed clicks consumed after %s over %s",
    async (interruption, area) => {
      seedHistory("[12]");
      render(<App />);
      touchStart();
      advance(40);
      const picker = screen.getByRole("button", { name: "Choose cube finish" });
      const target =
        area === "cube"
          ? picker
          : area === "delete"
            ? screen.getByRole("button", { name: "Delete solve 1" })
            : screen.getByRole("link", { name: "CubeTimer365 timer" });
      const activated = vi.fn((event: Event) => event.preventDefault());
      target.addEventListener("click", activated);
      pointerEvent("pointerdown", {}, target);
      fireEvent(window, new Event(interruption));
      pointerEvent("pointerup", {}, target);
      fireEvent(target, new TouchEvent("touchend", { bubbles: true }));
      advance(350);
      fireEvent.click(target, { detail: 1 });
      fireEvent.click(target, { detail: 1 });
      await flushStorage();
      expect(activated).not.toHaveBeenCalled();

      await flushStorage();
      expect(saved()).toEqual([12, 0.04]);

      expect(screen.queryByText("Solving")).not.toBeInTheDocument();

      expect(
        screen.queryByRole("button", { name: "Flat · Round" }),
      ).not.toBeInTheDocument();
      target.removeEventListener("click", activated);
      pointerEvent("pointerdown", {}, picker);
      pointerEvent("pointerup", {}, picker);
      fireEvent.click(picker, { detail: 1 });
      await flushStorage();
      expect(
        screen.getByRole("button", { name: "Flat · Round" }),
      ).toBeInTheDocument();
    },
  );

  it.each(["background", "scramble", "cube", "delete", "link"])(
    "stops over %s and consumes the complete touch and compatibility clicks",
    async (area) => {
      seedHistory("[12]");
      render(<App />);
      touchStart();
      fireEvent.click(surface(), { detail: 1 });
      await flushStorage();
      expect(screen.getByText("Solving")).toBeInTheDocument();

      await flushStorage();
      expect(saved()).toEqual([12]);
      const target =
        area === "background"
          ? document.body
          : area === "scramble"
            ? document.querySelector<HTMLElement>(".scramble-content")!
            : area === "cube"
              ? screen.getByRole("button", { name: "Choose cube finish" })
              : area === "delete"
                ? screen.getByRole("button", { name: "Delete solve 1" })
                : screen.getByRole("link", { name: "CubeTimer365 timer" });
      const activated = vi.fn();
      target.addEventListener("click", activated);
      advance(750);
      await flushStorage();
      expect(pointerEvent("pointerdown", {}, target).defaultPrevented).toBe(
        true,
      );
      const touch = (type: string) => {
        const event = new TouchEvent(type, { bubbles: true, cancelable: true });
        fireEvent(target, event);
        expect(event.defaultPrevented).toBe(true);
      };
      touch("touchstart");
      await flushStorage();
      expect(saved()).toEqual([12, 0.75]);
      advance(350);
      await flushStorage();
      expect(pointerEvent("pointerup", {}, target).defaultPrevented).toBe(true);
      touch("touchend");
      fireEvent.click(target, { detail: 1 });
      fireEvent.click(target, { detail: 1 });
      await flushStorage();
      expect(activated).not.toHaveBeenCalled();

      await flushStorage();
      expect(saved()).toEqual([12, 0.75]);

      expect(screen.queryByText("Solving")).not.toBeInTheDocument();

      expect(
        screen.queryByRole("button", { name: "Flat · Round" }),
      ).not.toBeInTheDocument();
      // The next physical gesture can use controls normally.
      const remove = screen.getByRole("button", { name: "Delete solve 1" });
      pointerEvent("pointerdown", {}, remove);
      pointerEvent("pointerup", {}, remove);
      fireEvent.click(remove, { detail: 1 });
      await flushStorage();
      expect(saved()).toEqual([0.75]);
      target.removeEventListener("click", activated);
    },
  );

  it.each(["keyboard", "touch"])(
    "stops on a non-primary contact after %s start with another finger held",
    async (input) => {
      seedHistory("[12]");
      render(<App />);
      if (input === "keyboard") {
        pointerEvent("pointerdown", {}, document.body);
        fireEvent.keyDown(window, { code: "Space" });
        advance(310);
        fireEvent.keyUp(window, { code: "Space" });
      } else {
        pointerEvent("pointerdown");
        advance(310);
        pointerEvent(
          "pointerdown",
          { pointerId: 2, isPrimary: false },
          document.body,
        );
        pointerEvent("pointerup");
      }
      await flushStorage();
      expect(screen.getByText("Solving")).toBeInTheDocument();

      await flushStorage();
      expect(saved()).toEqual([12]);
      advance(40);
      const picker = screen.getByRole("button", { name: "Choose cube finish" });
      const contact = { pointerId: 3, isPrimary: false };
      await flushStorage();
      expect(
        pointerEvent("pointerdown", contact, picker).defaultPrevented,
      ).toBe(true);

      await flushStorage();
      expect(saved()).toEqual([12, 0.04]);
      advance(350);
      pointerEvent("pointerup", contact, picker);
      const heldId = input === "keyboard" ? 1 : 2;
      fireEvent.touchEnd(picker, { touches: [{ identifier: heldId }] });
      const laterContact = { pointerId: 4, isPrimary: false };
      await flushStorage();
      expect(
        pointerEvent("pointerdown", laterContact, picker).defaultPrevented,
      ).toBe(true);
      pointerEvent("pointerup", laterContact, picker);
      fireEvent.touchEnd(picker, { touches: [{ identifier: heldId }] });
      pointerEvent("pointerup", { pointerId: heldId }, document.body);
      fireEvent.touchEnd(document.body, { touches: [] });
      fireEvent.click(picker, { detail: 1 });
      fireEvent.click(picker, { detail: 1 });
      await flushStorage();
      expect(saved()).toEqual([12, 0.04]);

      expect(screen.queryByText("Solving")).not.toBeInTheDocument();

      expect(
        screen.queryByRole("button", { name: "Flat · Round" }),
      ).not.toBeInTheDocument();
      pointerEvent("pointerdown", {}, picker);
      pointerEvent("pointerup", {}, picker);
      fireEvent.click(picker, { detail: 1 });
      await flushStorage();
      expect(
        screen.getByRole("button", { name: "Flat · Round" }),
      ).toBeInTheDocument();
    },
  );

  it("saves the next distinct tap even within the keyboard start debounce", async () => {
    render(<App />);
    touchStart();
    advance(40);
    pointerEvent("pointerdown", {}, document.body);
    pointerEvent("pointerup", {}, document.body);
    await flushStorage();
    expect(saved()[0]).toBeCloseTo(0.04);

    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
  });

  it("keeps desktop clicks and Escape behavior while a solve runs", async () => {
    render(<App />);
    touchStart();
    advance(750);
    const picker = screen.getByRole("button", { name: "Choose cube finish" });
    await flushStorage();
    expect(
      pointerEvent("pointerdown", { pointerType: "mouse" }, picker)
        .defaultPrevented,
    ).toBe(false);
    pointerEvent("pointerup", { pointerType: "mouse" }, picker);
    fireEvent.click(picker, { detail: 1 });
    await flushStorage();
    expect(
      screen.getByRole("button", { name: "Flat · Round" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Solving")).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Escape" });
    await flushStorage();
    expect(screen.getByText("Solving")).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Escape" });
    await flushStorage();
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();

    await flushStorage();
    expect(saved()).toEqual([]);
  });
});
