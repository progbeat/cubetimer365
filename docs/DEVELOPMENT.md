# Development

Use Node 24 and the repository's pinned Yarn 4.5.1:

```sh
corepack enable
yarn install --immutable
yarn dev
```

Open `http://localhost:5173/cubetimer365/`. Yarn's `node-modules` linker is
configured in `.yarnrc.yml` for local development and CI. Generated Plug'n'Play
loaders are excluded from source control.

## Checks

```sh
yarn test
```

This runs TypeScript, Prettier, ESLint, CSS syntax/rule checks, unit tests and the
production build. The browser checks cover Space/repeat/focus, real touch input,
persistence/deletion, style selection and responsive widths:

```sh
yarn build
yarn playwright install chromium
yarn preview --host 127.0.0.1 --port 4173 --strictPort
# In another terminal:
yarn browser-check
```

Browser fixtures require an isolated localhost context and use illustrative
solves. The PR workflow runs these checks with Chromium and read-only repository
permissions. Reports, downloaded references, generated dist and local hosting
configuration are excluded from source control.

Touch checks also cover stopping a running solve over the timer, page
background, scramble, cube control, delete control and navigation links. The
stopping gesture and compatibility clicks are consumed; starting still uses
the timer area's hold/release gesture, and desktop keyboard behavior is retained.
Global scroll-blocking touch listeners are installed only for a consumed stop
gesture. Native browser checks verify they are absent during idle browsing and
removed after the last release, touch cancellation or blur. Compatibility clicks
remain suppressed after those listeners are removed.

## Font loading

The entry HTML preloads the local wordmark, timer and scramble fonts. Their
`font-display: optional` keeps late or failed fonts from replacing visible text
mid-page. Normal cold loads use the intended fonts at the first render; constrained
loads retain a readable system fallback. No application loading gate is added.
`browser-loading-check` samples the first rendered frames with a cold HTTP cache,
network throttling, warm navigation and delayed/failed font requests. It checks
stable text geometry and keyboard use in the fallback state.

## Cube materials

Flat, Neon and Cyber use the same projected sticker geometry and material
renderer. Their paint parameters live in `src/cubeMaterials.ts`; the shared
fill, contour and glow pipeline lives in `src/cubeRenderer.ts`.

`CubeNet` keeps an accessible SVG and a projected fallback, then paints the
material at the displayed size. It redraws when the scramble, finish, size or
device pixel ratio changes, with the pixel ratio capped at 2. Timer ticks do
not trigger material redraws.

Cyber's static interference is a final SVG pass in screen space: 3.4 px pitch,
0.6 px bands, 0.7 px phase and 0.18 opacity. Browser checks cover the approved
Neon color/glow samples, all 45 sticker paths across the three finishes, the
170/132/124 px cube sizes and the 76 px chooser previews. Material checks run
at DPR 1, 2 and 3, verifying bitmap dimensions, approved pixel samples and the
DPR 2 cap while keeping the interference spacing in screen pixels.

The selected finish is stored separately at `cubetimer365:cube-style:v1` and read
by the initial React state, so a saved choice is used on the first render. An
explicit valid `?cube=` URL takes priority without rewriting the preference.
Missing/invalid values or blocked reads fall back to Neon; blocked writes leave
the choice usable in memory. The picker writes only that namespaced preference.
Browser checks cover reloads, new tabs, first-render labels and storage failures.

## Daily data

The results table shows rolling AO5/AO12 at each solve. Its sticky header
shows independent daily best single, best AO5 and best AO12 on every screen size. [Statistics rules](STATISTICS.md)
define chronological windows, trimming, deletion, display precision and the numeric
history boundary. Browser checks exercise the table and summary at 320/390 px and
desktop widths, along with the existing timer, materials and analytics suites.

