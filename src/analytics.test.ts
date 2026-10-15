import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = "0123456789abcdef0123456789abcdef";
const beacon = () =>
  document.querySelectorAll(
    'script[src*="cloudflareinsights.com/beacon.min.js"]',
  );
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN", fixture);
  vi.stubEnv("PROD", true);
  vi.stubEnv("BASE_URL", "/cubetimer365/");
  Object.defineProperty(navigator, "doNotTrack", {
    configurable: true,
    get: () => "0",
  });
  Object.defineProperty(navigator, "globalPrivacyControl", {
    configurable: true,
    value: false,
  });
  window.history.replaceState({}, "", "/cubetimer365/");
  localStorage.clear();
});
afterEach(() => {
  beacon().forEach((script) => script.remove());
  for (const name of ["ct365_ga", "ct365_ga_STREAM", "other_cookie"]) {
    document.cookie = `${name}=; Max-Age=0; Path=/cubetimer365/`;
  }
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
});
describe("Cloudflare visit analytics", () => {
  it.each(["", "G-TEST365", "not-a-token", "1234", "g".repeat(32)])(
    "stays disabled for invalid token %s",
    async (token) => {
      vi.stubEnv("VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN", token);
      const analytics = await import("./analytics");
      analytics.startAnalytics();
      expect(analytics.analyticsConfigured).toBe(false);
      expect(beacon()).toHaveLength(0);
    },
  );
  it("does not load analytics during development", async () => {
    vi.stubEnv("PROD", false);
    (await import("./analytics")).startAnalytics();
    expect(beacon()).toHaveLength(0);
  });
  it.each(["dnt", "gpc"])(
    "honors %s without loading a beacon",
    async (signal) => {
      if (signal === "dnt") {
        vi.spyOn(navigator, "doNotTrack", "get").mockReturnValue("1");
      } else {
        Object.defineProperty(navigator, "globalPrivacyControl", {
          configurable: true,
          value: true,
        });
      }
      const analytics = await import("./analytics");
      expect(analytics.privacySignalEnabled()).toBe(true);
      analytics.startAnalytics();
      expect(beacon()).toHaveLength(0);
    },
  );
  it("uses one official module beacon across repeated calls and module reloads", async () => {
    const analytics = await import("./analytics");
    analytics.startAnalytics();
    analytics.startAnalytics();
    vi.resetModules();
    (await import("./analytics")).startAnalytics();
    expect(beacon()).toHaveLength(1);
    const script = beacon()[0] as HTMLScriptElement;
    expect(script.type).toBe("module");
    expect(JSON.parse(script.dataset.cfBeacon!)).toEqual({ token: fixture });
    expect(script.referrerPolicy).toBe("strict-origin-when-cross-origin");
    expect(
      document.querySelector('script[src*="googletagmanager.com"]'),
    ).toBeNull();
    expect("gtag" in window).toBe(false);
    expect("dataLayer" in window).toBe(false);
  });
  it("does not duplicate an existing Cloudflare embed with a query string", async () => {
    const script = document.createElement("script");
    script.src = `https://static.cloudflareinsights.com/beacon.min.js?token=${fixture}`;
    document.head.appendChild(script);
    (await import("./analytics")).startAnalytics();
    expect(beacon()).toHaveLength(1);
  });
  it("expires only legacy app analytics cookies while preserving history and preferences", async () => {
    localStorage.setItem("history", "[12.34]");
    localStorage.setItem("today", "2026-10-15");
    localStorage.setItem("cube-style", "neon");
    localStorage.setItem("cubetimer365:analytics-consent", "denied");
    const saved = { ...localStorage };
    document.cookie = "ct365_ga=old; Path=/cubetimer365/";
    document.cookie = "ct365_ga_STREAM=old; Path=/cubetimer365/";
    document.cookie = "other_cookie=keep; Path=/cubetimer365/";
    (await import("./analytics")).startAnalytics();
    expect(document.cookie).toBe("other_cookie=keep");
    expect({ ...localStorage }).toEqual(saved);
  });
  it("does not depend on access to localStorage or cookies", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked storage");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked storage");
    });
    const cookie = vi
      .spyOn(document, "cookie", "get")
      .mockImplementation(() => {
        throw new Error("blocked cookies");
      });
    const analytics = await import("./analytics");
    expect(() => analytics.startAnalytics()).not.toThrow();
    expect(beacon()).toHaveLength(1);
    cookie.mockRestore();
  });
});
