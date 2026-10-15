# Cloudflare Web Analytics migration

## Status and activation

GA4 loading, configuration, manual page-view events and consent controls have
been removed. `.env.production` now contains the public Web Analytics site token
`0fbe5c9c32da4ea887621042d35546b1`, supplied by the owner after verifying the
`progbeat.dev` property on 2026-10-15. The owner confirmed manual JS snippet
installation with automatic injection disabled; DNS-only GitHub Pages hosting
is unchanged. The token is a public site identifier, not an API credential.

Production builds use the existing guarded loader within the `/cubetimer365/`
app. An empty, invalid or missing token means no beacon request. Local Vite
development also leaves analytics off. DNT/GPC, loading failures or blockers can
prevent collection. This configuration update does not merge or deploy the PR,
change Cloudflare or DNS settings, or confirm real production collection.

For future configuration changes and publication:

1. Open Cloudflare **Web Analytics**, select the existing site for hostname
   `progbeat.dev` (or add that hostname if needed), and open **Manage site**.
   The hostname is `progbeat.dev`, not the `/cubetimer365/` path. A site may include
   other pages on the same hostname; filter the dashboard by this app's path.
2. Confirm manual JS snippet installation. Use one installation mechanism:
   this app's loader, not an additional snippet or proxy auto-injection. Do not
   add an automatic embed alongside this loader; it would also bypass the app's
   privacy-signal check. Changing dashboard settings remains an owner action.
3. Copy the public `token` value from that site's `data-cf-beacon` snippet. This is
   a public site identifier, **not** a Cloudflare API token or account credential.
   Verify the property/hostname before using it. Token syntax alone is not proof
   of ownership or a working property.
4. Keep `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` in `.env.production` set to the
   verified value and rebuild after any change. The current GitHub Pages workflow
   builds this file; it does not implicitly pick up a GitHub repository variable.
   No workflow, permission or release-pipeline changes are needed for this
   configuration.
5. Before deployment, assess the applicable privacy/consent requirements for the
   intended audience and collection. Cookie-free operation by itself is not a
   blanket consent exemption. This PR does not make a jurisdiction-specific legal
   conclusion. Keep the token empty if the intended policy is not settled.
6. After an authorized deployment, verify one beacon script, successful RUM
   POSTs, no Google requests, and the matching Cloudflare dashboard property.
   Visiting with DNT or GPC must not load the beacon. Collection is not verified
   merely by a green test suite or the presence of a token.

## Browser data flow

A production build with a valid token and no Do Not Track / Global Privacy Control
signal appends one module script from
`https://static.cloudflareinsights.com/beacon.min.js`. The official beacon manages
page and performance measurements; this app adds no custom events or manual
page-view calls. Repeated React effects, remounts and an existing Cloudflare embed
are guarded against a second script. Owner configuration must also avoid edge
injection that happens independently of this code.

The manually installed beacon reports to
`https://cloudflareinsights.com/cdn-cgi/rum`. It measures page/referrer information,
loading performance and Core Web Vitals. Network requests necessarily reach
Cloudflare with the visitor's IP address and browser/network metadata.
Cloudflare states that Web Analytics uses no cookies, localStorage identifiers
or visitor fingerprinting. Its documentation says query strings are not logged.
Do not put personal data in URL paths or assume that cookie-free means no network
data is processed.

Cloudflare handles supported SPA navigation automatically. The app's anchor
sections are not manually converted into separate page-view events. Counts and
navigation details can differ from the former GA4 timer/stats/history events;
this migration does not promise identical dashboards. The application sends no
solve history, individual times, scrambles or cube-choice analytics events.

## Existing device data

The project-scoped `cubetimer365:daily-history:v1` record, legacy `history` / `today`
values, cube selection and unrelated preferences retain their existing semantics.
[Solve storage](STORAGE.md) defines the app's separate import and persistence
behavior. The analytics loader does not read, write or clear localStorage. The
obsolete
`cubetimer365:analytics-consent` value is left untouched; it is a former GA4 choice,
not a grant for another provider or a new Cloudflare control.

On startup, the app expires only accessible legacy cookies named `ct365_ga` or
starting with `ct365_ga_`, at this app's `/cubetimer365/` path, in both the host-only
and current-host domain forms used by the former GA4 configuration. It does not
clear other applications' cookies. Browser cookie restrictions may prevent
cleanup; they must not break the timer. Previously collected Google data and the
GA4 property are not deleted by removing the tag.

The GA4 consent controls and standalone Privacy Notice UI are omitted from this
candidate. This is a product decision, not a claim that a privacy notice or
consent is universally unnecessary. The owner must assess applicable requirements
before publication. No new analytics identifier or consent preference is stored.

## Verification

`yarn test` checks the disabled/invalid/development cases, DNT/GPC, singleton
loading, legacy-cookie cleanup, unrelated state preservation and initialization.
`yarn browser-check` exercises the shipped build with Google and Cloudflare
requests intercepted before collection. It covers former granted/denied choices,
no Google queue/requests, cookie cleanup, local data, omitted privacy/consent UI and signals.

`yarn browser-analytics-fixture` builds a separate ignored output with an explicitly
synthetic test token, serves it only on localhost, and repeats the browser cases
with the beacon configured, including every separate timezone browser context,
through the same runner used by `yarn browser-check`.
The runner derives its expected configuration from Vite production env inputs
(including process overrides), so activation does not leave disabled-build
assertions enabled. Rebuild after changing those inputs. Vendor responses are stubbed; the fixture sends no
metrics to a real property. CI runs both builds. These tests verify integration
behavior; they do not prove the externally hosted SDK's full behavior, dashboard
settings or real production delivery. Production activation needs step 6 above.

The configured production build was exercised in local Chromium on 2026-10-15
using a downloaded public beacon snapshot, with its script response fulfilled
locally and every RUM POST intercepted. The probe observed one module script,
the verified public token in the payload, no Google requests or new cookies,
unchanged local solve data, and query parameters omitted from reports. The SDK
emitted an initial navigation report and routing/performance reports during
interactions. DNT and GPC each prevented script loading and RUM requests.
Desktop, 390 px and 320 px views were inspected without privacy/consent UI.
No real metrics were delivered. This verifies that SDK snapshot, not future
vendor updates or real property ingestion.

Sources checked 2026-10-15:

- [Cloudflare setup](https://developers.cloudflare.com/web-analytics/get-started/)
- [Privacy-first analytics](https://www.cloudflare.com/web-analytics/)
- [Data origin and collection](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/)
- [SPA behavior](https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/)
- [Beacon configuration and FAQ](https://developers.cloudflare.com/web-analytics/faq/)
