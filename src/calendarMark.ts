import { cubeFaceColors } from "./cubeGeometry";
import { colorKey, PALETTE } from "./cubeRenderer";

export const CALENDAR_VIEWBOX = "0 0 32 32";
type CalendarRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  fill: string;
  sticker?: string;
  color?: string;
};
export type CalendarMark = { scramble: string; rectangles: CalendarRect[] };

export function createCalendarMark(scramble: string): CalendarMark {
  const colors = cubeFaceColors(scramble, "B");
  return {
    scramble,
    rectangles: [
      { x: 1, y: 5, width: 30, height: 7, rx: 1.6, fill: "#ff2740" },
      ...[6, 22].flatMap((x) => [
        { x, y: 1, width: 4, height: 8, rx: 1.25, fill: "#080c0f" },
        {
          x: x + 0.7,
          y: 1.6,
          width: 2.6,
          height: 6.8,
          rx: 0.75,
          fill: "#edf2f5",
        },
      ]),
      ...colors.flatMap((row, i) =>
        row.map((color, j) => ({
          x: 1 + (31 / 3) * j,
          y: 13 + (19 / 3) * i,
          width: 28 / 3,
          height: 16 / 3,
          rx: 1,
          fill: PALETTE[colorKey(color)] || color,
          sticker: `B-${i}-${j}`,
          color,
        })),
      ),
    ],
  };
}

export const calendarRectAttributes = (rect: CalendarRect) => ({
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
  rx: rect.rx,
  fill: rect.fill,
  "data-logo-sticker": rect.sticker,
  "data-logo-color": rect.color,
});

const xml = (value: string | number) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

// Header, dynamic favicon and static fallbacks share this rectangle model.
export function calendarMarkSvg(mark: CalendarMark): string {
  const rectangles = mark.rectangles
    .map(
      (rect) =>
        `<rect ${Object.entries(calendarRectAttributes(rect))
          .flatMap(([key, value]) =>
            value === undefined ? [] : [`${key}="${xml(value)}"`],
          )
          .join(" ")} />`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="${CALENDAR_VIEWBOX}" data-logo-scramble="${xml(mark.scramble)}">${rectangles}</svg>`;
}
