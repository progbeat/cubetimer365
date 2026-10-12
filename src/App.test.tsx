import {
  act,
  fireEvent,
  render,
  screen,
  cleanup,
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
const pointerEvent = (type: string, options: Record<string, unknown> = {}) => {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: 100,
    clientY: 100,
    ...options,
  });
  fireEvent(surface(), event);
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
  it("matches the original daily scramble fixture exactly", () => {
    expect(generateScramble(20261012)).toBe(
      "L2 R2 D2 B' U2 F' B2 L2 D2 F R' D' L' U2 B2 U2 B L' F' R'",
    );
  });
  it("updates the daily scramble and existing UTC history boundary while open", () => {
    vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
    localStorage.setItem("today", "2026-10-12");
    localStorage.setItem("history", "[12]");
    render(<App />);
    expect(screen.getByText(generateScramble(20261012))).toBeInTheDocument();
    advance(24 * 60 * 60 * 1000);
    expect(screen.getByText(generateScramble(20261013))).toBeInTheDocument();
    expect(localStorage.getItem("today")).toBe("2026-10-13");
    expect(saved()).toEqual([]);
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
describe("Space timer lifecycle", () => {
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
    advance(500);
    expect(saved()).toHaveLength(1);
    expect(screen.queryByText("Solving")).not.toBeInTheDocument();
    touchStart();
    advance(400);
    pointerEvent("pointerdown");
    pointerEvent("pointerup");
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
  it("cancels drags and leaving the target; ignores second fingers", () => {
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
    expect(saved()).toEqual([]);
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