On desktop the chart fills the remaining viewport height, with a 244 px panel
minimum and a plot of at least 180 px. Below the dashboard's minimum height the
page scrolls naturally instead of clipping content. Empty and populated charts
use the same space. Mobile keeps stacked panels and a 230 px plot. Browser checks
cover the height boundary, bottom inset, centered times and right-aligned indices
with isolated history fixtures.

Solve history uses `cubetimer365:daily-history:v1`, a project-scoped record with
numeric times, a UTC date and the import decision. [Storage rules](STORAGE.md)
explain the reviewed legacy import and preservation of generic shared keys.
The date/history boundary retains the original UTC behavior; the daily scramble
seed uses the local date.

The SVG calendar mark uses `cubeFaceColors(scramble, "B")` from the same cube
engine as the main projection. Read B directly with U above, R on the viewer's
left and L on the right; its centre is blue. The logo and main cube receive the
same memoized daily scramble. The existing local/UTC boundary timeout and
focus/visibility refresh update both without changing the UTC history rules.
`browser-logo-check` covers several dates, reload, midnight and suspended-tab
resumption, including preservation of history and settings.

## Build and hosting

```sh
yarn build
```

Vite writes `dist/` and retains the existing `/cubetimer365/` asset base. The
existing GitHub Pages workflow deploys only on pushes to `master`; the PR checks
do not deploy. Vite 7 and Vitest 4 use the locked dependency versions. The
production build uses Terser and explicitly retains the original browser targets. The single
JavaScript chunk still exceeds the default warning threshold; changing that
threshold would not improve loading.

## Assets and license

The wordmark uses a locally hosted Inter Black subset for consistent weight and
width across platforms. Only the brand uses it; its license is included in
`public/fonts/Inter-OFL.txt`. The font and license come from
[Google Fonts](https://github.com/google/fonts/tree/main/ofl/inter).

Application code is MIT licensed; see [LICENSE](../LICENSE). Bundled Chakra Petch
and Roboto fonts include their licenses in `public/fonts/`. The current header
calendar mark and favicons share the application’s SVG outline and grid. Other
UI icons use Tabler; its MIT license is included in `public/licenses/tabler-icons.txt`.

## Dependency review

The 2026-10-14 lockfile audit reports no production advisories and one tooling
advisory: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
in `braces` 3.0.3 via Stylelint's matcher dependencies. No patch is published.
It affects deeply nested, attacker-controlled brace patterns; the CSS check
uses a fixed pattern. The package is not included in the browser bundle.

ESLint 9, Recharts 2 and jsdom's `whatwg-encoding` dependency also emit
deprecation notices, which are distinct from security advisories. ESLint 9
retains compatibility with the Mantine lint preset; the existing chart and
React versions retain the tested appearance. Dependency changes should be
followed by the checks above and a fresh production/complete-lockfile audit.

## Analytics regression fixture

The production build uses the verified public Cloudflare site token for
`progbeat.dev`. `yarn browser-analytics-fixture` builds a separate localhost fixture
with a synthetic token and tests singleton loading, privacy signals and migration
from the old GA4 state. Vendor requests are stubbed in both browser suites.
[Analytics setup](ANALYTICS.md) describes activation and verification limits.

## Dynamic favicon

The header and favicon share `createCalendarMark` geometry and B-face colors.
`useDailyFavicon` updates one existing SVG icon link with a data URL when the
shared daily mark changes. It allocates no blob URLs, preserves the PNG/ICO
fallback links, and restores the original SVG href on unmount. No CSP changes
are required by this integration.

The checked-in static SVG, PNG and 16/32px ICO are reproducible snapshots for
seed 20261021, generated with `node scripts/generate-favicons.mjs` (set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when using a system Chromium).
They remain available without JavaScript or dynamic SVG favicon support.
Browser checks verify SVG decoding, matching matrices, reload, midnight,
focus/visibility resumption, stable link identity and fallback signatures.
These checks prove the DOM update and decoding, not immediate tab-strip repaint.
Browser icon caching and saved home-screen icons may retain a static image.
