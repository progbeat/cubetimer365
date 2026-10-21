# CubeTimer365

A 3×3 cube timer for exploring one scramble throughout the day. Try different
openings, revisit awkward steps and compare attempts from the same starting
position. The next day brings a new scramble to work through.

[Open CubeTimer365](https://progbeat.dev/cubetimer365/)

## Use the timer

1. Apply the displayed scramble to your cube. The cube preview shows the resulting
   position.
2. Hold **Space** until the timer says **Ready**, then release to start. On a
   touchscreen, hold and release the timer area instead.
3. Press **Space** again, or tap anywhere on a touchscreen, to stop and record your
   time.

Releasing before **Ready** cancels the start. **Escape** cancels an attempt without
recording it.

The solve table and chart let you compare repeated attempts. AO5 and AO12 are
rolling averages of five and twelve solves, each dropping the fastest and slowest
result. The summary shows your best single and best averages for the day. Delete
an individual solve from its table row to recalculate the results.

Click or tap the cube preview to choose a Flat, Neon or Cyber finish. Your choice
is remembered in this browser.

## Daily results

The scramble follows your local calendar date. Solve history is stored in this
browser for the current UTC day and resets at midnight UTC. Clearing browser data
removes saved results and preferences.

See [statistics](docs/STATISTICS.md) for averaging rules and
[browser storage](docs/STORAGE.md) for persistence and recovery details.

## Run locally

Use Node.js 24 and Corepack. The repository pins Yarn 4.5.1.

```sh
git clone https://github.com/progbeat/cubetimer365.git
cd cubetimer365
corepack enable
yarn install --immutable
yarn dev
```

Open <http://localhost:5173/cubetimer365/>.

## Development

The app uses React, TypeScript, Vite and Mantine.

```sh
yarn test     # Type checking, formatting, linting, unit tests and production build
```

To build and preview the app locally:

```sh
yarn build
yarn preview --host 127.0.0.1 --port 4173 --strictPort
```

Open <http://127.0.0.1:4173/cubetimer365/>. Build output is written to `dist/`, with
`/cubetimer365/` as the asset base.

[Development guide](docs/DEVELOPMENT.md) covers browser checks, cube rendering and
hosting. [Analytics configuration](docs/ANALYTICS.md) describes the Cloudflare
integration and its privacy-signal handling.

## Feedback and license

Report bugs or suggest changes in [GitHub Issues](https://github.com/progbeat/cubetimer365/issues).

Released under the [MIT License](LICENSE). Bundled font and icon licenses are
included in `public/fonts/` and `public/licenses/`.
