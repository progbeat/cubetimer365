export default async (page, options = {}) => {
  const root = options.root || `${new URL(page.url()).origin}/cubetimer365/`;
  if (!["127.0.0.1", "localhost"].includes(new URL(root).hostname))
    throw new Error("Use an isolated localhost browser");
  const configured = options.configured === true;
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const google =
    /^https:\/\/[^/]*(?:googletagmanager\.com|google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick\.net)\//;
  const cloudflare = /^https:\/\/(?:static\.)?cloudflareinsights\.com\//;
  let googleRequests = 0;
  let beaconRequests = 0;
  const rejectGoogle = async (route) => {
    googleRequests++;
    await route.abort();
  };
  const stubCloudflare = async (route) => {
    beaconRequests++;
    await route.fulfill({ contentType: "application/javascript", body: "" });
  };
  await page.route(google, rejectGoogle);
  await page.route(cloudflare, stubCloudflare);
  const scripts = () =>
    page.locator('script[src*="cloudflareinsights.com/beacon.min.js"]').count();
  await page.addInitScript(() => {
    const params = new URLSearchParams(location.search);
    const choice = params.get("fixture-consent");
    const signal = params.get("fixture-signal");
    localStorage.setItem("today", new Date().toISOString().split("T")[0]);
    localStorage.setItem("history", "[12.34,23.45]");
    localStorage.setItem(
      "cubetimer365:daily-history:v1",
      JSON.stringify({
        version: 1,
        date: new Date().toISOString().split("T")[0],
        history: [12.34, 23.45],
        legacyMigration: "ignored",
      }),
    );
    localStorage.setItem("unrelated-preference", "keep");
    if (choice === "granted" || choice === "denied")
      localStorage.setItem("cubetimer365:analytics-consent", choice);
    else localStorage.removeItem("cubetimer365:analytics-consent");
    document.cookie = "ct365_ga=old; Path=/cubetimer365/";
    document.cookie = "ct365_ga_STREAM=old; Path=/cubetimer365/";
    document.cookie = "other_cookie=keep; Path=/cubetimer365/";
    Object.defineProperty(navigator, "doNotTrack", {
      configurable: true,
      get: () => (signal === "dnt" ? "1" : "0"),
    });
    Object.defineProperty(navigator, "globalPrivacyControl", {
      configurable: true,
      get: () => signal === "gpc",
    });
  });
  try {
    for (const choice of [null, "granted", "denied"]) {
      const before = beaconRequests;
      await page.goto(`${root}?fixture-consent=${choice || "unset"}`);
      await page.locator(".timer-panel").waitFor();
      if (configured)
        await page.waitForFunction(
          () => !!document.querySelector("script[data-cf-beacon]"),
        );
      assert(
        (await scripts()) === (configured ? 1 : 0),
        `${choice}: correct beacon count for this build`,
      );
      assert(
        (await page
          .getByRole("button", { name: "Allow analytics" })
          .count()) === 0 &&
          (await page.getByRole("button", { name: "No thanks" }).count()) ===
            0 &&
          (await page
            .getByRole("button", { name: "Privacy & analytics" })
            .count()) === 0 &&
          (await page
            .getByRole("dialog", { name: "Privacy notice" })
            .count()) === 0,
        `${choice}: no standalone privacy notice or consent controls`,
      );
      await page.getByRole("button", { name: "Choose cube finish" }).click();
      await page.getByRole("button", { name: "Neon · Round" }).click();
      await page.evaluate(() => {
        location.hash = "stats";
        window.dispatchEvent(new Event("popstate"));
        window.dispatchEvent(new Event("hashchange"));
      });
      assert(
        (await scripts()) === (configured ? 1 : 0) &&
          beaconRequests - before === (configured ? 1 : 0),
        `${choice}: navigation and cube choices never duplicate the beacon`,
      );
      const state = await page.evaluate(() => ({
        cookies: document.cookie,
        history: localStorage.getItem("history"),
        owned: JSON.parse(
          localStorage.getItem("cubetimer365:daily-history:v1"),
        ),
        preference: localStorage.getItem("unrelated-preference"),
        legacy: localStorage.getItem("cubetimer365:analytics-consent"),
        gtag: typeof window.gtag,
        dataLayer: typeof window.dataLayer,
      }));
      assert(
        !state.cookies.includes("ct365_ga") &&
          state.cookies.includes("other_cookie=keep"),
        `${choice}: only legacy app GA cookies are expired`,
      );
      assert(
        state.history === "[12.34,23.45]" &&
          JSON.stringify(state.owned?.history) === "[12.34,23.45]" &&
          state.owned?.legacyMigration === "ignored" &&
          state.preference === "keep" &&
          state.legacy === choice,
        `${choice}: daily solves and existing preferences are preserved`,
      );
      assert(
        googleRequests === 0 &&
          state.gtag === "undefined" &&
          state.dataLayer === "undefined",
        `${choice}: no Google requests or event queue`,
      );
    }
    for (const signal of ["dnt", "gpc"]) {
      const before = beaconRequests;
      await page.goto(`${root}?fixture-signal=${signal}`);
      await page.locator(".timer-panel").waitFor();
      assert(
        (await scripts()) === 0 && beaconRequests === before,
        `${signal}: no beacon is loaded with a privacy signal`,
      );
    }
    assert(googleRequests === 0, "All scenarios avoid Google network requests");
    return { passed: checks.length, checks };
  } finally {
    await page.unroute(google, rejectGoogle);
    await page.unroute(cloudflare, stubCloudflare);
  }
};
