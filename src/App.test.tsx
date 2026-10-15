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
const surface = () => screen.getByRole("button", { name: /Timer surface/ });
const saved = () =>
  JSON.parse(localStorage.getItem("history") || "[]") as number[];
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
  localStorage.setItem("today", new Date().toISOString().split("T")[0]);
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
  it("carries rounded centiseconds into the next minute without changing stored times", () => {
    localStorage.setItem("history", "[59.999,119.999]");
    render(<App />);
    const times = Array.from(
      screen.getByRole("table").querySelectorAll("tbody td:nth-child(2)"),
      (cell) => cell.textContent,
    );
    expect(times).toEqual(["02:00.00", "01:00.00"]);
    expect(saved()).toEqual([59.999, 119.999]);
  });
  it("matches the original daily scramble fixture exactly", () => {
    expect(generateScramble(20261012)).toBe(
      "L2 R2 D2 B' U2 F' B2 L2 D2 F R' D' L' U2 B2 U2 B L' F' R'",
    );
  });
  it("updates the daily scramble and existing UTC history boundary while open", () => {
    vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    localStorage.setItem("today", "2026-10-12");
    localStorage.setItem("history", "[12]");
    const { container } = render(<App />);
    const moves = () => container.querySelector(".scramble-moves")?.textContent;
    expect(moves()).toBe(generateScramble(20261012));
    advance(24 * 60 * 60 * 1000);
    expect(moves()).toBe(generateScramble(20261013));
    expect(localStorage.getItem("today")).toBe("2026-10-13");
    expect(saved()).toEqual([]);
    expect(
      Array.from(
        screen
          .getByRole("region", { name: "Today's best results" })
          .querySelectorAll(".stat p"),
      ).map((value) => value.textContent),
    ).toEqual(["—", "—", "—"]);
  });
  it("loads existing history, keeps averages and deletion persistent", () => {
    localStorage.setItem("history", "[10,20,30,40,50]");
    const first = render(<App />);
    expect(screen.getByText("5 solves")).toBeInTheDocument();
    expect(screen.getByTestId("chart-data").textContent).toContain('"ao5":30');
    fireEvent.click(screen.getByRole("button", { name: "Delete solve 3" }));
    expect(saved()).toEqual([10, 20, 40, 50]);
    first.unmount();
    render(<App />);
    expect(screen.getByText("4 solves")).toBeInTheDocument();
    expect(saved()).toEqual([10, 20, 40, 50]);
  });
});
it("distinguishes saving with Space from cancelling with Escape in the timer instructions", () => {
  render(<App />);
  expect(surface()).toHaveAccessibleName(
    /Press Space to stop and save, or tap anywhere on a touchscreen\. Escape cancels the attempt\./,
  );
  touchStart();
  advance(250);
  expect(
    screen.getByText("Press Space to save · Esc to cancel"),
  ).toBeInTheDocument();
  fireEvent.keyDown(window, { code: "Escape" });
  expect(saved()).toEqual([]);
  expect(screen.queryByText("Solving")).not.toBeInTheDocument();
  advance(200);
  touchStart();
  advance(250);
  fireEvent.keyDown(window, { code: "Space" });
  fireEvent.keyUp(window, { code: "Space" });
  expect(saved()).toHaveLength(1);
  expect(saved()[0]).toBeCloseTo(0.25);
});
it("defaults to screen-space Cyber without a query and switches finishes without altering history", () => {
  localStorage.setItem("history", "[12,15]");
  const { container } = render(<App />);
  expect(container.querySelectorAll("[data-screen-interference]")).toHaveLength(
    1,
  );
  expect(container.querySelectorAll("[data-scanlines]")).toHaveLength(0);
  const picker = screen.getByRole("button", { name: "Choose cube finish" });
  expect(
    screen.getByRole("img", {
      name: "Daily scramble cube, rounded cyber finish",
    }),
  ).toBeInTheDocument();
  fireEvent.click(picker);
  expect(screen.getByRole("button", { name: "Cyber · Round" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.queryByRole("button", { name: "Original" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Flat · Round" }));
  expect(container.querySelector("[data-screen-interference]")).toBeNull();
  expect(
    screen.getByRole("img", {
      name: "Daily scramble cube, rounded flat finish",
    }),
  ).toBeInTheDocument();
  fireEvent.click(picker);
  fireEvent.click(screen.getByRole("button", { name: "Neon · Round" }));
  expect(container.querySelector("[data-screen-interference]")).toBeNull();
  fireEvent.keyDown(picker, { code: "Space" });
  advance(310);
  fireEvent.keyUp(picker, { code: "Space" });
  expect(screen.queryByText("Solving")).not.toBeInTheDocument();
  fireEvent.click(picker);
  fireEvent.click(screen.getByRole("button", { name: "Cyber · Round" }));
  expect(container.querySelectorAll("[data-screen-interference]")).toHaveLength(
    1,
  );
  expect(saved()).toEqual([12, 15]);
});
it("shows per-solve rolling averages without restoring the comparison column", () => {
  localStorage.setItem("history", "[10,20,30,40,50]");
  render(<App />);
  const table = screen.getByRole("table");
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
  expect(saved()).toEqual([10, 20, 30, 40, 50]);
});
it("shows chronological rolling values and earlier best averages, recalculating after deletion and reload", () => {
  localStorage.setItem(
    "history",
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
  const bestValue = (label: string) =>
    within(screen.getByRole("region", { name: "Today's best results" }))
      .getByRole("heading", { name: label })
      .parentElement!.querySelector("p");
  expect(cells(13)).toEqual(["13", "02:10.00", "01:50.00", "01:15.00"]);
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
  expect(bestValue("Best AO5")).toHaveTextContent("00:36.67");
  expect(bestValue("Best AO12")).toHaveTextContent("01:14.00");
  expect(cells(12)).toEqual(["12", "02:10.00", "01:50.00", "01:14.00"]);
  first.unmount();
  render(<App />);
  expect(bestValue("Best AO12")).toHaveTextContent("01:14.00");
  fireEvent.click(screen.getByRole("button", { name: "Delete solve 1" }));
  expect(bestValue("Best single")).toHaveTextContent("00:20.00");
  expect(bestValue("Best AO12")).toHaveTextContent("—");
  expect(cells(11)[3]).toBe("—");
  touchStart();
  advance(500);
  pointerEvent("pointerdown", {}, document.body);
  pointerEvent("pointerup", {}, document.body);
  fireEvent.touchEnd(document.body, { touches: [] });
  expect(bestValue("Best single")).toHaveTextContent("00:00.50");
  expect(bestValue("Best AO12")).toHaveTextContent("01:14.00");
  expect(cells(12)).toEqual(["12", "00:00.50", "01:50.00", "01:14.00"]);
});
it("closes the finish picker with Escape without cancelling a running solve", () => {
  render(<App />);
  fireEvent.keyDown(window, { code: "Space" });
  advance(310);
  fireEvent.keyUp(window, { code: "Space" });
  advance(400);
  fireEvent.click(screen.getByRole("button", { name: "Choose cube finish" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(window, { code: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Solving")).toBeInTheDocument();
  expect(saved()).toEqual([]);
  advance(240);
  fireEvent.keyDown(window, { code: "KeyA" });
  expect(saved()[0]).toBeCloseTo(0.64);
});
describe("Space timer lifecycle", () => {
  it("returns focus after selection and runs a fresh hold/release/stop without clicking the timer", () => {
    render(<App />);
    const picker = screen.getByRole("button", { name: "Choose cube finish" });
    act(() => picker.focus());
    fireEvent.click(picker);
    const choice = screen.getByRole("button", { name: "Neon · Round" });
    act(() => choice.focus());
    fireEvent.click(choice);
    advance(0);
    expect(surface()).toHaveFocus();
    // The release used to select a finish must never start a solve.
    fireEvent.keyUp(surface(), { code: "Space" });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(surface(), { code: "Space" });
    advance(150);
    fireEvent.keyDown(surface(), { code: "Space", repeat: true });
    advance(160);
    expect(screen.getByText("Ready · release to start")).toBeInTheDocument();
    fireEvent.keyUp(surface(), { code: "Space" });
    expect(screen.getByText("Solving")).toBeInTheDocument();
    advance(500);
    fireEvent.keyDown(surface(), { code: "Space" });
    fireEvent.keyDown(surface(), { code: "Space", repeat: true });
    fireEvent.keyUp(surface(), { code: "Space" });
    expect(saved()).toEqual([0.5]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("returns focus to the timer on Escape but preserves intentional outside-control focus", () => {
    localStorage.setItem("history", "[12]");
    render(<App />);
    const picker = screen.getByRole("button", { name: "Choose cube finish" });
    act(() => picker.focus());
    fireEvent.click(picker);
    fireEvent.keyDown(window, { code: "Escape" });
    advance(0);
    expect(surface()).toHaveFocus();
    const outside = screen.getByRole("button", { name: "Delete solve 1" });
    fireEvent.click(picker);
    act(() => outside.focus());
    fireEvent.keyDown(outside, { code: "Escape" });
    advance(0);
    expect(outside).toHaveFocus();
    const space = new KeyboardEvent("keydown", {
      code: "Space",
      bubbles: true,
      cancelable: true,
    });
    fireEvent(outside, space);
    expect(space.defaultPrevented).toBe(false);
    advance(350);
    fireEvent.keyUp(outside, { code: "Space" });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    expect(saved()).toEqual([12]);
  });
  it("consumes background Space and a long outside press used to close the finish picker", () => {
    render(<App />);
    const timer = surface();
    fireEvent.click(screen.getByRole("button", { name: "Choose cube finish" }));
    fireEvent.keyDown(window, { code: "Space" });
    advance(350);
    fireEvent.keyUp(window, { code: "Space" });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerdown", {}, timer);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    advance(350);
    pointerEvent("pointerup");
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    expect(saved()).toEqual([]);
  });
  it("consumes repeated Space keydown and keyup defaults without a second solve", () => {
    render(<App />);
    const down = new KeyboardEvent("keydown", {
      code: "Space",
      cancelable: true,
    });
    fireEvent(window, down);
    expect(down.defaultPrevented).toBe(true);
    advance(310);
    const repeat = new KeyboardEvent("keydown", {
      code: "Space",
      repeat: true,
      cancelable: true,
    });
    fireEvent(window, repeat);
    expect(repeat.defaultPrevented).toBe(true);
    const up = new KeyboardEvent("keyup", { code: "Space", cancelable: true });
    fireEvent(window, up);
    expect(up.defaultPrevented).toBe(true);
    expect(screen.getByText("Solving")).toBeInTheDocument();
    advance(300);
    fireEvent.keyDown(window, { code: "Space" });
    fireEvent.keyDown(window, { code: "Space", repeat: true });
    fireEvent.keyUp(window, { code: "Space" });
    expect(saved()).toHaveLength(1);
  });
  it.each(["input", "textarea", "contenteditable", "plaintext-only"])(
    "cancels a pending hold when focus enters %s and leaves editing Space untouched",
    (kind) => {
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
      expect(up.defaultPrevented).toBe(false);
      expect(down.defaultPrevented).toBe(false);
      expect(screen.queryByText("Solving")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Ready · release to start"),
      ).not.toBeInTheDocument();
      expect(saved()).toEqual([]);
      control.remove();
    },
  );
  it("cancels keyboard readiness on blur, but preserves an already running solve", () => {
    render(<App />);
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.blur(window);
    fireEvent.keyUp(window, { code: "Space" });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(400);
    fireEvent.blur(window);
    advance(200);
    expect(screen.getByText("Solving")).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "KeyA" });
    expect(saved()[0]).toBeCloseTo(0.6);
  });
  it("starts on release, stops on press, consumes stop release and repeat events", () => {
    render(<App />);
    fireEvent.keyDown(window, { code: "Space" });
    expect(screen.getByText("Keep holding…")).toBeInTheDocument();
    advance(500);
    expect(screen.getByText("Ready · release to start")).toBeInTheDocument();
    expect(saved()).toEqual([]);
    fireEvent.keyUp(window, { code: "Space" });
    advance(1250);
    fireEvent.keyDown(window, { code: "Space" });
    expect(saved()[0]).toBeCloseTo(1.25);
    fireEvent.keyDown(window, { code: "Space", repeat: true });
    fireEvent.keyUp(window, { code: "Space" });
    advance(1000);
    expect(saved()).toHaveLength(1);
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(620);
    fireEvent.keyDown(window, { code: "Space" });
    fireEvent.keyUp(window, { code: "Space" });
    expect(saved()).toHaveLength(2);
    expect(saved()[1]).toBeCloseTo(0.62);
  });
  it("cancels early Space release and Escape; uses any key to stop after the csTimer debounce", () => {
    render(<App />);
    fireEvent.keyDown(window, { code: "Space" });
    advance(100);
    fireEvent.keyUp(window, { code: "Space" });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyDown(window, { code: "Escape" });
    fireEvent.keyUp(window, { code: "Space" });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(100);
    fireEvent.keyDown(window, { code: "KeyA" });
    expect(saved()).toEqual([]);
    expect(screen.getByText("Solving")).toBeInTheDocument();
    advance(150);
    fireEvent.keyDown(window, { code: "KeyA" });
    expect(saved()[0]).toBeCloseTo(0.25);
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    advance(200);
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(400);
    fireEvent.keyDown(window, { code: "Escape" });
    expect(saved()).toHaveLength(1);
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
  });
  it("does not record hidden solves on the cube review page", () => {
    window.history.replaceState(null, "", "?cube-options");
    render(<App />);
    expect(screen.queryByText("Original / Baseline")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Use Flat finish" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Space" });
    advance(310);
    fireEvent.keyUp(window, { code: "Space" });
    advance(500);
    fireEvent.keyDown(window, { code: "Space" });
    expect(saved()).toEqual([]);
    window.history.replaceState(null, "", "/");
  });
  it("does not use Space on interactive controls to arm the timer", () => {
    localStorage.setItem("history", "[12]");
    render(<App />);
    const button = screen.getByRole("button", { name: "Delete solve 1" });
    fireEvent.keyDown(button, { code: "Space" });
    fireEvent.keyUp(button, { code: "Space" });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    expect(saved()).toEqual([12]);
  });
});
describe("large touch surface lifecycle", () => {
  it("requires a 300ms hold, stops on first contact and consumes release", () => {
    render(<App />);
    pointerEvent("pointerdown");
    advance(100);
    pointerEvent("pointerup");
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    touchStart();
    expect(screen.getByText("Solving")).toBeInTheDocument();
    advance(850);
    pointerEvent("pointerdown");
    expect(saved()[0]).toBeCloseTo(0.85);
    pointerEvent("pointerup");
    fireEvent.touchEnd(surface(), { touches: [] });
    advance(500);
    expect(saved()).toHaveLength(1);
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    touchStart();
    advance(400);
    pointerEvent("pointerdown");
    pointerEvent("pointerup");
    fireEvent.touchEnd(surface(), { touches: [] });
    expect(saved()).toHaveLength(2);
  });
  it.each(["pointercancel", "lostpointercapture", "blur", "resize"])(
    "cancels an unstarted hold on %s",
    (type) => {
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
      expect(saved()).toEqual([]);
      expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    },
  );
  it("cancels drags and leaving the target; ignores second fingers while arming", () => {
    render(<App />);
    pointerEvent("pointerdown");
    pointerEvent("pointermove", { clientY: 125 });
    advance(400);
    pointerEvent("pointerup");
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerdown", { clientX: 398 });
    advance(310);
    pointerEvent("pointermove", { clientX: 403 });
    pointerEvent("pointerup");
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerdown");
    advance(310);
    pointerEvent("pointerdown", { pointerId: 2, isPrimary: false });
    pointerEvent("pointerup", { pointerId: 2, isPrimary: false });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerup");
    advance(700);
    pointerEvent("pointerdown", { pointerId: 2, isPrimary: false });
    pointerEvent("pointerup", { pointerId: 2, isPrimary: false });
    expect(saved()[0]).toBeCloseTo(0.7);
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    pointerEvent("pointerdown");
    pointerEvent("pointerup");
    expect(saved()).toHaveLength(1);
  });
  it("ignores a second finger's cancellation and checks final release position", () => {
    render(<App />);
    pointerEvent("pointerdown");
    advance(310);
    pointerEvent("pointercancel", { pointerId: 2, isPrimary: false });
    pointerEvent("lostpointercapture", { pointerId: 2, isPrimary: false });
    expect(screen.getByText("Ready · release to start")).toBeInTheDocument();
    pointerEvent("pointerup", { clientX: 450 });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    expect(saved()).toEqual([]);
  });
  it("cancels holding when the page is backgrounded", () => {
    render(<App />);
    pointerEvent("pointerdown");
    advance(310);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    pointerEvent("pointerup");
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
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
  ])("keeps delayed clicks consumed after %s over %s", (interruption, area) => {
    localStorage.setItem("history", "[12]");
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
    expect(activated).not.toHaveBeenCalled();
    expect(saved()).toEqual([12, 0.04]);
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Flat · Round" }),
    ).not.toBeInTheDocument();
    target.removeEventListener("click", activated);
    pointerEvent("pointerdown", {}, picker);
    pointerEvent("pointerup", {}, picker);
    fireEvent.click(picker, { detail: 1 });
    expect(
      screen.getByRole("button", { name: "Flat · Round" }),
    ).toBeInTheDocument();
  });

  it.each(["background", "scramble", "cube", "delete", "link"])(
    "stops over %s and consumes the complete touch and compatibility clicks",
    (area) => {
      localStorage.setItem("history", "[12]");
      render(<App />);
      touchStart();
      fireEvent.click(surface(), { detail: 1 });
      expect(screen.getByText("Solving")).toBeInTheDocument();
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
      expect(pointerEvent("pointerdown", {}, target).defaultPrevented).toBe(
        true,
      );
      const touch = (type: string) => {
        const event = new TouchEvent(type, { bubbles: true, cancelable: true });
        fireEvent(target, event);
        expect(event.defaultPrevented).toBe(true);
      };
      touch("touchstart");
      expect(saved()).toEqual([12, 0.75]);
      advance(350);
      expect(pointerEvent("pointerup", {}, target).defaultPrevented).toBe(true);
      touch("touchend");
      fireEvent.click(target, { detail: 1 });
      fireEvent.click(target, { detail: 1 });
      expect(activated).not.toHaveBeenCalled();
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
      expect(saved()).toEqual([0.75]);
      target.removeEventListener("click", activated);
    },
  );

  it.each(["keyboard", "touch"])(
    "stops on a non-primary contact after %s start with another finger held",
    (input) => {
      localStorage.setItem("history", "[12]");
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
      expect(screen.getByText("Solving")).toBeInTheDocument();
      expect(saved()).toEqual([12]);
      advance(40);
      const picker = screen.getByRole("button", { name: "Choose cube finish" });
      const contact = { pointerId: 3, isPrimary: false };
      expect(
        pointerEvent("pointerdown", contact, picker).defaultPrevented,
      ).toBe(true);
      expect(saved()).toEqual([12, 0.04]);
      advance(350);
      pointerEvent("pointerup", contact, picker);
      const heldId = input === "keyboard" ? 1 : 2;
      fireEvent.touchEnd(picker, { touches: [{ identifier: heldId }] });
      const laterContact = { pointerId: 4, isPrimary: false };
      expect(
        pointerEvent("pointerdown", laterContact, picker).defaultPrevented,
      ).toBe(true);
      pointerEvent("pointerup", laterContact, picker);
      fireEvent.touchEnd(picker, { touches: [{ identifier: heldId }] });
      pointerEvent("pointerup", { pointerId: heldId }, document.body);
      fireEvent.touchEnd(document.body, { touches: [] });
      fireEvent.click(picker, { detail: 1 });
      fireEvent.click(picker, { detail: 1 });
      expect(saved()).toEqual([12, 0.04]);
      expect(screen.queryByText("Solving")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Flat · Round" }),
      ).not.toBeInTheDocument();
      pointerEvent("pointerdown", {}, picker);
      pointerEvent("pointerup", {}, picker);
      fireEvent.click(picker, { detail: 1 });
      expect(
        screen.getByRole("button", { name: "Flat · Round" }),
      ).toBeInTheDocument();
    },
  );

  it("saves the next distinct tap even within the keyboard start debounce", () => {
    render(<App />);
    touchStart();
    advance(40);
    pointerEvent("pointerdown", {}, document.body);
    pointerEvent("pointerup", {}, document.body);
    expect(saved()[0]).toBeCloseTo(0.04);
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
  });

  it("keeps desktop clicks and Escape behavior while a solve runs", () => {
    render(<App />);
    touchStart();
    advance(750);
    const picker = screen.getByRole("button", { name: "Choose cube finish" });
    expect(
      pointerEvent("pointerdown", { pointerType: "mouse" }, picker)
        .defaultPrevented,
    ).toBe(false);
    pointerEvent("pointerup", { pointerType: "mouse" }, picker);
    fireEvent.click(picker, { detail: 1 });
    expect(
      screen.getByRole("button", { name: "Flat · Round" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Solving")).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Escape" });
    expect(screen.getByText("Solving")).toBeInTheDocument();
    fireEvent.keyDown(window, { code: "Escape" });
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    expect(saved()).toEqual([]);
  });
});
