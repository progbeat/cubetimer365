# CubeTimer365 Cloud handoff

Repository: `progbeat/cubetimer365`. Handoff branch: `codex/night-precision-cloud-handoff`. This branch descends from the complete local checkpoint `1895e83d336315722394d72afca5eddbd125d082`. The rounded runtime baseline is `2e49d92e9e4c0d7818448cfdc04cc6089881f1f1`; study `1895e83` adds the isolated source/render material samples without changing that runtime. Original upstream base remains `330a59f50e09176a0c06ee129095589e2f7aba61`.

## Latest authorized goal

The user now likes the preceding rounded-edge version as a fallback baseline and authorized trying the full cube. Continue the optional experiment in Cloud: smooth irregular light contours, changing thickness, asymmetric localized glints and an individual stable pattern for each sticker, with coherent material and light direction. This is generative drawing character, not identical symmetric frames or a noise layer. Deterministic face/sticker seeds should prevent flicker during timer ticks or rerenders.

Keep the baseline selectable and unchanged until the user chooses. Use study `src/material-study/CyberStickerMaterialSample.tsx` and panel 05 of the ROUND reference as context; do not resume the older requirement to wait for another isolated-sticker approval. Evaluate the whole cube inside the real interface at desktop and phone widths, and inspect enlarged front/side faces as well as native 170/124 px renders. Report actual remaining visual limitations. Do not deploy, merge, create a PR or publish the site before the user's choice/authorization.

Preserve the original five-face octagonal projection (front square with four trapezoidal surrounds), sticker permutations/color meaning, daily actual scramble semantics, keyboard/touch timer lifecycle, data keys/history/deletion/statistics/chart, and the already removed ± column. Do not flatten the cube to a T net, blur the narrow side stickers, close black gaps or substitute reference sticker placement for the actual scramble.

## Mac recovery and branch safety

On 2026-10-13, the reconnected Mac was inspected before preparing this handoff. Its worktree was clean at `1895e83`. The uncertain interrupted writes did not create `src/drawnRibbon.ts`, `src/DrawnStickerFinish.tsx` or `docs/DRAWN_EXPERIMENT_PLAN.md`. No full-cube experiment was implemented on the Mac afterward. This handoff adds only documentation, reference metadata, a reference ignore rule and copies of portable review scripts/templates; application sources remain byte-identical to `1895e83`.

Fresh `origin/master` was `330a59f50e09176a0c06ee129095589e2f7aba61`. Its sole workflow is `.github/workflows/gh-pages.yml`, whose `on.push.branches` contains only `master`. The same workflow is unchanged in this branch. A push to this handoff branch therefore does not trigger its Pages deployment. Push only this explicit branch ref; never push `master`, all refs or tags. No PR, merge, workflow dispatch or site deployment was performed.

## Linux setup and checks

At the start of the Cloud task, read its managed Cloud runtime skill and network/credential instructions. Do not assume Mac paths, runtimes or browser sessions exist in Linux. Pin the handoff SHA reported after remote readback, then confirm `git rev-parse HEAD` matches it.

```sh
git clone --branch codex/night-precision-cloud-handoff --single-branch https://github.com/progbeat/cubetimer365.git
cd cubetimer365
git rev-parse HEAD
corepack enable
corepack prepare yarn@4.5.1 --activate
yarn install --immutable
yarn typecheck
yarn vitest
yarn eslint
yarn build
yarn dev --host 0.0.0.0 --port 5173 --strictPort
```

The repository declares Yarn 4.5.1 and commits `yarn.lock` plus PnP loader files. The original CI specifies Node 23. The Mac checkpoint was verified using Node 20.18.0 / npm 10.8.2 with `node_modules`; the Cloud runtime must validate its own chosen Node/install environment. Do not commit dependency-generated loader changes or change dependencies merely to transfer the work.

