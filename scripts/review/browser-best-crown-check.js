import { waitForStorage } from "./browser-storage-helpers.js";

export default async (page) => {
  let passed = 0;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    passed += 1;
  };
  const root = page.url();
  await waitForStorage(page);
  await page.evaluate(() => {
    localStorage.setItem(
      "cubetimer365:daily-history:v1",
      JSON.stringify({
        version: 1,
        date: new Date().toISOString().slice(0, 10),
        history: Array.from({ length: 18 }, (_, i) => 12.34 + (i % 7)),
        legacyMigration: "ignored",
      }),
    );
  });
  await page.goto(root);
  await waitForStorage(page);
  await page.evaluate(() => document.fonts.ready);
  const saved = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const crown = page.getByRole("img", { name: "Today's best", exact: true });
    assert(
      (await page
        .getByRole("rowheader", { name: "Today's best", exact: true })
        .count()) === 1,
      "The summary row retains its accessible daily-best label",
    );
    assert(
      (await page.locator(".history-best button").count()) === 0,
      "The crown is informative, not a button",
    );
    const shape = await crown.evaluate((el) => {
      const svg = el.querySelector("svg"),
        box = svg.getBoundingClientRect();
      return {
        size: [box.width, box.height],
        stroke: svg.getAttribute("stroke-width"),
        fill: svg.getAttribute("fill"),
        neutral:
          getComputedStyle(el).color ===
          getComputedStyle(el.closest("th")).color,
        column: el.closest("th").getBoundingClientRect().width,
      };
    });
    assert(
      shape.size.every((n) => n === 16) &&
        shape.stroke === "1.5" &&
        shape.fill === "none",
      "Outline crown matches the existing 16 px / 1.5 stroke icon system",
    );
    assert(
      shape.neutral && shape.column <= 44.5,
      "Neutral crown fits the compact number column",
    );
    assert(
      (await crown.getAttribute("tabindex")) === "0",
      "Crown tooltip is keyboard reachable",
    );
    await crown.hover();
    const tooltip = page.getByRole("tooltip");
    await tooltip.waitFor({ state: "visible" });
    assert(
      (await tooltip.textContent()).trim() === "Today's best",
      "Hover shows the exact requested tooltip",
    );
    const bounds = await tooltip.boundingBox();
    assert(
      bounds.x >= 0 &&
        bounds.x + bounds.width <= width &&
        bounds.y >= 0 &&
        bounds.y + bounds.height <= 900,
      "Tooltip stays within the viewport and outside table clipping",
    );
    const value = await page
      .locator(".history-best-value")
      .first()
      .evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rect = range.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      });
    assert(
      bounds.y + bounds.height <= value.top || bounds.y >= value.bottom,
      "Tooltip leaves the daily best value readable",
    );
    await page.mouse.move(1, 1);
    await tooltip.waitFor({ state: "hidden" });
    await page.locator(".timer-surface").focus();
    await page.keyboard.press("Tab");
    assert(
      await crown.evaluate((el) => el === document.activeElement),
      "Tab reaches the informational crown in document order",
    );
    await tooltip.waitFor({ state: "visible" });
    assert(
      await crown.evaluate(
        (el) =>
          el.matches(":focus-visible") &&
          getComputedStyle(el).outlineStyle !== "none",
      ),
      "Keyboard focus has a visible outline",
    );
    const description = await crown.getAttribute("aria-describedby");
    assert(
      description === (await tooltip.getAttribute("id")),
      "The visible tooltip describes the focused crown",
    );
    await page.keyboard.press("Escape");
    await tooltip.waitFor({ state: "hidden" });
    assert(
      await crown.evaluate((el) => el === document.activeElement),
      "Escape dismisses the tooltip without moving focus",
    );
    await page.keyboard.down("Space");
    await page.waitForTimeout(350);
    await page.keyboard.up("Space");
    await page.keyboard.press("Enter");
    assert(
      await page
        .locator(".timer-panel")
        .evaluate((el) => el.classList.contains("idle")),
      "Space/Enter on the information mark do not arm or start the timer",
    );
    await page.keyboard.press("Tab");
    assert(
      await page
        .locator("tbody .delete-solve")
        .first()
        .evaluate((el) => el === document.activeElement),
      "Tab continues to the first recorded solve action",
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Crown and tooltip cause no horizontal overflow",
    );
  }
  assert(
    (await page.evaluate(() => JSON.stringify({ ...localStorage }))) === saved,
    "Tooltip interaction leaves all stored history and settings unchanged",
  );
  return { passed };
};
