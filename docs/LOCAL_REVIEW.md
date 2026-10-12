# Night / Precision local review

The user also rejected the Cyber material in `2e49d92`. The current stage leaves that runtime unchanged and prepares two isolated source/render sticker closeups. See [the staged material review](STICKER_MATERIAL_REVIEW.md); no new material has been propagated to the whole cube.

This is an isolated local redesign on `design/night-precision`. Open `http://127.0.0.1:5173/cubetimer365/`; restart with `npm run dev -- --host 127.0.0.1` from this checkout. No deployment, remote push, merge, publishing or production data modification has occurred.

The charcoal/graphite and lime layout follows the selected Library image `01-night-precision-original-cube.png` (`libfile_c0f1df61b3ec8191ab309213e83aa714`). It was transferred into this Mac workspace, verified as 1,543,460 readable PNG bytes at 1536 × 1024, and visually inspected before implementation. The subsequent ROUND reference is `05-rounded-vs-chamfered-comparison.png` (`libfile_8f5fdef398248191818a0cfba4e68915`), likewise transferred and inspected as 1,678,554 bytes at 1024 × 1536.

## Runtime revision 2e49d92 (subsequently rejected)

The preceding Cyber render was rejected. Its post-projection curves, constant screen-space strokes, face-wide Gaussian blur, repeated exterior rails and undersampled side texture produced poor corners and seams. That preview is superseded and is not described as accepted.

Cyber now rounds the plate in the physical face coordinates and passes each curve sample through the original perspective function. Filled inset rings and bevels stay inside the plate's clip path, leaving explicit dark gaps. Rendered SVG width controls minimum readable gutters/corners and texture density. Texture is omitted on tiny, narrow side plates instead of becoming checker-like speckles. Directional per-sticker rim gradients and short selectively placed highlights vary intensity and position. Cyber has no Gaussian blur, external stroke or replacement contour.

The reference's cyan/magenta outer lighting is absent in this revision. Its material remains richer than the local SVG, especially on the narrow side plates. The side-by-side images expose this remaining difference; they are evidence for visual review, not a claim of faithful reproduction or approval. All four side corners and top/bottom contour are shown as native desktop and phone raster crops enlarged 4× with nearest-neighbor scaling. A separate row shows the whole cube at actual desktop 170 px and phone 124 px sizes.

The approved removal of the ± history column is implemented. Its header, cells, delta calculation and unused CSS are gone. The table contains index, actual time and delete. The numeric history, averages and chart remain connected to the same stored solves.

## Preserved data and behavior

The original five-face octagonal projection, front square, four trapezoidal surrounding faces, sticker assignments and permutations are preserved. Fixed fixtures derived directly from original commit `330a59f` verify every face boundary and logical sticker vertex/color assignment for three scramble sequences across Original, Flat, Neon and Cyber. Original still renders its original square polygons and paint opacity. Cyber changes paint material only, with original-opacity metadata retained. It uses the actual daily scramble rather than illustrative sticker placement.

The existing numeric `history` and `today` localStorage keys and daily UTC history boundary are retained. The original local-date seed and scramble algorithm remain. Date changes are handled while the page stays open and on returning from the background. Best, total, trimmed AO5/AO12, deletion and chart data derive from real stored history. Empty states reflect absent data.

Keyboard and touch use a 300 ms hold, visible Ready state, release to start and contact/key to stop after a 200 ms debounce. Escape cancels an unsaved attempt. Early release, excessive movement, release outside the surface, pointer cancellation/capture loss, blur/backgrounding and resize cancel an unstarted attempt. Secondary pointers and key repeat do not duplicate saves. Running time uses monotonic elapsed time. Enter supports a focused timer; interactive history/navigation/finish controls are excluded from timer input.

The selected Cyber working preview is the default. Original, Flat and Neon remain selectable; `?cube-options` shows all four side by side, and `?cube=original`, `?cube=flat`, `?cube=neon` show each in the interface. Finish selection does not modify solve data.

## Validation and visual evidence

- TypeScript typecheck, full ESLint, changed-file Prettier and Vite build pass. Build retains the existing large-chunk warning.
- Vitest: 35 tests pass, covering source-derived projection/color assignment, rounded face-coordinate samples, plate containment, unique effect IDs, absence of Cyber blur/rails, native-size texture limits, daily scramble/rollover, three-column history, statistics/deletion/persistence and timer lifecycle safeguards.
- Headed Chromium on the user's Mac: all 29 checks pass. Keyboard and actual browser touch emulation cover early release, readiness, release/start, stopping/debounce, consumed stop release, repeated actions, cancellation, drag, secondary pointers, orientation, Escape, control exclusion, persistence and deletion.
- No horizontal overflow and timer fit verified at 320, 390, 760, 768, 1024 and 1440 px.
- Actual desktop, phone timer, phone history/chart, four enlarged side corners, top/bottom contour and both full small cube renders were captured and their pixels inspected.

