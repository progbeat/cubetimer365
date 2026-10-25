import { useMantineTheme } from "@mantine/core";
import type { GridLineTypeFunctionProps } from "recharts/types/cartesian/CartesianGrid";

let measureContext: CanvasRenderingContext2D | null = null;

/** Keep each native grid line clear of its left-aligned time label. */
export default function TimeAxisGuide({
  yAxis,
  index,
  x1,
  x2,
  y1,
  y2,
  className,
  style,
  stroke,
  strokeWidth,
  strokeOpacity,
  strokeDasharray,
}: GridLineTypeFunctionProps) {
  const { fontFamily } = useMantineTheme();
  const value = yAxis ? Number(yAxis.scale.invert(y1).toPrecision(12)) : null;
  const label =
    value === null
      ? ""
      : String(yAxis?.tickFormatter?.(value, index) ?? value) +
        String(yAxis?.unit ?? "");
  measureContext ||= document.createElement("canvas").getContext("2d");
  if (measureContext) {
    measureContext.font = `12px ${fontFamily}`;
  }
  const labelWidth = measureContext
    ? measureContext.measureText(label).width
    : label.length * 8;

  return (
    <line
      className={className}
      style={style}
      data-guide-label={label}
      x1={Math.min(x2, label ? labelWidth + 6 : x1)}
      x2={x2}
      y1={y1}
      y2={y2}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      strokeDasharray={strokeDasharray}
      fill="none"
    />
  );
}
