# Night / Precision local review

This isolated redesign is based on the selected Library image `01-night-precision-original-cube.png` (`libfile_c0f1df61b3ec8191ab309213e83aa714`). The PNG was materialized into this Mac's workspace, verified as 1,543,460 readable bytes at 1536 × 1024, and visually inspected before implementation.

Run `npm run dev -- --host 127.0.0.1` and open `http://127.0.0.1:5173/cubetimer365/`. The cube finishing comparison is at `?cube-options`. The original stays selected; comparison cards do not change the timer's cube. No deployment, production data modification, remote push, merge, or publishing was performed.

## Design and preserved behavior

Graphite panels, lime accents, locally bundled Chakra Petch timer digits, an independent desktop history column, and stacked phone cards follow the selected concept. Empty states use actual absence of data. History, deletion, best, total, trimmed AO5/AO12, and chart series remain connected to the existing numeric history. The existing `history` and `today` localStorage keys and daily UTC history boundary are retained. The original local-date seed and scramble algorithm are preserved; the date updates while the page stays open and after returning from the background. Screenshot fixtures live only in the isolated localhost test browser.

`src/CubeNet.tsx` is byte-for-byte identical to the original checkout (SHA-256 `0e1a49725a55f8e0c8f73c8bf4aa2973ec4bfc3d3c7f8f9be9ddde2da19b4ead`). Its octagonal perspective projection, front square, four trapezoidal surrounding faces, sticker assignment, and permutations remain intact. Original / Clear separators / Soft enamel / Subtle depth use the same source component. The browser comparison confirms all 50 polygon point strings, viewBox, and fill-variable assignments match across all four renders. Alternatives apply CSS palette, separator, and shadow changes only. A memoized wrapper avoids recomputing an unchanged scramble on every timer tick.

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
- Vitest: 15 passing regression tests covering original scramble fixture, live daily rollover, existing history, averages/deletion/persistence, keyboard and touch timing, repeats, Escape, debounce, hidden comparison page, cancellation, secondary pointers, and final release position.
- Headed Chromium on the user's Mac: 29 passing browser checks. Actual emulated touch input covers early release, readiness, release/start, immediate stop after debounce, consumed stop release, cancellation, drag, multiple pointers, repeated actions, and orientation. Keyboard checks cover hold/release, repeat, any-key stop, debounce, Escape, control exclusion, persistence, and deletion.
- Responsive overflow and timer fit: pass at 320, 390, 760, 768, 1024, and 1440 px. Desktop, phone timer, phone history/chart, and cube comparison pixels were inspected and spacing/type refined.

Existing repository-wide checks were also run against the unchanged source baseline. Baseline ESLint had 19 errors and one warning; the redesign now leaves only four unused-variable errors and one console warning in the preserved CubeNet source. Repository Prettier still reports the four unchanged files (`CubeNet.tsx`, `main.tsx`, and both test-utils files). The stylelint command has no configuration in the original repo and fails in both the baseline and redesign. The original repo had no test files. These pre-existing check failures have not been hidden or weakened to obtain a green aggregate command.

## Local evidence

Generated files are in `output/playwright/` (ignored by Git):

- `desktop-preview.png`: 1440 × 1120.
- `mobile-timer-preview.png`: 390 × 844.
- `mobile-history-preview.png`: 390 × 844.
- `cube-alternatives.png`: 1440 × 900, original plus three alternatives side by side.
- `cube-alternatives-mobile.png`: phone comparison.
- `mobile-320-check.png`, `mobile-ready.png`: additional narrow-screen/readiness checks.
- `browser-check.js`, `browser-check.log`, `capture-preview.js`, `capture-preview.log`: reproducible browser checks and capture evidence.
- `typecheck.log`, `changed-eslint.log`, `changed-prettier.log`, `vitest.log`, `repo-lint.log`, `repo-prettier.log`, `build.log`: check output.

Populated screenshots contain deliberately illustrative local sample solves, including one automated timer interval. They are not the user's solve records. Runtime code does not inject those fixtures. Visual phone verification used browser touch emulation on this Mac; physical iPhone/Android testing remains a useful later acceptance check.

## Library screenshot deliverables

Five screenshot saves succeeded and local Library identities were applied. The prepared-upload helper was unavailable in this executor before any upload began; the supported direct create batch completed all five files.

- [Desktop preview](https://chatgpt.com/api/library/files/libfile_5e872458517081919c631f7706b91837/download) — `desktop-preview.png` (`libfile_5e872458517081919c631f7706b91837`).
- [Phone timer](https://chatgpt.com/api/library/files/libfile_39788949e4148191835cd1b6abf0f700/download) — `mobile-timer-preview.png` (`libfile_39788949e4148191835cd1b6abf0f700`).
- [Phone history/chart](https://chatgpt.com/api/library/files/libfile_a9a3094e98688191b29edd46266abc0c/download) — `mobile-history-preview.png` (`libfile_a9a3094e98688191b29edd46266abc0c`).
- [Cube alternatives](https://chatgpt.com/api/library/files/libfile_ac801fe839e88191b7038cb8cba26d04/download) — `cube-alternatives.png` (`libfile_ac801fe839e88191b7038cb8cba26d04`).
- [Phone cube alternatives](https://chatgpt.com/api/library/files/libfile_11ef2a3e7d2c8191b9fc573b61b092d8/download) — `cube-alternatives-mobile.png` (`libfile_11ef2a3e7d2c8191b9fc573b61b092d8`).

