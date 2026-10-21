import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { createCalendarMark, type CalendarMark } from "./calendarMark";
import { useDailyFavicon } from "./useDailyFavicon";
import fixtures from "./fixtures/dailyLogo.json";

const Harness = ({ mark }: { mark: CalendarMark }) => {
  useDailyFavicon(mark);
  return null;
};
afterEach(() => {
  cleanup();
  document.head
    .querySelectorAll("link[data-test-fallback]")
    .forEach((link) => link.remove());
});

it("updates one existing SVG icon across dates and restores its static fallback on unmount", () => {
  for (const [type, href, id] of [
    ["image/png", "/fallback.png", ""],
    ["image/x-icon", "/fallback.ico", ""],
    ["image/svg+xml", "/fallback.svg", "daily-favicon"],
  ]) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = type;
    link.href = href;
    link.id = id;
    link.setAttribute("data-test-fallback", "");
    document.head.append(link);
  }
  const original = document.querySelector("#daily-favicon");
  const { rerender, unmount } = render(
    <Harness mark={createCalendarMark(fixtures[0].scramble)} />,
  );
  let previous = "";
  for (const fixture of fixtures) {
    rerender(<Harness mark={createCalendarMark(fixture.scramble)} />);
    expect(document.querySelectorAll("#daily-favicon")).toHaveLength(1);
    expect(document.querySelector("#daily-favicon")).toBe(original);
    const href = original?.getAttribute("href") || "";
    expect(href).toMatch(/^data:image\/svg\+xml,/);
    expect(href).not.toBe(previous);
    const svg = new DOMParser().parseFromString(
      decodeURIComponent(href.split(",")[1]),
      "image/svg+xml",
    );
    expect(
      Array.from(svg.querySelectorAll("[data-logo-sticker]"), (cell) =>
        cell.getAttribute("data-logo-color"),
      ),
    ).toEqual(fixture.back.flat().map((c) => `var(--mantine-color-${c})`));
    previous = href;
  }
  expect(document.querySelectorAll('link[rel="icon"]')).toHaveLength(3);
  expect(document.querySelector('link[type="image/png"]')).toHaveAttribute(
    "href",
    "/fallback.png",
  );
  expect(document.querySelector('link[type="image/x-icon"]')).toHaveAttribute(
    "href",
    "/fallback.ico",
  );
  unmount();
  expect(original).toHaveAttribute("href", "/fallback.svg");
});

it("removes its owned link on unmount and does not accumulate icons on remount", () => {
  const mark = createCalendarMark(fixtures[0].scramble);
  const first = render(<Harness mark={mark} />);
  expect(document.querySelectorAll("#daily-favicon")).toHaveLength(1);
  first.unmount();
  expect(document.querySelector("#daily-favicon")).toBeNull();
  const second = render(<Harness mark={mark} />);
  expect(document.querySelectorAll("#daily-favicon")).toHaveLength(1);
  second.unmount();
  expect(document.querySelector("#daily-favicon")).toBeNull();
});
