import { useEffect, useRef } from "react";
import { calendarMarkSvg, type CalendarMark } from "./calendarMark";

export function useDailyFavicon(mark: CalendarMark) {
  const link = useRef<HTMLLinkElement | null>(null);
  useEffect(() => {
    const existing =
      document.head.querySelector<HTMLLinkElement>("link#daily-favicon");
    const icon = existing || document.createElement("link");
    const previousHref = existing?.getAttribute("href");
    if (!existing) {
      icon.id = "daily-favicon";
      icon.rel = "icon";
      icon.type = "image/svg+xml";
      icon.setAttribute("sizes", "any");
      document.head.append(icon);
    }
    link.current = icon;
    return () => {
      if (existing) {
        if (previousHref == null) {
          icon.removeAttribute("href");
        } else {
          icon.setAttribute("href", previousHref);
        }
      } else {
        icon.remove();
      }
      link.current = null;
    };
  }, []);
  useEffect(() => {
    // Data URLs need no allocation/revocation and do not accumulate link nodes.
    link.current?.setAttribute(
      "href",
      `data:image/svg+xml,${encodeURIComponent(calendarMarkSvg(mark))}`,
    );
  }, [mark]);
}
