# CubeTimer365

A daily Rubik's Cube practice timer with a dark graphite/lime interface.
Each day has one deterministic 20-move scramble and a projected five-face cube.
Cyber is the default finish, with horizontal screen-space interference; Neon
and Flat are available from the cube thumbnail picker.

## Timing and history

- Hold Space or the large touch surface for 300 ms, then release to start.
- Press a key outside interactive controls, or touch the timer, to stop.
- An early release cancels readiness; Escape cancels an unsaved attempt.
- After choosing a finish or closing its picker, Space is ready to use again.
- Native buttons and editable controls retain their keyboard behavior.

Daily numeric solve history is saved in browser localStorage using the existing
`history` and `today` keys. Best, AO5, AO12, total time and solve charts use that
history. Each solve can be deleted. The date/history boundary retains the
original UTC behavior, while the daily scramble seed uses the local date.

## Development

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

## Build and hosting

```sh
yarn build
```

Vite writes `dist/` and retains the existing `/cubetimer365/` asset base. The
existing GitHub Pages workflow deploys only on pushes to `master`; the PR checks
do not deploy. The build retains its existing JavaScript chunk-size warning.

## Assets and license

Application code is MIT licensed; see [LICENSE](LICENSE). Bundled Chakra Petch
and Roboto fonts include their licenses in `public/fonts/`. The current header
and favicon use Tabler's IconCube; its MIT license is included in
`public/licenses/tabler-icons.txt`.
