import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let analytics: typeof import("./analytics");
const listeners: [string, EventListenerOrEventListenerObject][] = [];
const commands = () => (window.dataLayer || []).map((args) => Array.from(args));
const pageViews = () => commands().filter((args) => args[0] === "event");

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TEST365");
  vi.stubEnv("VITE_GA4_DEBUG", "false");
  vi.stubEnv("BASE_URL", "/cubetimer365/");
  localStorage.clear();
  window.history.replaceState({}, "", "/cubetimer365/");
  delete window.dataLayer;
  delete window.gtag;
  Object.defineProperty(navigator, "doNotTrack", {
    configurable: true,
    value: null,
  });
  Object.defineProperty(navigator, "globalPrivacyControl", {
    configurable: true,
    value: false,
  });
  const original = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation(
    (type, listener, options) => {
      listeners.push([type, listener]);
      original(type, listener, options);
    },
  );
  analytics = await import("./analytics");
});

afterEach(() => {
  for (const [type, listener] of listeners.splice(0)) {
    window.removeEventListener(type, listener);
  }
  document
    .querySelectorAll('script[src*="googletagmanager.com"]')
    .forEach((script) => script.remove());
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.trim().split("=")[0];
    document.cookie = `${name}=; Max-Age=0; Path=/cubetimer365/`;
  }
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("opt-in visit analytics", () => {
  it.each([null, "denied"] as const)(
    "does not load a tag or queue events with consent %s",
    (choice) => {
      if (choice) {
        analytics.saveAnalyticsConsent(choice);
      }
      analytics.startAnalytics();
      expect(commands()).toEqual([]);
      expect(
        document.querySelector('script[src*="googletagmanager.com"]'),
      ).toBeNull();
    },
  );

  it.each(["", "UA-12345", "G-<script>"])(
    "fails closed with invalid ID %s",
    async (id) => {
      vi.stubEnv("VITE_GA4_MEASUREMENT_ID", id);
      vi.resetModules();
      analytics = await import("./analytics");
      analytics.saveAnalyticsConsent("granted");
      analytics.startAnalytics();
      expect(analytics.analyticsConfigured).toBe(false);
      expect(commands()).toEqual([]);
    },
  );

  it.each(["doNotTrack", "globalPrivacyControl"])(
    "honors %s even with saved consent",
    (signal) => {
      Object.defineProperty(navigator, signal, {
        configurable: true,
        value: signal === "doNotTrack" ? "1" : true,
      });
      analytics.saveAnalyticsConsent("granted");
      analytics.startAnalytics();
      expect(commands()).toEqual([]);
    },
  );

  it("does not count initialization or a timer anchor twice", () => {
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics();
    analytics.startAnalytics();
    window.history.replaceState({}, "", "/cubetimer365/#timer");
    window.dispatchEvent(new Event("hashchange"));
    expect(pageViews()).toHaveLength(1);
    expect(
      document.querySelectorAll('script[src*="googletagmanager.com"]'),
    ).toHaveLength(1);
    expect(commands().find((args) => args[0] === "config")?.[2]).toMatchObject({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_path: "/cubetimer365/",
      cookie_expires: 2592000,
      cookie_update: false,
    });
    expect(commands()[0]).toEqual([
      "consent",
      "default",
      {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    ]);
  });

  it("counts allowed sections and browser back once, with sanitized internal referrers", () => {
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics();
    for (const section of ["#stats", "#history", "#stats"]) {
      window.history.replaceState({}, "", `/cubetimer365/${section}`);
      window.dispatchEvent(new Event("hashchange"));
      window.dispatchEvent(new Event("popstate"));
    }
    expect(pageViews()).toHaveLength(4);
    expect(pageViews()[3][2]).toMatchObject({
      page_location: `${window.location.origin}/cubetimer365/#stats`,
      page_referrer: `${window.location.origin}/cubetimer365/#history`,
    });
  });

  it("never queues arbitrary URLs, document titles or local solve data", () => {
    localStorage.setItem("history", "[12.345,98.765]");
    document.title = "private-document-title";
    window.history.replaceState(
      {},
      "",
      "/cubetimer365/?email=private@example.com&utm_campaign=secret-campaign#secret-hash",
    );
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics();
    const queued = JSON.stringify(commands());
    for (const secret of [
      "private@example.com",
      "secret-campaign",
      "secret-hash",
      "private-document-title",
      "12.345",
      "98.765",
    ]) {
      expect(queued).not.toContain(secret);
    }
    expect(pageViews()[0][2]).toMatchObject({
      page_title: "CubeTimer365",
      page_referrer: "",
    });
    expect(pageViews().every((args) => args[1] === "page_view")).toBe(true);
  });

  it("records only the fixed cube review route and uses debug mode only from a build flag", () => {
    window.history.replaceState(
      {},
      "",
      "/cubetimer365/?cube-options&private=secret&debug_mode=true#secret",
    );
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics();
    expect(pageViews()[0][2]).toMatchObject({
      page_location: `${window.location.origin}/cubetimer365/?cube-options`,
      page_title: "CubeTimer365 · Cube finishes",
    });
    expect(
      commands().find((args) => args[0] === "config")?.[2],
    ).not.toHaveProperty("debug_mode");
  });

  it("disables delivery and removes only this app's cookies on withdrawal", () => {
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics();
    document.cookie = "ct365_ga=example; Path=/cubetimer365/";
    document.cookie = "ct365_ga_TEST365=example; Path=/cubetimer365/";
    document.cookie = "other_app=value; Path=/cubetimer365/";
    analytics.saveAnalyticsConsent("denied");
    window.history.replaceState({}, "", "/cubetimer365/#history");
    window.dispatchEvent(new Event("hashchange"));
    expect(pageViews()).toHaveLength(1);
    expect(
      (window as unknown as Record<string, unknown>)["ga-disable-G-TEST365"],
    ).toBe(true);
    expect(document.cookie).not.toContain("ct365_ga");
    expect(document.cookie).toContain("other_app=value");
    expect(localStorage.getItem(analytics.ANALYTICS_CONSENT_KEY)).toBe(
      "denied",
    );
  });

  it("fails closed when local preference storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => analytics.saveAnalyticsConsent("granted")).not.toThrow();
    analytics.startAnalytics();
    expect(commands()).toEqual([]);
  });

  it.each([false, true])(
    "keeps withdrawal closed when denial writes fail (removal blocked: %s)",
    async (removalBlocked) => {
      analytics.saveAnalyticsConsent("granted");
      analytics.startAnalytics();
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("write blocked");
      });
      if (removalBlocked) {
        vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
          throw new Error("removal blocked");
        });
      }
      const persisted = analytics.saveAnalyticsConsent("denied");
      expect(analytics.readAnalyticsConsent()).toBe("denied");
      expect(persisted).toBe(false);
      analytics.startAnalytics();
      window.history.replaceState({}, "", "/cubetimer365/#history");
      window.dispatchEvent(new Event("hashchange"));
      expect(pageViews()).toHaveLength(1);
      expect(
        (window as unknown as Record<string, unknown>)["ga-disable-G-TEST365"],
      ).toBe(true);
      expect(localStorage.getItem(analytics.ANALYTICS_CONSENT_KEY)).toBe(
        removalBlocked ? "granted" : null,
      );
      if (!removalBlocked) {
        vi.resetModules();
        const freshDocument = await import("./analytics");
        freshDocument.startAnalytics();
        expect(pageViews()).toHaveLength(1);
      }
      vi.restoreAllMocks();
      expect(analytics.saveAnalyticsConsent("granted")).toBe(true);
      expect(analytics.readAnalyticsConsent()).toBe("granted");
    },
  );

  it("stops on cross-tab withdrawal or storage clearing and resumes without duplicating the tag", () => {
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics();
    localStorage.setItem(analytics.ANALYTICS_CONSENT_KEY, "denied");
    window.dispatchEvent(
      new StorageEvent("storage", { key: analytics.ANALYTICS_CONSENT_KEY }),
    );
    expect(
      (window as unknown as Record<string, unknown>)["ga-disable-G-TEST365"],
    ).toBe(true);
    window.history.replaceState({}, "", "/cubetimer365/#stats");
    window.dispatchEvent(new Event("hashchange"));
    expect(pageViews()).toHaveLength(1);
    analytics.saveAnalyticsConsent("granted");
    analytics.startAnalytics();
    expect(pageViews()).toHaveLength(2);
    expect(
      document.querySelectorAll('script[src*="googletagmanager.com"]'),
    ).toHaveLength(1);
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(
      (window as unknown as Record<string, unknown>)["ga-disable-G-TEST365"],
    ).toBe(true);
  });
});
