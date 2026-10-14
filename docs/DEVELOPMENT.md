# Development

Use Node 24 and the repository's pinned Yarn 4.5.1:

```sh
corepack enable
yarn install --immutable
yarn dev
```

Open `http://localhost:5173/cubetimer365/`. CI uses Yarn's `node-modules` linker;
set `YARN_NODE_LINKER=node-modules` for the same local installation mode.

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
do not deploy. The build retains its existing JavaScript chunk-size warning.

## Assets and license

Application code is MIT licensed; see [LICENSE](../LICENSE). Bundled Chakra Petch
and Roboto fonts include their licenses in `public/fonts/`. The current header
and favicon use Tabler's IconCube; its MIT license is included in
`public/licenses/tabler-icons.txt`.
