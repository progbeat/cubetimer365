# Cloudflare Web Analytics migration

## Status and activation

GA4 loading, configuration, manual page-view events and consent controls have
been removed. The production token is intentionally empty. This version sends
no visit analytics until a legitimate Cloudflare site token is verified and
configured. An empty, invalid or missing token means no beacon request. Local
Vite development also leaves analytics off. The privacy notice states the actual
build configuration; loading failures or blockers can still prevent collection.

On 2026-10-15 the live page and bundle contained GA4, with no Cloudflare beacon.
Neither the repository nor the public root-domain page provided a verified site
token. This cloud environment has no authenticated Cloudflare dashboard tool.
Reading repository Actions variables returned `403 Resource not accessible by
integration`; no permission changes were attempted. No account/site creation,
DNS changes, deployment or real Cloudflare collection has been performed.

To activate after owner review:

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
4. Set `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` in `.env.production` to that verified
   value and rebuild. The current GitHub Pages workflow builds this file; it does
   not implicitly pick up a GitHub repository variable. No workflow, permission
   or release-pipeline changes are needed for this configuration.
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

`history`, `today`, cube selection and unrelated preferences retain their existing
semantics. The loader does not read, write or clear localStorage. The obsolete
`cubetimer365:analytics-consent` value is left untouched; it is a former GA4 choice,
not a grant for another provider or a new Cloudflare control.

On startup, the app expires only accessible legacy cookies named `ct365_ga` or
starting with `ct365_ga_`, at this app's `/cubetimer365/` path, in both the host-only
and current-host domain forms used by the former GA4 configuration. It does not
clear other applications' cookies. Browser cookie restrictions may prevent
cleanup; they must not break the timer. Previously collected Google data and the
GA4 property are not deleted by removing the tag.

The old Allow / No thanks controls are gone. A compact Privacy & analytics link
still explains local storage, actual configuration, Cloudflare's data flow and
privacy signals. No new analytics identifier or consent preference is stored.

## Verification

`yarn test` checks the disabled/invalid/development cases, DNT/GPC, singleton
loading, legacy-cookie cleanup, unrelated state preservation and the notice.
`yarn browser-check` exercises the shipped build with Google and Cloudflare
requests intercepted before collection. It covers former granted/denied choices,
no Google queue/requests, cookie cleanup, local data, notice state and signals.

`yarn browser-analytics-fixture` builds a separate ignored output with an explicitly
synthetic test token, serves it only on localhost, and repeats the browser cases
with the beacon configured, through the same runner used by `yarn browser-check`.
The runner derives its expected configuration from Vite production env inputs
(including process overrides), so activation does not leave disabled-build
assertions enabled. Rebuild after changing those inputs. Vendor responses are stubbed; the fixture sends no
metrics to a real property. CI runs both builds. These tests verify integration
behavior; they do not prove the externally hosted SDK's full behavior, dashboard
settings or real production delivery. Production activation needs step 6 above.

The public beacon downloaded on 2026-10-15 was also exercised locally with its
script response fulfilled from a local copy and every RUM POST intercepted. That
probe observed one script, no Google requests or new cookies, unchanged local
solve data, and query parameters omitted from the captured payload. It verifies
that SDK snapshot, not future vendor updates or real property ingestion.

Inspected unconfigured-build notices: [desktop](images/cloudflare-privacy-desktop.png)
and [phone](images/cloudflare-privacy-phone.png). The 320 px view was also checked.

Sources checked 2026-10-15:

- [Cloudflare setup](https://developers.cloudflare.com/web-analytics/get-started/)
- [Privacy-first analytics](https://www.cloudflare.com/web-analytics/)
- [Data origin and collection](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/)
- [SPA behavior](https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/)
- [Beacon configuration and FAQ](https://developers.cloudflare.com/web-analytics/faq/)
