import { interceptAnalytics } from "./browser-network-guards.js";

export default async (page, { configured = false } = {}) => {
  const origin = new URL(page.url());
  if (!["127.0.0.1", "localhost"].includes(origin.hostname)) {
    throw new Error("Use an isolated localhost browser");
  }
  const browser = page.context().browser();
  if (!browser) throw new Error("A browser connection is required");
  const root = `${origin.origin}/cubetimer365/`;
  const checks = [];
  const assert = (pass, name) => {
    if (!pass) throw new Error(name);
    checks.push(name);
  };
  const fixtures = [
    {
      timezoneId: "America/Los_Angeles",
      instant: "2026-01-01T00:30:00Z",
      localDate: "2025-12-31",
      label: "31 Dec 2025",
    },
    {
      timezoneId: "Pacific/Kiritimati",
      instant: "2026-01-01T12:30:00Z",
      localDate: "2026-01-02",
      label: "02 Jan 2026",
    },
    {
      timezoneId: "Etc/UTC",
      instant: "2026-01-02T12:00:00Z",
      localDate: "2026-01-02",
      label: "02 Jan 2026",
    },
  ];
  for (const fixture of fixtures) {
    const context = await browser.newContext({
      timezoneId: fixture.timezoneId,
    });
    try {
      const guard = await interceptAnalytics(context);
      const zonedPage = await context.newPage();
      await zonedPage.clock.setFixedTime(fixture.instant);
      const utcDate = fixture.instant.split("T")[0];
      await zonedPage.addInitScript((utcDate) => {
        localStorage.setItem("today", utcDate);
        localStorage.setItem("history", "[12.34,15.67]");
      }, utcDate);
      await zonedPage.goto(root);
      const headerDate = zonedPage.locator(".app-header time");
      await headerDate.waitFor();
      if (configured) await zonedPage.waitForLoadState("networkidle");
      assert(
        !configured ||
          guard.intercepted.some((url) =>
            url.startsWith(
              "https://static.cloudflareinsights.com/beacon.min.js",
            ),
          ),
        `Analytics requests are intercepted in the separate ${fixture.timezoneId} context`,
      );
      assert(
        (await headerDate.textContent()) === fixture.label,
        `Visible date uses the local calendar in ${fixture.timezoneId}`,
      );
      assert(
        (await headerDate.getAttribute("datetime")) === fixture.localDate,
        `Machine-readable date matches the local label in ${fixture.timezoneId}`,
      );
      assert(
        (await zonedPage.evaluate(() => localStorage.getItem("today"))) ===
          utcDate,
        `Existing UTC history boundary is retained in ${fixture.timezoneId}`,
      );
      assert(
        (await zonedPage.evaluate(() => localStorage.getItem("history"))) ===
          "[12.34,15.67]",
        `Existing numeric solves are preserved in ${fixture.timezoneId}`,
      );
    } finally {
      await context.close();
    }
  }
  return { passed: checks.length };
};