Existing aggregate limitations: stylelint has no configuration; repository-wide Prettier reports three unchanged files (`src/main.tsx`, `test-utils/index.ts`, `test-utils/render.tsx`). Full ESLint, typecheck, unit tests and build passed on the local checkpoint; the build has an existing >500 kB chunk warning. The last functional browser verification had 29 passing checks, and the committed suite has 35 tests. Repeat applicable checks after the new Cloud implementation rather than presenting historical results as new experiment validation.

## Reference bytes and Library

All seven assets in `CLOUD_REFERENCES.json` already exist in Library. Their exact identities were verified by fresh Library filename metadata on 2026-10-13; consumer-local PNG bytes, sizes, dimensions and SHA-256 hashes were checked on the Mac. Reuse those Library files rather than duplicating them or assuming any `/Users/...` path exists in Cloud. The two selected source images are:

- `01-night-precision-original-cube.png` — `libfile_c0f1df61b3ec8191ab309213e83aa714`, selected graphite/lime surrounding layout; 1536 × 1024, 1,543,460 bytes.
- `05-rounded-vs-chamfered-comparison.png` — `libfile_8f5fdef398248191818a0cfba4e68915`, left panel 05 CYBER ROUND; 1024 × 1536, 1,678,554 bytes. The right CUT column is not selected.

Materialize into the actual Cloud executor using its current Library skill. For a fresh list/search result, use the supported download helper with the complete unchanged result. For the resolved pinned identifiers in the manifest, use `prepare_materialize` and current `references/materialization.md`. Verify bytes are readable in that consumer and match the manifest before inspecting pixels. A reported workspace path is not proof it exists locally; handle signed transfer URLs only through the current helper and do not guess download URLs. Preserve identities. Follow bounded retry instructions and report exact transfer failures.

Place source PNGs under the ignored `reference/` paths and historical screenshot evidence under `reference/evidence/` as recorded in the manifest. SHA-256 verification on Linux can use `sha256sum reference/*.png reference/evidence/*.png`. Historical screenshots contain illustrative localhost solves, not user records.

## Portable review harness

The formerly Mac-local ignored capture/check files are now committed under `scripts/review/`. After materializing the board:

```sh
node scripts/review/prepare.mjs reference/05-rounded-vs-chamfered-comparison.png
```

This validates the exact selected PNG hash and creates ignored local pages/assets in `output/playwright/`. It does not edit the source reference or application. Do not copy previous Mac outputs or `node_modules` into Linux.

Use the Cloud Playwright skill's resolved wrapper or supported local CLI, with headless Chromium where no display exists. The following CLI commands are a workflow example (replace `playwright-cli` with that wrapper; allow required package/browser download domains under the Cloud policy):

```sh
mkdir -p output/playwright
playwright-cli open http://127.0.0.1:5173/cubetimer365/
playwright-cli run-code --filename=scripts/review/browser-check.js
playwright-cli run-code --filename=scripts/review/capture-context.js
playwright-cli goto http://127.0.0.1:5173/cubetimer365/output/playwright/sticker-material-native.html
playwright-cli run-code --filename=scripts/review/capture-sticker-native.js
playwright-cli goto http://127.0.0.1:5173/cubetimer365/output/playwright/sticker-material-comparison.html
playwright-cli run-code --filename=scripts/review/capture-sticker-review.js
```

The browser checker covers 29 keyboard/touch/persistence/deletion/responsive cases, including actual CDP touch events and widths 320/390/760/768/1024/1440. Start it at the app root: it seeds and clears history only in the isolated localhost browser. Context capture seeds illustrative solves and runs one timed keyboard interval. Never run these fixture scripts on production or the user's real browser storage. The sample material comparison uses native 103 × 88 front and 44 × 92 side rasters, then equal 6× nearest-neighbor enlargement. It is a reference/study aid, not an implementation of the requested full-cube experiment.

Useful code: `src/CubeNet.tsx`, `src/cubeFinish.ts`, `src/material-study/CyberStickerMaterialSample.tsx`, `src/CubeNet.test.tsx`, `src/fixtures/originalCube.json`, `src/App.test.tsx`. Older review notes are historical; the latest user authorization above governs the next stage.
