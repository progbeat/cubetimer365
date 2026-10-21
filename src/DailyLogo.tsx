import { memo } from "react";
import {
  CALENDAR_VIEWBOX,
  CALENDAR_TRANSFORM,
  calendarOutlineAttributes,
  calendarRectAttributes,
  type CalendarMark,
} from "./calendarMark";
const DailyLogo = ({ mark }: { mark: CalendarMark }) => (
  <svg
    className="daily-logo"
    width={32}
    height={32}
    viewBox={CALENDAR_VIEWBOX}
    aria-hidden="true"
    focusable="false"
    data-logo-face="B"
    data-logo-scramble={mark.scramble}
  >
    <g transform={CALENDAR_TRANSFORM}>
      <path {...calendarOutlineAttributes} />
      {mark.rectangles.map((rect, index) => (
        <rect key={index} {...calendarRectAttributes(rect)} />
      ))}
    </g>
  </svg>
);
export default memo(DailyLogo);
