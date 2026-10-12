# Night / Precision · Rounded Cyber local review

This isolated redesign is based on the selected Library image `01-night-precision-original-cube.png` (`libfile_c0f1df61b3ec8191ab309213e83aa714`). The PNG was materialized into this Mac's workspace, verified as 1,543,460 readable bytes at 1536 × 1024, and visually inspected before implementation.

Run `npm run dev -- --host 127.0.0.1` and open `http://127.0.0.1:5173/cubetimer365/`. The cube finishing comparison is at `?cube-options`. Rounded Cyber is the current working-preview default, as selected by the user. Flat, Neon and Original are available from the finish selector, the comparison page, or `?cube=flat`, `?cube=neon`, and `?cube=original`. Finish selection does not change solve data. No deployment, production data modification, remote push, merge, or publishing was performed.

## Design and preserved behavior

Graphite panels, lime accents, locally bundled Chakra Petch timer digits, an independent desktop history column, and stacked phone cards follow the selected concept. Empty states use actual absence of data. History, deletion, best, total, trimmed AO5/AO12, and chart series remain connected to the existing numeric history. The existing `history` and `today` localStorage keys and daily UTC history boundary are retained. The original local-date seed and scramble algorithm are preserved; the date updates while the page stays open and after returning from the background. Screenshot fixtures live only in the isolated localhost test browser.

The selected rounded reference is `05-rounded-vs-chamfered-comparison.png` (`libfile_8f5fdef398248191818a0cfba4e68915`), materialized into this Mac workspace and visually inspected as a readable 1,678,554-byte PNG at 1024 × 1536. The left-hand ROUND 01 Flat / 03 Neon / 05 Cyber directions are implemented procedurally in SVG, with Cyber selected as the local default. No baked cube image is used.

The original five-face projection, octagonal outline, front square, four trapezoidal surrounding faces, sticker assignments and permutations are preserved. Cyber now uses circular cubic corner curves and inset screen plates contained inside each original projected sticker quadrilateral. Flat and Neon retain their earlier quadratic corner curves. Original still renders its square polygons. Fixed fixtures derived directly from original commit `330a59f` verify every face boundary, logical sticker vertex/color assignment and original-opacity metadata for three scramble sequences across all four runtime styles. Original preserves its original paint opacity; Cyber uses opaque emissive screen material. The original file is now extended with rendering options; it is no longer byte-identical. There are no mechanical or sticker-permutation changes.

Flat has quiet graphite separators. Neon uses darker centers and restrained colored rims. Cyber adds fine scanlines and segmented cyan/magenta chassis rails. The solid body keeps the exact original octagonal boundary; decorative rail glow is allowed outside the body instead of clipping the reference's halo. Colors remain distinguishable at the actual 170 px desktop / 124 px phone display sizes. SVG patterns/gradients/filters are shared by face groups, IDs are unique between comparison cubes, and the memoized component does not recompute the unchanged scramble on each timer tick. These are restrained runtime translations of the image exploration, rather than pixel-for-pixel copies of a raster render.

The ± history column is unchanged by this update.


## Familiar timer interaction

Compared against current official csTimer master `2547d82e32a347dd1b1c6943e8d03389d03eb64c`:

