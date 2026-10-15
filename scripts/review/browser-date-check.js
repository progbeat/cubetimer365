export default async (page) => {
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
      const zonedPage = await context.newPage();
      await zonedPage.clock.setFixedTime(fixture.instant);
      const utcDate = fixture.instant.split("T")[0];
      await zonedPage.addInitScript((utcDate) => {
        localStorage.setItem(
          "cubetimer365:daily-history:v1",
          JSON.stringify({
            version: 1,
            date: utcDate,
            history: JSON.parse("[12.34,15.67]"),
            legacyMigration: "ignored",
          }),
        );
      }, utcDate);
      await zonedPage.goto(root);
      const headerDate = zonedPage.locator(".app-header time");
      await headerDate.waitFor();
      assert(
        (await headerDate.textContent()) === fixture.label,
        `Visible date uses the local calendar in ${fixture.timezoneId}`,
      );
      assert(
        (await headerDate.getAttribute("datetime")) === fixture.localDate,
        `Machine-readable date matches the local label in ${fixture.timezoneId}`,
      );
      assert(
        (await zonedPage.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem("cubetimer365:daily-history:v1") || "null",
            )?.date,
        )) === utcDate,
        `Existing UTC history boundary is retained in ${fixture.timezoneId}`,
      );
      assert(
        (await zonedPage.evaluate(() =>
          JSON.stringify(
            JSON.parse(
              localStorage.getItem("cubetimer365:daily-history:v1") || "null",
            )?.history || [],
          ),
        )) === "[12.34,15.67]",
        `Existing numeric solves are preserved in ${fixture.timezoneId}`,
      );
    } finally {
      await context.close();
    }
  }
  return { passed: checks.length };
};
