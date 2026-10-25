import { waitForStorage } from "./browser-storage-helpers.js";

export default async (page) => {
  const root = `${new URL(page.url()).origin}/cubetimer365/`;
  const fixtures = [
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
      await page.locator(".recharts-yAxis text").first().waitFor();
      const m = await page.evaluate(() => {
        const panel = document.querySelector(".chart-panel");
        const plot = panel.querySelector(".chart-plot").getBoundingClientRect();
        const grid = panel
          .querySelector(".recharts-cartesian-grid")
          .getBoundingClientRect();
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
          legendRight: legend.right,
          headingRight: heading.right,
          ticks: [...panel.querySelectorAll(".recharts-yAxis text")].map(
            (el) => {
              const box = el.getBoundingClientRect();
              return { text: el.textContent, left: box.left, right: box.right };
            },
          ),
          saved: JSON.parse(
            localStorage.getItem("cubetimer365:daily-history:v1"),
          ).history,
        };
      });
      assert(m.docWidth <= width, "Compact chart does not overflow the page");
      assert(
        m.legendRight === m.headingRight,
        "The legend remains right-aligned",
      );
      assert(
        JSON.stringify(m.saved) === JSON.stringify(history),
        "Axis resizing preserves recorded solves",
      );
      if (width <= 760) {
        assert(
          m.ticks.every(
            (t) => t.left >= m.plotLeft && t.right <= m.gridLeft - 2,
          ),
          "Fractional and long labels fit the external gutter",
        );
        if (history[0] < 10000)
          assert(
            m.axis < 50,
            "Normal and hour-long solves reclaim chart width",
          );
      } else {
        assert(
          Math.abs(m.axis - 60) < 1,
          "Desktop keeps its original axis spacing",
        );
      }
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
