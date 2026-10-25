import { getTickValuesFixedDomain } from "recharts-scale";

export const CHART_TICK_COUNT = 5;
export const COMPACT_TICK_MARGIN = 4;

export function getCompactYAxisWidth(
  domain: [number, number],
  fontFamily = "sans-serif",
) {
  // Use the same fixed-domain ticks as Recharts, including fractional values.
  const labels = getTickValuesFixedDomain(domain, CHART_TICK_COUNT, true).map(
    (value) => `${value}s`,
  );
  let measure = (label: string) => label.length * 8;
  try {
    const context = document.createElement("canvas").getContext("2d");
    if (context && typeof context.measureText === "function") {
      context.font = `12px ${fontFamily}`;
      measure = (label) => context.measureText(label).width;
    }
  } catch {
    // A conservative text budget keeps labels readable without canvas support.
  }
  return Math.max(
    24,
    Math.ceil(Math.max(...labels.map(measure)) + COMPACT_TICK_MARGIN + 2),
  );
}
