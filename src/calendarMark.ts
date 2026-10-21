import { cubeFaceColors } from "./cubeGeometry";
import { colorKey, PALETTE } from "./cubeRenderer";

export const CALENDAR_VIEWBOX = "0 0 32 32";
export const calendarOutlineAttributes = {
  d: "M5 4.8H3.8A2.3 2.3 0 0 0 1.5 7.1V28.2A2.3 2.3 0 0 0 3.8 30.5H28.2A2.3 2.3 0 0 0 30.5 28.2V7.1A2.3 2.3 0 0 0 28.2 4.8H27M10.4 4.8H21.2",
  fill: "none",
  stroke: "#f3f5f6",
  strokeWidth: 1,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
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
      ...[6.5, 22.7].map((x) => ({
        x,
        y: 1,
        width: 2.5,
        height: 6.5,
        rx: 0.95,
        fill: "#f3f5f6",
      })),
      ...colors.flatMap((row, i) =>
        row.map((color, j) => ({
          x: 3.2 + 8.85 * j,
          y: 9.3 + 7.1 * i,
          width: 7.9,
          height: 5.8,
          rx: 0.8,
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

const svgAttributes = (
  attributes: Record<string, string | number | undefined>,
) =>
  Object.entries(attributes)
    .flatMap(([key, value]) =>
      value === undefined
        ? []
        : [
            `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${xml(value)}"`,
          ],
    )
    .join(" ");

// Header, dynamic favicon and static fallbacks share the same outline and grid.
export function calendarMarkSvg(mark: CalendarMark): string {
  const outline = `<path ${svgAttributes(calendarOutlineAttributes)} />`;
  const rectangles = mark.rectangles
    .map((rect) => `<rect ${svgAttributes(calendarRectAttributes(rect))} />`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="${CALENDAR_VIEWBOX}" data-logo-scramble="${xml(mark.scramble)}">${outline}${rectangles}</svg>`;
}
