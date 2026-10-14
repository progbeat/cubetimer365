export default async (page, { deviceScaleFactor = 1 } = {}) => {
  const root = `${new URL(page.url()).origin}/cubetimer365/`;
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const rasterDpr = deviceScaleFactor === 1 ? 1 : 2;
  const nativeBitmapSize = { 170: 192, 132: 148, 124: 140, 76: 86 };
  assert(
    (await page.evaluate(() => window.devicePixelRatio)) === deviceScaleFactor,
    `The browser context runs at DPR ${deviceScaleFactor}`,
  );
  const ready = () =>
    page.waitForFunction(() =>
      [...document.querySelectorAll(".cube-net")].every(
        (svg) => svg.dataset.materialReady === "true",
      ),
    );
  await page.clock.install({ time: new Date("2026-10-14T12:00:00Z") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${root}?cube-options`);
  await ready();
  const cubes = await page.locator(".cube-net").evaluateAll((nodes) =>
    nodes.map((svg) => ({
      style: svg.className.baseVal,
      paths: [...svg.querySelectorAll("[data-sticker]")].map((sticker) => ({
        id: sticker.dataset.sticker,
        path: sticker.getAttribute("d"),
        points: sticker.dataset.points,
        color: sticker.dataset.color,
      })),
      label: svg.getAttribute("aria-label"),
      image: Boolean(svg.querySelector("image")),
    })),
  );
  assert(
    cubes.length === 3,
    "The comparison renders all three material presets",
  );
  for (const cube of cubes) {
    assert(cube.paths.length === 45, `${cube.style}: all 45 stickers`);
    assert(
      new Set(cube.paths.map((p) => p.color)).size === 6,
      `${cube.style}: all six colors`,
    );
    assert(
      cube.image && cube.label,
      `${cube.style}: painted image and accessible SVG name`,
    );
    assert(
      JSON.stringify(cube.paths) === JSON.stringify(cubes[0].paths),
      `${cube.style}: identical projected paths and assignment`,
    );
  }

  // These samples come from the approved render, not a second implementation
  // of the material formula: 170px/DPR 1 and 124px/DPR 2. DPR 3 must use the
  // same bitmap as DPR 2. The matte is normalized for transparent SVG use.
  const samples =
    rasterDpr === 1
      ? [
          [58, 58, [0, 36, 66]],
          [96, 58, [0, 36, 66]],
          [134, 58, [66, 0, 8]],
          [58, 96, [66, 56, 0]],
          [96, 96, [0, 57, 24]],
          [134, 96, [56, 61, 63]],
          [13, 75, [75, 40, 0]],
          [49, 58, [0, 37, 70]],
          [58, 49, [0, 37, 70]],
          [43, 75, [66, 158, 237]],
          [54, 150, [34, 125, 204]],
        ]
      : [
          [85, 85, [0, 36, 66]],
          [140, 85, [0, 36, 66]],
          [195, 85, [66, 0, 8]],
          [85, 140, [66, 56, 0]],
          [140, 140, [0, 57, 24]],
          [195, 140, [56, 61, 63]],
          [19, 109, [76, 40, 0]],
          [71, 85, [0, 38, 72]],
          [85, 71, [0, 38, 72]],
          [63, 109, [75, 164, 241]],
          [79, 219, [31, 120, 196]],
        ];
  const neonSize = rasterDpr === 1 ? 170 : 124;
  await page.setViewportSize({
    width: rasterDpr === 1 ? 1440 : 390,
    height: 900,
  });
  await page.goto(`${root}?cube=neon`);
  await ready();
  const actual = await page
    .locator(".cube-display .cube-net")
    .evaluate(async (svg, samples) => {
      const image = new Image();
      image.src = svg.querySelector("image").getAttribute("href");
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#101619";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      return {
        width: canvas.width,
        height: canvas.height,
        samples: samples.map(([x, y]) => [
          ...pixels.slice(
            (y * canvas.width + x) * 4,
            (y * canvas.width + x) * 4 + 3,
          ),
        ]),
      };
    }, samples);
  assert(
    actual.width === nativeBitmapSize[neonSize] * rasterDpr &&
      actual.height === actual.width,
    `Neon uses the approved ${neonSize}px bitmap at raster DPR ${rasterDpr}`,
  );
  samples.forEach(([, , expected], index) => {
    assert(
      actual.samples[index].every(
        (channel, i) => Math.abs(channel - expected[i]) <= 3,
      ),
      `Approved Neon color/glow sample ${index + 1}`,
    );
  });

  for (const width of [1440, 1000, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const style of ["flat", "neon", "cyber"]) {
      await page.goto(`${root}?cube=${style}`);
      await ready();
      const result = await page
        .locator(".cube-display .cube-net")
        .evaluate(async (svg) => {
          const width = svg.getBoundingClientRect().width;
          const image = new Image();
          image.src = svg.querySelector("image").getAttribute("href");
          await image.decode();
          const pattern = svg.querySelector("pattern"),
            line = pattern?.querySelector("rect");
          return {
            width,
            bitmapWidth: image.naturalWidth,
            bitmapHeight: image.naturalHeight,
            ready: svg.dataset.materialReady,
            noise: !!svg.querySelector("[data-screen-interference]"),
            pitch: pattern
              ? (Number(pattern.getAttribute("height")) * width) / 300
              : 0,
            thickness: line
              ? (Number(line.getAttribute("height")) * width) / 300
              : 0,
            opacity: line?.getAttribute("opacity"),
            phase: line ? (Number(line.getAttribute("y")) * width) / 300 : 0,
            animations: svg.querySelectorAll("animate,animateTransform").length,
            pointerEvents: getComputedStyle(svg.querySelector("image"))
              .pointerEvents,
          };
        });
      assert(
        result.ready === "true" && result.pointerEvents === "none",
        `${style}/${width}: material ready and pointer-safe`,
      );
      assert(
        result.width === (width > 1100 ? 170 : width > 760 ? 132 : 124),
        `${style}/${width}: native cube size retained`,
      );
      assert(
        result.bitmapWidth === nativeBitmapSize[result.width] * rasterDpr &&
          result.bitmapHeight === result.bitmapWidth,
        `${style}/${width}: correct canvas dimensions at raster DPR ${rasterDpr}`,
      );
      assert(
        result.noise === (style === "cyber"),
        `${style}/${width}: interference selected by preset`,
      );
      if (style === "cyber") {
        assert(
          Math.abs(result.pitch - 3.4) < 1e-9 &&
            Math.abs(result.thickness - 0.6) < 1e-9 &&
            Math.abs(result.phase - 0.7) < 1e-9 &&
            result.opacity === "0.18",
          `Cyber/${width}: exact screen-space band parameters`,
        );
        assert(
          result.animations === 0,
          `Cyber/${width}: static merged-master effect retained`,
        );
      }
    }
  }
  await page.getByRole("button", { name: "Choose cube finish" }).click();
  await ready();
  const icons = await page
    .locator(".cube-finish-preview .cube-net")
    .evaluateAll(async (nodes) =>
      Promise.all(
        nodes.map(async (svg) => {
          const image = new Image();
          image.src = svg.querySelector("image").getAttribute("href");
          await image.decode();
          return {
            width: svg.getBoundingClientRect().width,
            bitmapWidth: image.naturalWidth,
            bitmapHeight: image.naturalHeight,
          };
        }),
      ),
    );
  assert(
    icons.length === 3 && icons.every(({ width }) => width === 76),
    "All three 76px chooser previews render",
  );
  assert(
    icons.every(
      ({ bitmapWidth, bitmapHeight }) =>
        bitmapWidth === nativeBitmapSize[76] * rasterDpr &&
        bitmapHeight === bitmapWidth,
    ),
    `All chooser bitmaps use raster DPR ${rasterDpr}`,
  );
  return { passed: checks.length, checks };
};
