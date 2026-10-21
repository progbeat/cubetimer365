import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DailyLogo from "./DailyLogo";
import { createCalendarMark, calendarMarkSvg } from "./calendarMark";
import fixtures from "./fixtures/dailyLogo.json";

afterEach(cleanup);

describe.each(fixtures)(
  "daily calendar logo for $date",
  ({ scramble, back }) => {
    it("draws the nine rear stickers in reading order with a blue centre", () => {
      const { container } = render(
        <DailyLogo mark={createCalendarMark(scramble)} />,
      );
      const cells = Array.from(
        container.querySelectorAll("[data-logo-sticker]"),
      );
      expect(cells.map((cell) => cell.getAttribute("data-logo-color"))).toEqual(
        back.flat().map((color) => `var(--mantine-color-${color})`),
      );
      expect(cells[4]).toHaveAttribute(
        "data-logo-color",
        "var(--mantine-color-blue-6)",
      );
      expect(container.querySelector("svg")).toHaveAttribute(
        "data-logo-scramble",
        scramble,
      );
    });
  },
);

it("keeps the complete mark square including its bindings and flattens the stickers", () => {
  const { container } = render(<DailyLogo mark={createCalendarMark("")} />);
  const rectangles = Array.from(container.querySelectorAll("rect"), (node) => ({
    x: Number(node.getAttribute("x")),
    y: Number(node.getAttribute("y")),
    w: Number(node.getAttribute("width")),
    h: Number(node.getAttribute("height")),
  }));
  const width =
    Math.max(...rectangles.map((r) => r.x + r.w)) -
    Math.min(...rectangles.map((r) => r.x));
  const height =
    Math.max(...rectangles.map((r) => r.y + r.h)) -
    Math.min(...rectangles.map((r) => r.y));
  expect(width).toBeCloseTo(height);
  for (const cell of container.querySelectorAll("[data-logo-sticker]")) {
    expect(Number(cell.getAttribute("width"))).toBeGreaterThan(
      Number(cell.getAttribute("height")),
    );
  }
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

it("shares all sticker colors and geometry with the favicon SVG", () => {
  const mark = createCalendarMark(fixtures[1].scramble);
  const { container } = render(<DailyLogo mark={mark} />);
  const favicon = new DOMParser().parseFromString(
    calendarMarkSvg(mark),
    "image/svg+xml",
  );
  const attributes = (root: ParentNode) =>
    Array.from(root.querySelectorAll("rect"), (node) =>
      [
        "x",
        "y",
        "width",
        "height",
        "rx",
        "fill",
        "data-logo-sticker",
        "data-logo-color",
      ].map((key) => node.getAttribute(key)),
    );
  expect(attributes(favicon)).toEqual(attributes(container));
});
