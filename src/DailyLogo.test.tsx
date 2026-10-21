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

it("keeps a square viewbox, an open calendar outline and flattened stickers", () => {
  const { container } = render(<DailyLogo mark={createCalendarMark("")} />);
  expect(container.querySelector("svg")).toHaveAttribute(
    "viewBox",
    "0 0 32 32",
  );
  expect(container.querySelectorAll("path")).toHaveLength(1);
  expect(container.querySelector("path")).toHaveAttribute("fill", "none");
  expect(container.querySelectorAll("rect")).toHaveLength(11);
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
    Array.from(root.querySelectorAll("g, path, rect"), (node) =>
      [
        "x",
        "y",
        "width",
        "height",
        "rx",
        "fill",
        "transform",
        "d",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "data-logo-sticker",
        "data-logo-color",
      ].map((key) => node.getAttribute(key)),
    );
  expect(attributes(favicon)).toEqual(attributes(container));
});
