# Optional visit analytics

GA4 is optional and loads only after an explicit choice. The app offers equal
Allow analytics and No thanks buttons in an inline panel, plus a permanent
Privacy & analytics control on every screen. There is no blocking modal on
arrival. The audience is a public, English-language timer with no existing
consent mechanism or regional targeting, so the same opt-in behavior applies to
all visitors. This avoids assuming where a visitor lives or that cookie-free
requests are exempt from consent.

Before consent, after refusal, and with Do Not Track or Global Privacy Control,
the app does not load the Google tag or send cookieless analytics pings. A local
preference key (`cubetimer365:analytics-consent`) remembers the choice. Withdrawal
disables delivery before reload and removes only `ct365_ga*` cookies at this
app's path. The existing solve storage keys and timer interactions are unchanged.

After consent, GA4 receives page views and its standard session/engagement data.
Application code emits only `page_view`: one initial view and one per distinct
timer/stats/history anchor, or the fixed cube finishes screen. Initial tag views
are disabled with `send_page_view: false`; repeat initialization and duplicate
navigation events are deduplicated. Arbitrary query/hash values, external
referrers and document titles are not used. No history, times, scramble text,
field contents, User-ID, user properties or custom interaction events are sent.
Google still receives the network IP and basic device/browser metadata; the
privacy text discloses this. App-scoped cookies expire after 30 days without a
rolling extension. Advertising consent is always denied, Signals and advertising
personalization are disabled in code, and the tag request omits the HTTP referrer.

## Activation

1. Use the existing `CubeTimer365` property (558919856) and its
   `CubeTimer365 web` stream (16129242856) for
   `https://progbeat.dev/cubetimer365/`. The measurement ID is `G-41X5F91WCZ`.
   Check for existing resources before creating replacements. These resources
   were created after the owner's approval of Google's displayed terms.
2. Optional account data sharing, Google Signals, user-provided data collection
   and granular location/device data collection are off. Ads personalization is
   disallowed in all 307 regions. User and event data retention are two months,
   with reset-on-new-activity off. Keep these settings; do not link advertising
   products or create API credentials. Retention controls do not expire standard
   aggregated reports.
3. **Keep Enhanced measurement off for the stream.** This disables automatic
   history, form, search, outbound click, download, scroll and video events.
   Standard initial page views are independently disabled in code using
   `send_page_view: false`. Both are needed to keep manual views unique and avoid
   collecting interaction text/URLs.
4. The public stream ID is checked into `.env.production` as
   `VITE_GA4_MEASUREMENT_ID`, so the existing Pages build needs no secret or
   repository variable. Local development and unit tests do not load that
   production file. Override the ID through the environment or
   `.env.production.local` for builds (`.env.local` for development)
   when using a different property. An empty/invalid ID disables the tag and
   initial consent panel. The Privacy control remains available and states
   that analytics is not configured.
5. Review this PR and obtain the required merge/deployment approval. Only a push
   to `master` triggers the existing production Pages workflow.
6. Visit production in a fresh browser, confirm there are no analytics requests
   or cookies before consent, then allow analytics. Confirm one initial
   `page_view` in GA4 Realtime and one for each distinct section visited. Inspect
   parameters for sanitized locations and no private values. Refuse/revoke and
   confirm requests stop. Do not call this complete until real events arrive.

For a temporary local validation build, copy `.env.example` to `.env.production.local`, set
the real ID and `VITE_GA4_DEBUG=true`, then build and preview. This flags test views
for GA4 DebugView. Remove the debug flag after checking. Do not use query strings
to activate debug mode. No Measurement Protocol secret or permanent access grant
is needed. Unit tests use a fixture ID and never contact Google.

Sources: [Google's consent mode guide](https://developers.google.com/tag-platform/security/concepts/consent-mode),
[manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views),
and [tag configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config).
