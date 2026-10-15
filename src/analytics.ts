const token = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim() || "";
export const analyticsConfigured = /^[a-f0-9]{32}$/i.test(token);
const beaconUrl = "https://static.cloudflareinsights.com/beacon.min.js";

export const privacySignalEnabled = () =>
  navigator.doNotTrack === "1" ||
  (navigator as Navigator & { globalPrivacyControl?: boolean })
    .globalPrivacyControl === true;

function clearLegacyAnalyticsCookies() {
  try {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.trim().split("=")[0];
      if (name === "ct365_ga" || name.startsWith("ct365_ga_")) {
        const expired = `${name}=; Max-Age=0; Path=${import.meta.env.BASE_URL}; SameSite=Lax`;
        document.cookie = expired;
        document.cookie = `${expired}; Domain=${window.location.hostname}`;
      }
    }
  } catch {
    // Cookie restrictions must not interfere with the timer or local solve data.
  }
}

export function startAnalytics() {
  clearLegacyAnalyticsCookies();
  if (!import.meta.env.PROD || !analyticsConfigured || privacySignalEnabled()) {
    return;
  }
  // StrictMode, remounts, and a pre-existing manual embed share one beacon.
  if (
    Array.from(document.scripts).some((script) => {
      return script.src.split(/[?#]/, 1)[0] === beaconUrl;
    })
  ) {
    return;
  }
  const script = document.createElement("script");
  script.type = "module";
  script.src = beaconUrl;
  script.dataset.cfBeacon = JSON.stringify({ token });
  script.referrerPolicy = "strict-origin-when-cross-origin";
  document.head.appendChild(script);
}
