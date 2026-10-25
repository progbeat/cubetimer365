import { waitForStorage } from "./browser-storage-helpers.js";

export default async (page) => {
  const root = `${new URL(page.url()).origin}/cubetimer365/`;
  const fixtures = [
    [],
    [1.48],
    [
      1.45, 1.75, 1.74, 1.45, 4.6, 2.9, 1.62, 0.88, 0.72, 0.66, 0.66, 0.86,
      0.64, 0.72,
    ],
    [
      3599.35, 7200.49, 4200.25, 5400.59, 3999.5, 6200.75, 4300.35, 5900.25,
      3700.35, 4900.1, 5100.25, 6800.5, 4400.7, 5800.3,
    ],
    [99999.48],
  ];
  const bounds = new Map();
  let passed = 0;
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
    passed += 1;
  };
  for (const history of fixtures) {
    for (const width of [320, 390, 760, 761, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(root);
      await waitForStorage(page);
      await page.evaluate(
        (history) =>
          localStorage.setItem(
            "cubetimer365:daily-history:v1",
            JSON.stringify({
              version: 1,
              date: new Date().toISOString().slice(0, 10),
              history,
              legacyMigration: "ignored",
            }),
          ),
        history,
      );
      await page.reload();
      await waitForStorage(page);
      await page.evaluate(() => document.fonts.ready);
      if (history.length === 0) {
        const empty = await page.locator(".empty-chart").evaluate((el) => ({
          background: getComputedStyle(el).backgroundImage,
          overflow: document.documentElement.scrollWidth > innerWidth,
        }));
        assert(
          (empty.background.match(/linear-gradient/g) || []).length === 1 &&
            !empty.background.includes("90deg"),
          "Empty charts also keep only horizontal guides",
        );
        assert(!empty.overflow, "Empty charts fit every viewport");
        continue;
      }
      await page.locator(".recharts-yAxis text").first().waitFor();
      const m = await page.evaluate(() => {
        const panel = document.querySelector(".chart-panel");
        const plot = panel.querySelector(".chart-plot").getBoundingClientRect();
        const svg = panel
          .querySelector(".recharts-surface")
          .getBoundingClientRect();
        const clip = panel.querySelector("clipPath rect");
        const grid = {
          left: svg.left + Number(clip.getAttribute("x")),
          right:
            svg.left +
            Number(clip.getAttribute("x")) +
            Number(clip.getAttribute("width")),
          top: svg.top + Number(clip.getAttribute("y")),
        };
        const legend = panel
          .querySelector(".chart-legend")
          .getBoundingClientRect();
        const heading = panel
          .querySelector(".panel-heading")
          .getBoundingClientRect();
        return {
          docWidth: document.documentElement.scrollWidth,
          axis: grid.left - plot.left,
          plotLeft: plot.left,
          gridLeft: grid.left,
          gridRight: grid.right,
          gridTop: grid.top,
          legendBottom: legend.bottom,
          plotTop: plot.top,
          plotBottom: plot.bottom,
          plotRight: plot.right,
          navCount: document.querySelectorAll(".mobile-nav").length,
          legendRight: legend.right,
          headingRight: heading.right,
          ticks: [...panel.querySelectorAll(".recharts-yAxis text")].map(
            (el) => {
              const box = el.getBoundingClientRect();
              return {
                text: el.textContent,
                left: box.left,
                right: box.right,
                top: box.top,
                bottom: box.bottom,
                fill: getComputedStyle(el).fill,
              };
            },
          ),
          guides: [
            ...panel.querySelectorAll(
              ".recharts-cartesian-grid-horizontal line",
            ),
          ].map((line) => ({
            label: line.getAttribute("data-guide-label"),
            left: line.getBoundingClientRect().left,
          })),
          verticalLines: panel.querySelectorAll(
            ".recharts-cartesian-grid-vertical line, .recharts-cartesian-axis-line",
          ).length,
          timeColors: [
            ...document.querySelectorAll(
              ".history-table tbody td:nth-child(2), .history-best .best-single-value",
            ),
          ].map((cell) => getComputedStyle(cell).color),
          timeStroke: panel.querySelector(".recharts-area-curve")
            ? getComputedStyle(panel.querySelector(".recharts-area-curve"))
                .stroke
            : null,
          legendColor: getComputedStyle(panel.querySelector(".solve-key"))
            .backgroundColor,
          timeDots: [...panel.querySelectorAll(".recharts-area-dot")].filter(
            (dot) => getComputedStyle(dot).fill === "rgb(243, 245, 246)",
          ).length,
          gradients: panel.querySelectorAll("linearGradient").length,
          saved: JSON.parse(
            localStorage.getItem("cubetimer365:daily-history:v1"),
          ).history,
        };
      });
      assert(m.docWidth <= width, "The chart does not overflow the page");
      assert(
        m.legendRight === m.headingRight,
        "The legend remains right-aligned",
      );
      assert(
        JSON.stringify(m.saved) === JSON.stringify(history),
        "Axis resizing preserves recorded solves",
      );
      assert(
        m.ticks.every(
          (t) => Math.abs(t.left - m.plotLeft) < 1 && t.right <= m.gridRight,
        ),
        "Fractional and long labels stay left-aligned without moving the data",
      );
      assert(
        m.gridTop - m.legendBottom >= 12 && m.gridTop - m.legendBottom <= 16,
        "Legend and grid keep a compact gap on every screen",
      );
      assert(
        m.ticks.every((t) => t.top >= m.plotTop && t.bottom <= m.plotBottom),
        "Upper and lower time labels fit inside the chart",
      );
      assert(
        Math.abs(m.axis - 8) < 1 && Math.abs(m.plotRight - m.gridRight - 8) < 1,
        "Every screen uses fixed 8px plot margins",
      );
      const geometry = [m.gridLeft - m.plotLeft, m.plotRight - m.gridRight];
      if (bounds.has(width))
        assert(
          geometry.every(
            (value, i) => Math.abs(value - bounds.get(width)[i]) < 1,
          ),
          "Label length cannot move the data boundaries",
        );
      else bounds.set(width, geometry);
      assert(
        m.ticks.every((t) => t.fill === "rgb(202, 212, 220)"),
        "Time labels retain the brighter contrast on every screen",
      );
      assert(
        m.guides.length > 0 &&
          m.guides.every((line) => {
            const tick = m.ticks.find((t) => t.text === line.label);
            return tick && Math.abs(line.left - tick.right - 6) < 1;
          }),
        "Each horizontal guide starts after its own label with a 6px gap",
      );
      assert(
        m.verticalLines === 0,
        "The chart has no vertical grid or axis line",
      );
      assert(
        m.timeColors.every((color) => color === "rgb(243, 245, 246)") &&
          (history.length === 1
            ? m.timeStroke === null
            : m.timeStroke === "rgb(243, 245, 246)") &&
          m.legendColor === "rgb(243, 245, 246)" &&
          m.timeDots === history.length,
        "Time uses the same light color in rows, Best, curve, dots and legend",
      );
      assert(m.gradients >= 3, "Series retain their soft gradient fills");
      assert(
        m.navCount === 0,
        "No obsolete mobile navigation obscures the chart",
      );
      if (history.length === 1 && history[0] < 2) {
        assert(
          m.ticks.some((t) => t.text === "1.75s"),
          "Single-solve fractional ticks stay readable",
        );
      }
    }
  }
  return { passed };
};
