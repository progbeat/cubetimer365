export default async (page) => {
  const root = `${new URL(page.url()).origin}/cubetimer365/`;
  const key = "cubetimer365:analytics-consent";
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  let requests = 0;
  // Stub Google locally: opt-in tests never deliver analytics to the real stream.
  const google =
    /^https:\/\/[^/]*(?:googletagmanager\.com|google-analytics\.com)\//;
  const stub = async (route) => {
    requests++;
    await route.fulfill({ contentType: "application/javascript", body: "" });
  };
  await page.route(google, stub);
  let navigations = 0;
  const navigated = (frame) => {
    if (frame === page.mainFrame()) navigations++;
  };
  page.on("framenavigated", navigated);
  const views = () =>
    page.evaluate(() =>
      (window.dataLayer || [])
        .map((args) => Array.from(args))
        .filter((args) => args[0] === "event" && args[1] === "page_view"),
    );
  try {
    for (const failure of ["none", "write", "write-and-remove"]) {
      await page.goto(root);
      await page.evaluate((key) => localStorage.removeItem(key), key);
      const beforeConsent = requests;
      await page.reload();
      await page.getByRole("button", { name: "Allow analytics" }).waitFor();
      assert(
        requests === beforeConsent && (await views()).length === 0,
        `${failure}: no Google requests or views before consent`,
      );
      await page.getByRole("button", { name: "Allow analytics" }).click();
      await page.waitForFunction(() => window.dataLayer?.length > 0);
      await page.evaluate(() => {
        window.dispatchEvent(new Event("popstate"));
        window.dispatchEvent(new Event("hashchange"));
      });
      assert(
        (await views()).length === 1 &&
          (await page
            .locator('script[src*="googletagmanager.com"]')
            .count()) === 1,
        `${failure}: one tag and initial view after explicit consent`,
      );
      await page.getByRole("button", { name: "Privacy & analytics" }).click();
      await page.getByText("Analytics: allowed.", { exact: true }).waitFor();
      for (let n = 0; n < 2; n++)
        await page.getByRole("button", { name: "Allow analytics" }).click();
      assert(
        (await page.evaluate(() => window["ga-disable-G-41X5F91WCZ"])) ===
          false &&
          (await views()).length === 1 &&
          (await page
            .locator('script[src*="googletagmanager.com"]')
            .count()) === 1,
        `${failure}: repeated Allow keeps delivery enabled with one tag and initial view`,
      );
      if (failure !== "none") {
        await page.evaluate(
          ({ key, failure }) => {
            const set = Storage.prototype.setItem;
            const remove = Storage.prototype.removeItem;
            window.restoreAnalyticsTestStorage = () => {
              Storage.prototype.setItem = set;
              Storage.prototype.removeItem = remove;
            };
            Storage.prototype.setItem = function (name, value) {
              if (name === key) throw new Error("test: denial write blocked");
              return set.call(this, name, value);
            };
            if (failure === "write-and-remove") {
              Storage.prototype.removeItem = function (name) {
                if (name === key)
                  throw new Error("test: grant removal blocked");
                return remove.call(this, name);
              };
            }
          },
          { key, failure },
        );
      }
      const beforeWithdrawal = navigations;
      if (failure === "none") {
        await Promise.all([
          page.waitForEvent(
            "framenavigated",
            (frame) => frame === page.mainFrame(),
          ),
          page.getByRole("button", { name: "No thanks" }).click(),
        ]);
        await page
          .getByRole("button", { name: "Privacy & analytics" })
          .waitFor();
        assert(
          navigations > beforeWithdrawal &&
            (await page
              .locator('script[src*="googletagmanager.com"]')
              .count()) === 0,
          "Stored denial reloads into a document without the Google tag",
        );
      } else {
        await page.getByRole("button", { name: "No thanks" }).click();
        await page.getByText("Analytics: off.", { exact: true }).waitFor();
        await page.getByRole("alert").waitFor();
        const stayedInDocument = navigations === beforeWithdrawal;
        await page.evaluate(() => {
          window.history.replaceState({}, "", "#history");
          window.dispatchEvent(new Event("hashchange"));
        });
        assert(
          stayedInDocument &&
            (await views()).length === 1 &&
            (await page.evaluate(() => window["ga-disable-G-41X5F91WCZ"])) ===
              true,
          `${failure}: failed persistence keeps delivery off without reloading a stale grant`,
        );
        assert(
          (await page.evaluate((key) => localStorage.getItem(key), key)) ===
            (failure === "write" ? null : "granted"),
          `${failure}: withdrawal removes the old grant when storage allows it`,
        );
        if (failure === "write") {
          const beforeReload = requests;
          await page.reload();
          await page.getByRole("button", { name: "Allow analytics" }).waitFor();
          assert(
            requests === beforeReload && (await views()).length === 0,
            "Failed denial write cannot restart analytics in a fresh document",
          );
        } else {
          const beforeRetry = requests;
          await page.evaluate(() => window.restoreAnalyticsTestStorage());
          await Promise.all([
            page.waitForEvent(
              "framenavigated",
              (frame) => frame === page.mainFrame(),
            ),
            page.getByRole("button", { name: "No thanks" }).click(),
          ]);
          await page
            .getByRole("button", { name: "Privacy & analytics" })
            .waitFor();
          assert(
            requests === beforeRetry &&
              (await views()).length === 0 &&
              (await page.evaluate((key) => localStorage.getItem(key), key)) ===
                "denied",
            "Retry after storage recovers persists denial and safely removes the tag by reload",
          );
        }
      }
    }
    return { passed: checks.length, checks };
  } finally {
    page.off("framenavigated", navigated);
    await page.unroute(google, stub);
  }
};
