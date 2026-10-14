export default async (page) => {
  const root = `${new URL(page.url()).origin}/cubetimer365/`;
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const history = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("history") || "[]"));
  const solving = async () =>
    (await page.locator(".timer-status").textContent()).includes("Solving");
  const reset = async () => {
    await page.goto(root);
    await page.evaluate(() => {
      localStorage.setItem("today", new Date().toISOString().split("T")[0]);
      localStorage.setItem("history", "[12]");
    });
    await page.reload();
    await page.locator(".timer-surface").waitFor();
  };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const contact = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const point = async (selector) => {
    if (!selector) return { x: 3, y: 3, id: 1 };
    const target = page.locator(selector);
    await target.scrollIntoViewIfNeeded();
    const bounds = await target.boundingBox();
    return {
      x: Math.round(bounds.x + bounds.width / 2),
      y: Math.round(bounds.y + bounds.height / 2),
      id: 1,
    };
  };
  const start = async (savedCount = 1) => {
    await contact("touchStart", [await point(".timer-surface")]);
    await page.waitForTimeout(360);
    await contact("touchEnd", []);
    assert(
      await solving(),
      "The starting release and compatibility click keep the solve running",
    );
    assert(
      (await history()).length === savedCount,
      "The starting interaction never saves a solve",
    );
  };
  try {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [name, selector] of [
        ["timer", ".timer-surface"],
        ["whitespace", null],
        ["scramble", ".scramble-content"],
        ["cube control", ".cube-style-trigger"],
        ["delete control", 'button[aria-label="Delete solve 1"]'],
        ["navigation link", 'a[href="#history"]'],
      ]) {
        await reset();
        await start();
        await page.waitForTimeout(250);
        const stoppingPoint = await point(selector);
        await contact("touchStart", [stoppingPoint]);
        await page.waitForFunction(
          () =>
            JSON.parse(localStorage.getItem("history") || "[]").length === 2,
        );
        assert(
          !(await solving()),
          `${name}/${width}: first contact stops anywhere on the page`,
        );
        await page.waitForTimeout(350);
        await contact("touchEnd", []);
        await page.waitForTimeout(80);
        assert(
          (await history()).length === 2 &&
            (await history())[0] === 12 &&
            !(await solving()),
          `${name}/${width}: hold/release cannot restart or save twice`,
        );
        assert(
          !(await page.locator(".cube-finish-popover").isVisible()) &&
            new URL(page.url()).hash === "",
          `${name}/${width}: the stopping gesture does not open controls or follow links`,
        );
        // Exercise delayed/duplicate compatibility clicks separately from the
        // native sequence, including when stopping scrolls the page back up.
        await page.evaluate((selector) => {
          const target = document.querySelector(selector || ".app-layout");
          for (let n = 0; n < 2; n++)
            target.dispatchEvent(
              new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                detail: 1,
              }),
            );
        }, selector);
        assert(
          (await history()).length === 2 &&
            !(await page.locator(".cube-finish-popover").isVisible()) &&
            new URL(page.url()).hash === "",
          `${name}/${width}: compatibility clicks are consumed`,
        );
        await contact("touchStart", [await point(".cube-style-trigger")]);
        await contact("touchEnd", []);
        await page
          .locator(".cube-finish-popover")
          .waitFor({ state: "visible" });
        assert(
          (await history()).length === 2,
          `${name}/${width}: the next physical tap uses controls normally`,
        );
      }
    }
    await reset();
    await start();
    await contact("touchStart", [{ x: 3, y: 3, id: 1 }]);
    await contact("touchEnd", []);
    assert(
      (await history()).length === 2 && !(await solving()),
      "A rapid second tap saves immediately without a debounce dead zone",
    );
    await page.waitForTimeout(220);
    await start(2);
    await page.waitForTimeout(250);
    const first = await point(".cube-style-trigger");
    const second = { x: 3, y: 3, id: 2 };
    await contact("touchStart", [first]);
    await contact("touchStart", [first, second]);
    await contact("touchEnd", [second]);
    await contact("touchEnd", []);
    assert(
      (await history()).length === 3 && !(await solving()),
      "Additional fingers during the stopping gesture do not create another solve",
    );
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await reset();
    await page.keyboard.down("Space");
    await page.waitForTimeout(360);
    await page.keyboard.up("Space");
    await page.waitForTimeout(250);
    await page.getByRole("button", { name: "Choose cube finish" }).click();
    assert(
      await solving(),
      "A desktop mouse click on a control does not stop a running solve",
    );
    await page.keyboard.press("Escape");
    assert(
      await solving(),
      "Desktop Escape first closes an open finish picker",
    );
    await page.locator(".timer-surface").focus();
    await page.keyboard.press("Escape");
    assert(
      !(await solving()) && (await history()).length === 1,
      "Desktop Escape still cancels without saving",
    );
    return { passed: checks.length, checks };
  } finally {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await cdp.detach();
  }
};