Existing repository aggregate checks remain limited by a missing stylelint configuration and Prettier failures in three unchanged files (`src/main.tsx`, `test-utils/index.ts`, `test-utils/render.tsx`). These were present on the baseline. No check has been disabled to hide them. Physical phone testing remains a later acceptance step; current touch checks use the Mac browser's touch emulation.

Populated screenshots use deliberately illustrative solves in the isolated localhost browser, including one actual automated timer interval. They are not the user's records, and runtime code does not inject them. Screenshots and reproducible capture/check scripts are in the ignored `output/playwright/` directory:

- `cyber-precision-desktop.png`, `cyber-precision-mobile.png`, `cyber-precision-mobile-history.png`, `cyber-precision-mobile-320.png`.
- `cyber-precision-comparison.png`: unchanged reference crop versus actual imported CubeNet at matched display sizes.
- `cyber-precision-details.png`: all four native-raster corner/seam comparisons, top/bottom contour and full small renders.
- `cyber-precision-left-upper.png`, `cyber-precision-right-upper.png`, `cyber-precision-left-lower.png`, `cyber-precision-right-lower.png`, `cyber-precision-top-contour.png`, `cyber-precision-bottom-contour.png`, `cyber-precision-native-full.png`: individual detail panels.
- `cyber-fidelity.html`, `cyber-precision-details.html`, `capture-precision.js`, `capture-precision-study.js`, `browser-check.js`, `precision-browser-check.log`: reproducible review and browser checks.

Native Library attachment links are recorded below after successful saving. Earlier rounded and fidelity screenshots remain historical rejected drafts; only this revision's attachments should be used for current visual review.

## Runtime screenshots for 2e49d92 (subsequently rejected)

All 19 screenshot saves succeeded and their local Library identities were applied and verified. The current upload helper could not find Library prepare_uploads before any transfer began; the supported direct-create batch completed the saves.

- [cyber-precision-desktop.png](https://chatgpt.com/api/library/files/libfile_94991a3c838081919b3a206a855ebc13/download)
- [cyber-precision-mobile.png](https://chatgpt.com/api/library/files/libfile_d13dc47afd7c8191a23d5e8880be0cda/download)
- [cyber-precision-mobile-history.png](https://chatgpt.com/api/library/files/libfile_6287c1f1c7d08191b6958da78a11a2bf/download)
- [cyber-precision-comparison.png](https://chatgpt.com/api/library/files/libfile_c3a036a5dfe4819185be9c1bc71281a8/download)
- [cyber-precision-details.png](https://chatgpt.com/api/library/files/libfile_3393dd6eb45c81918f03a72c27b1752c/download)
- [cyber-precision-phone-details.png](https://chatgpt.com/api/library/files/libfile_0bf17b81b6908191880cd99c9b9c8144/download)
- [cyber-precision-native-full.png](https://chatgpt.com/api/library/files/libfile_aa658d88a6208191965e84335f60601b/download)
- [cyber-precision-alternatives.png](https://chatgpt.com/api/library/files/libfile_c7bc3794a1008191aef9f8bd51bfadf6/download)
- [cyber-precision-alternatives-mobile.png](https://chatgpt.com/api/library/files/libfile_f9ae996986288191bd7e8c3eebbfb961/download)
- [cyber-precision-left-upper.png](https://chatgpt.com/api/library/files/libfile_c906ad7283848191bccba01a9bcee8da/download)
- [cyber-precision-right-upper.png](https://chatgpt.com/api/library/files/libfile_2c8afc18df288191a4c2a3da7f75388e/download)
- [cyber-precision-left-lower.png](https://chatgpt.com/api/library/files/libfile_cd3cf45f309c8191939febe76202765c/download)
- [cyber-precision-right-lower.png](https://chatgpt.com/api/library/files/libfile_410b610d78348191b34a04b27fe4a8a3/download)
- [cyber-precision-top-contour.png](https://chatgpt.com/api/library/files/libfile_55bb28a02e208191a2055c58aef8970b/download)
- [cyber-precision-bottom-contour.png](https://chatgpt.com/api/library/files/libfile_9e99a97cd6608191b795bcc76238cce6/download)
- [cyber-precision-phone-left-upper.png](https://chatgpt.com/api/library/files/libfile_7db2d29a6660819194dc82130cf0f181/download)
- [cyber-precision-phone-right-upper.png](https://chatgpt.com/api/library/files/libfile_9f7b53a0d6d08191940128731103d77a/download)
- [cyber-precision-phone-left-lower.png](https://chatgpt.com/api/library/files/libfile_7c6f3c4e55f08191be2225aedc9d791c/download)
- [cyber-precision-phone-right-lower.png](https://chatgpt.com/api/library/files/libfile_8a7935edf6488191810a1ed6b6769914/download)
