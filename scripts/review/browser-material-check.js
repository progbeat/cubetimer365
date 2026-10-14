export default async (page) => {
  const root = `${new URL(page.url()).origin}/cubetimer365/`;
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
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

  await page.goto(`${root}?cube=neon`);
  await ready();
  // These samples come from the approved render, not a second implementation
  // of the material formula. The matte is normalized for transparent SVG use.
  const samples = [
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
  ];
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
        samples: samples.map(([x, y]) => [
          ...pixels.slice(
            (y * canvas.width + x) * 4,
            (y * canvas.width + x) * 4 + 3,
          ),
        ]),
      };
    }, samples);
  assert(
    actual.width === 192,
    "Neon uses the expected 170px cube plus glow margins",
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
        .evaluate((svg) => {
          const width = svg.getBoundingClientRect().width;
          const pattern = svg.querySelector("pattern"),
            line = pattern?.querySelector("rect");
          return {
            width,
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
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().width));
  assert(
    icons.length === 3 && icons.every((width) => width === 76),
    "All three 76px chooser previews render",
  );
  return { passed: checks.length, checks };
};
