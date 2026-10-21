import { memo } from "react";
import {
  CALENDAR_VIEWBOX,
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
    {mark.rectangles.map((rect, index) => (
      <rect key={index} {...calendarRectAttributes(rect)} />
    ))}
  </svg>
);
export default memo(DailyLogo);
