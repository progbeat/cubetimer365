# Two-sticker material review

The user rejected the runtime Cyber appearance in `2e49d92`. This stage isolates one front green sticker and one adjoining white side sticker from panel 05 of `05-rounded-vs-chamfered-comparison.png` (`libfile_8f5fdef398248191818a0cfba4e68915`). The original materialized PNG was inspected again at its native 1024 × 1536 pixels, then the two crops were inspected at 6× nearest-neighbor enlargement before writing the prototype.

This is a material study, not another full-cube iteration. `CubeNet`, `cubeFinish`, `App`, its CSS, timer, stored data and the approved three-column history are unchanged from `2e49d92`. No production publication, push, merge or deployment occurred.

## Source observations and reconstruction

The front plate's inner light boundary is not a smaller copy of its outer rounded rectangle. Its left shoulder grows inward, its lower corners have different-width pools, the lower center narrows to a thin band, and the pale upper-left glint occupies a small area. The side plate has a broad white crescent on its left/lower boundary and a much thinner blue-white opposing edge. Diffuse reflection extends into its gray center from the illuminated crescent.

`src/material-study/CyberStickerMaterialSample.tsx` represents those observations with independently hand-shaped outer, inner and local glint paths. The inner contours are not mathematical offsets of the outer contours. Each glint has its own position, length, silhouette, gradient footprint and strength. A small feather applies only to the light ribbons and glints; the outer plate shape is clipped separately. Scanlines are confined to the center rather than laid over the highlights. There is no perimeter stroke, random noise, baked reference texture or runtime cube integration.

The study uses the reference's green and white exemplars, not the daily scramble. Those fixed colors and specimen shapes are intentional for this isolated material comparison. Binding approved materials to dynamically permuted colors and the protected original projection remains a subsequent stage.

A raster mask is not needed to express the reconstructed unequal-width ribbons and localized glints. They are visible in the current vector-only render. The reference still has finer painterly pixel variation and slightly different soft falloff; this study does not establish that a raster mask is necessary for those details, and it does not claim a pixel-identical or accepted match.

## Actual browser evidence

Open `http://127.0.0.1:5173/cubetimer365/output/playwright/sticker-material-comparison.html`. Left is the unmodified source crop; right is the actual rendered component. Both were captured at native source-size first and then enlarged 6× with nearest-neighbor scaling, so the browser does not give the SVG a higher-resolution advantage. Neighboring sticker pixels remain visible around the unmodified reference crop.

- Front crop: source rectangle `(110,1121,103,88)`.
- Side crop: source rectangle `(74,1204,44,92)`.
- `sticker-material-front-review.png` and `sticker-material-side-review.png` show the individual large comparisons.
- `sticker-material-comparison-review.png` includes both and a native-size row.
- `sticker-material-front-first.png` and `sticker-material-side-first.png` preserve the initial diagnostic pass, whose lower green pools and upper white crescent were too large.
- `sticker-material-native.html`, `sticker-material-comparison.html`, the capture scripts and native raster files remain in the local ignored `output/playwright/` directory.

The final screenshots' pixels were inspected. Native color samples informed calibration, without treating isolated samples as an overall quality score. For example, the front upper-left glint at crop `(14,9)` is reference `(69,253,181)` versus SVG `(71,251,168)`; the side opposing edge at `(35,51)` is reference `(230,251,254)` versus SVG `(232,253,255)`. Remaining discrepancies are visible: the front lower-right transition is brighter than the source at some pixels, and the side upper/lower reflected-gray regions differ in hue and falloff. The source's fine irregularity is still richer.

Typecheck, the new component's ESLint and Prettier, and `git diff --check` pass. Existing runtime source files have no diff from `2e49d92`; no new timer functionality was introduced to retest. The earlier 35 unit tests / 29 functional browser checks describe that unchanged runtime checkpoint, not acceptance of this new material study.

Native Library links are recorded below once saving completes.

## Native Library review pair

All three saves succeeded; the current Library transfer helper applied and verified their local identities. The prepared helper was unavailable before any transfer began, and the supported direct-create route completed saving.

- [sticker-material-front-review.png](https://chatgpt.com/api/library/files/libfile_bf3eee17bcd081919c3c32c17d0418ca/download)
- [sticker-material-side-review.png](https://chatgpt.com/api/library/files/libfile_a4701ed5d8d081918a8cd9bf661f3332/download)
- [sticker-material-comparison-review.png](https://chatgpt.com/api/library/files/libfile_cf78ad64025481918e1de21830ebc3fd/download)
