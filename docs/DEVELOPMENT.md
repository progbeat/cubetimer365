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

## Daily data

Solve history uses the existing numeric `history` and `today` localStorage keys.
The date/history boundary retains the original UTC behavior; the daily scramble
seed uses the local date.

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

Application code is MIT licensed; see [LICENSE](../LICENSE). Bundled Chakra Petch
and Roboto fonts include their licenses in `public/fonts/`. The current header
and favicon use Tabler's IconCube; its MIT license is included in
`public/licenses/tabler-icons.txt`.

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