- [Readiness and keyboard lifecycle](https://github.com/cs0x7f/cstimer/blob/2547d82e32a347dd1b1c6943e8d03389d03eb64c/src/js/timer.js): default 300 ms hold, release to start, any key to stop, and a 200 ms input debounce.
- [Mobile event mapping](https://github.com/cs0x7f/cstimer/blob/2547d82e32a347dd1b1c6943e8d03389d03eb64c/src/js/kernel.js): broad touch surface maps contact/release to the same timer lifecycle.

The timer has a large comfortable touch surface. Hold until the visible Ready message, release to start, then contact to stop after the debounce. Stop release is consumed. Early release, excess movement, release outside the target, cancellation, capture loss, blur, backgrounding, and resize cancel unstarted attempts. Secondary pointers cannot start or stop the original pointer's attempt. History and navigation controls are excluded. Running time uses monotonic elapsed time, so backgrounding does not lose elapsed time. Enter on the focused timer provides the same hold/release behavior for keyboard accessibility.

Necessary differences: this product retains numeric times rather than adding csTimer's inspection, penalties, DNF records, hardware input, or configuration suite. Escape cancels an unsaved attempt here; csTimer can record a running Escape as DNF. Interactive controls are excluded from timer input, and additional cancellation safeguards prevent accidental scroll-triggered starts. These safeguards are product choices, not claims that csTimer implements each one.

## Validation

- TypeScript typecheck: pass.
- Vite build: pass; existing large-chunk warning remains.
- Changed TypeScript files: ESLint and Prettier pass.
- Vitest: 30 passing regression tests covering original scramble fixture, live daily rollover, existing history, averages/deletion/persistence, keyboard and touch timing, repeats, Escape, debounce, hidden comparison page, cancellation, secondary pointers, and final release position.
- Headed Chromium on the user's Mac: 29 passing browser checks. Actual emulated touch input covers early release, readiness, release/start, immediate stop after debounce, consumed stop release, cancellation, drag, multiple pointers, repeated actions, and orientation. Keyboard checks cover hold/release, repeat, any-key stop, debounce, Escape, control exclusion, persistence, and deletion.
- Responsive overflow and timer fit: pass at 320, 390, 760, 768, 1024, and 1440 px. Desktop, phone timer, phone history/chart, and cube comparison pixels were inspected and spacing/type refined.

Existing repository-wide checks were also run against the unchanged source baseline. Baseline ESLint had 19 errors and one warning; the redesigned source now passes the full ESLint command after removing unused bindings and logging in the cube rendering work. Repository Prettier still reports the three unchanged files (`main.tsx` and both test-utils files). The stylelint command has no configuration in the original repo and fails in both the baseline and redesign. The original repo had no test files. These pre-existing check failures have not been hidden or weakened to obtain a green aggregate command.

## Fidelity correction after user rejection

The user rejected the earlier rounded preview's visual fidelity; that implementation was not treated as accepted. The selected CYBER ROUND panel 05 was re-inspected against the actual component at matched 440 px, 170 px desktop and 124 px phone scales.

Concrete discrepancies were hairline rims, uniformly thin and clipped perimeter decoration, shallow corner treatment, insufficient black chassis/seams, a vertical gradient turning yellow olive, and a pale scanline/wire-grid appearance. The correction uses inset screen plates with circular cubic corners, wider dark separation, independent saturated fill/rim colors, local radial edge shading, finer low-contrast scanlines, layered illuminated rims, and separate cyan/magenta chassis segments with an unclipped halo. The effects remain procedural SVG and apply to every dynamically permuted sticker.

Representative 11 × 11 interior samples from the actual reference and same-scale SVG screenshot: reference green `(1.0,160.4,60.1)` / corrected SVG `(1.5,161.7,61.6)`; reference red `(237.5,18.7,40.8)` / corrected SVG `(238.9,19.3,41.6)`. These samples substantiate color calibration, not a claim of pixel-identical overall reproduction.

**Geometric constraint:** the image-to-image concept has front plates wider than tall, whereas the protected source projection has a square front face. The reference also depicts a fixed illustrative sticker arrangement. Exact grid/proportion matching would require a different projection, and matching its sticker placement would require substituting the actual scramble. The current implementation retains the original projection and real scramble, and exposes the difference in the comparison. SVG itself supports the required borders, glow, screen texture and shading. A separate projection variant would require an explicit change to the original geometry requirement.

Current evidence: `cyber-fidelity-reference-vs-svg.png` shows the exact CSS crop of the unchanged Library image alongside the running CubeNet component imported with its actual app stylesheet. `cyber-fidelity-desktop.png` and `cyber-fidelity-mobile.png` show the real interface; `cyber-fidelity-before.png` retains the diagnostic view of the rejected renderer. `cyber-fidelity.html`, `capture-fidelity.js`, `fidelity-color-samples.txt` and `fidelity-*.log` make the checks reviewable locally in `output/playwright/`.

Validation: 31 Vitest tests pass, including an added actual-path containment test for all Cyber curve/control points inside the original cells; the existing source geometry/permutation fixtures and functional timer tests remain. All 29 keyboard/touch/persistence/deletion/responsive browser checks pass again. Typecheck, full ESLint, changed-file formatting and build pass. Existing stylelint configuration and unrelated file-formatting limitations remain. The ± column and timer mechanics are unchanged. No production publication or remote update was performed. This remains a visual review draft.

## Earlier local evidence (superseded by fidelity correction)

Generated files are in `output/playwright/` (ignored by Git):

- `round-cyber-desktop.png`: 1440 × 1160, selected default in the actual interface.
- `round-cyber-mobile.png`: 390 × 844, selected default in the actual phone layout.
- `round-cyber-history.png`: phone history and chart, ± unchanged.
- `round-finishes-desktop.png`: Original, Round Flat, Round Neon and Round Cyber side by side at the real desktop cube size.
- `round-flat-desktop.png`, `round-flat-mobile.png`, `round-neon-desktop.png`, `round-neon-mobile.png`: optional full-interface comparisons with the same sample history.
- `round-browser-check.log`, `capture-rounded.js`, `capture-rounded.log`: the repeated 29 browser checks plus finish/default/history/geometry checks and captures.
- `round-typecheck.log`, `round-eslint.log`, `round-prettier.log`, `round-vitest.log`, `round-build.log`: current check output.

The rounded update passes 30 Vitest tests: 16 application tests and 14 source-derived geometry/material tests. Full ESLint passes. Typecheck, build and changed-file formatting pass. The remaining repository-wide failures are the previously missing stylelint configuration and formatting in three untouched files. The build's existing large-chunk warning remains.

Populated screenshots contain deliberately illustrative local sample solves, including one automated timer interval. They are not the user's solve records. Runtime code does not inject those fixtures. Phone verification used browser touch emulation on this Mac; physical iPhone/Android testing remains a later acceptance check. Procedural materials intentionally use restrained effects at small sizes rather than reproducing every raster lighting detail.

To restart the local preview after the task session ends, run `npm run dev -- --host 127.0.0.1` from this checkout. There is no production publication.

## Current fidelity review screenshots

- [Reference crop versus corrected real SVG](https://chatgpt.com/api/library/files/libfile_d86990e1d6748191ab4104b9d0a6185f/download) — `cyber-fidelity-reference-vs-svg.png`.
- [Corrected desktop context](https://chatgpt.com/api/library/files/libfile_dfa16bf8cad48191be99538f1ffc8d72/download) — `cyber-fidelity-desktop.png`.
- [Corrected phone context](https://chatgpt.com/api/library/files/libfile_96ccc63c49988191bf4785a44a0ccd4f/download) — `cyber-fidelity-mobile.png`.
- [Diagnosis: reference versus rejected prior renderer](https://chatgpt.com/api/library/files/libfile_6c3cacb3c28481918077bd49ef237282/download) — `cyber-fidelity-before.png`.

All four saves succeeded; local Library identities were persisted. The executor's prepared upload helper was unavailable before any transfer began, and the supported direct-create route completed the saves.

## Earlier rounded preview screenshots (rejected; superseded)

All eight saves succeeded and local Library metadata was persisted. The prepared-upload helper was unavailable in this executor before any transfer began; the supported direct create batch saved the deliverables.

- [Cyber desktop](https://chatgpt.com/api/library/files/libfile_483c7d09011081918bfbde39c4aa576a/download) — `round-cyber-desktop.png`.
- [Cyber phone](https://chatgpt.com/api/library/files/libfile_db3523cd5c0c8191911cdc32b005ce57/download) — `round-cyber-mobile.png`.
- [All finishes side by side](https://chatgpt.com/api/library/files/libfile_a160ae4290a081918124d304476ced0d/download) — `round-finishes-desktop.png`.
- [Cyber phone history/chart](https://chatgpt.com/api/library/files/libfile_817f7258d6d481918925d9ebdc8abf65/download) — `round-cyber-history.png`.
- [Flat desktop](https://chatgpt.com/api/library/files/libfile_8194d153b17c8191af94470eddf39022/download) — `round-flat-desktop.png`.
- [Flat phone](https://chatgpt.com/api/library/files/libfile_c1b4c77647e88191a755f7e5c11b4dc8/download) — `round-flat-mobile.png`.
- [Neon desktop](https://chatgpt.com/api/library/files/libfile_231e9ce003f48191abaa8211fa5d82e5/download) — `round-neon-desktop.png`.
- [Neon phone](https://chatgpt.com/api/library/files/libfile_8e9d24b4e4d88191af362349cd78c1e5/download) — `round-neon-mobile.png`.

## Earlier square-corner screenshot deliverables (superseded)

Five screenshot saves succeeded and local Library identities were applied. The prepared-upload helper was unavailable in this executor before any upload began; the supported direct create batch completed all five files.

- [Desktop preview](https://chatgpt.com/api/library/files/libfile_5e872458517081919c631f7706b91837/download) — `desktop-preview.png` (`libfile_5e872458517081919c631f7706b91837`).
- [Phone timer](https://chatgpt.com/api/library/files/libfile_39788949e4148191835cd1b6abf0f700/download) — `mobile-timer-preview.png` (`libfile_39788949e4148191835cd1b6abf0f700`).
- [Phone history/chart](https://chatgpt.com/api/library/files/libfile_a9a3094e98688191b29edd46266abc0c/download) — `mobile-history-preview.png` (`libfile_a9a3094e98688191b29edd46266abc0c`).
- [Cube alternatives](https://chatgpt.com/api/library/files/libfile_ac801fe839e88191b7038cb8cba26d04/download) — `cube-alternatives.png` (`libfile_ac801fe839e88191b7038cb8cba26d04`).
- [Phone cube alternatives](https://chatgpt.com/api/library/files/libfile_11ef2a3e7d2c8191b9fc573b61b092d8/download) — `cube-alternatives-mobile.png` (`libfile_11ef2a3e7d2c8191b9fc573b61b092d8`).

