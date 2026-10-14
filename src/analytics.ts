const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim() || "";
export const analyticsConfigured = /^G-[A-Z0-9]+$/.test(measurementId);
export const ANALYTICS_CONSENT_KEY = "cubetimer365:analytics-consent";
export type AnalyticsConsent = "granted" | "denied" | null;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;
let previousPage = "";
const base = import.meta.env.BASE_URL;
const disable = () => {
  (window as unknown as Record<string, unknown>)[
    `ga-disable-${measurementId}`
  ] = true;
};

export const privacySignalEnabled = () =>
  navigator.doNotTrack === "1" ||
  (navigator as Navigator & { globalPrivacyControl?: boolean })
    .globalPrivacyControl === true;

export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function saveAnalyticsConsent(consent: Exclude<AnalyticsConsent, null>) {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  } catch {
    // Analytics fails closed when the preference cannot be stored.
  }
  if (consent === "denied") {
    disable();
    // Only this app's cookies, at this app's path, are removed.
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.trim().split("=")[0];
      if (name === "ct365_ga" || name.startsWith("ct365_ga_")) {
        const expired = `${name}=; Max-Age=0; Path=${base}; SameSite=Lax`;
        document.cookie = expired;
        document.cookie = `${expired}; Domain=${window.location.hostname}`;
      }
    }
  }
}

function pageFields() {
  // The app has anchor sections and a fixed cube review screen, not arbitrary routes.
  const review = new URLSearchParams(window.location.search).has(
    "cube-options",
  );
  const section = ["#timer", "#stats", "#history"].includes(
    window.location.hash,
  )
    ? window.location.hash
    : "#timer";
  return {
    page_location: `${window.location.origin}${base}${review ? "?cube-options" : section}`,
    page_title: review ? "CubeTimer365 · Cube finishes" : "CubeTimer365",
    page_referrer: previousPage,
  };
}

function trackPage() {
  if (readAnalyticsConsent() !== "granted" || privacySignalEnabled()) {
    disable();
    return;
  }
  const fields = pageFields();
  if (fields.page_location === previousPage) {
    return;
  }
  // Set defaults too, so automatically collected session/engagement events use safe URLs.
  window.gtag?.("set", fields);
  window.gtag?.("event", "page_view", { ...fields, send_to: measurementId });
  previousPage = fields.page_location;
}

export function startAnalytics() {
  if (
    !analyticsConfigured ||
    readAnalyticsConsent() !== "granted" ||
    privacySignalEnabled()
  ) {
    disable();
    return;
  }
  (window as unknown as Record<string, unknown>)[
    `ga-disable-${measurementId}`
  ] = false;
  if (initialized) {
    trackPage();
    return;
  }
  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // Preserve the official gtag command queue format.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("set", {
    ads_data_redaction: true,
    url_passthrough: false,
    ...pageFields(),
  });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_prefix: "ct365",
    cookie_domain: window.location.hostname,
    cookie_path: base,
    cookie_expires: 30 * 24 * 60 * 60,
    cookie_update: false,
    cookie_flags: "SameSite=Lax;Secure",
    ...(import.meta.env.VITE_GA4_DEBUG === "true" ? { debug_mode: true } : {}),
  });
  const script = document.createElement("script");
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  trackPage();
  window.addEventListener("hashchange", trackPage);
  window.addEventListener("popstate", trackPage);
  window.addEventListener("storage", (event) => {
    if (
      (event.key === ANALYTICS_CONSENT_KEY || event.key === null) &&
      readAnalyticsConsent() !== "granted"
    ) {
      disable();
    }
  });
}
