export default async (page) => {
  const checks = [];
  const assert = (pass, name) => {
    if (!pass) throw new Error(name);
    checks.push(name);
  };
  const history = () =>
    page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("cubetimer365:daily-history:v1") || "null",
        )?.history || [],
    );
  const state = () => page.locator(".timer-status").textContent();
  await page.evaluate(() => {
    localStorage.setItem(
      "cubetimer365:daily-history:v1",
      JSON.stringify({
        version: 1,
        date: new Date().toISOString().split("T")[0],
        history: JSON.parse("[]"),
        legacyMigration: "ignored",
      }),
    );
  });
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1120 });
  await page.waitForTimeout(150);
  await page.keyboard.down("Space");
  assert(
    (await state()).includes("Keep holding"),
    "Space down holds without starting",
  );
  await page.waitForTimeout(360);
  assert(
    (await state()).includes("Ready ·"),
    "Space becomes ready after 300ms",
  );
  await page.keyboard.up("Space");
  await page.waitForTimeout(240);
  assert((await state()).includes("Solving"), "Space release starts");
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  assert(
    (await history()).length === 1 && !(await state()).includes("Solving"),
    "Space stop and release save exactly once",
  );
  await page.waitForTimeout(220);
  await page.keyboard.down("Space");
  await page.waitForTimeout(360);
  await page.keyboard.up("Space");
  await page.waitForTimeout(240);
  await page.keyboard.down("Space");
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  assert(
    (await history()).length === 2 && !(await state()).includes("Solving"),
    "Repeated keyboard lifecycle and key repeat safe",
  );
  await page.reload();
  assert((await history()).length === 2, "History survives reload");
  await page
    .getByRole("button", { name: "Delete solve 1", exact: true })
    .click();
  await page.reload();
  assert((await history()).length === 1, "Deletion survives reload");
  const deleteControl = page.getByRole("button", {
    name: "Delete solve 1",
    exact: true,
  });
  await deleteControl.focus();
  await page.keyboard.press("Space");
  assert(
    (await history()).length === 0 && !(await state()).includes("Solving"),
    "Space on delete activates control without starting timer",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".timer-surface").scrollIntoViewIfNeeded();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const box = await page.locator(".timer-surface").boundingBox();
  const x = Math.round(box.x + box.width / 2),
    y = Math.round(box.y + box.height / 2);
  const touch = async (type, points) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const p = { x, y, id: 1 };
  await touch("touchStart", [p]);
  await page.waitForTimeout(80);
  await touch("touchEnd", []);
  assert(
    !(await state()).includes("Solving") && (await history()).length === 0,
    "Actual touch early release cancels",
  );
  await touch("touchStart", [p]);
  await page.waitForTimeout(360);
  assert(
    (await state()).includes("Ready ·"),
    "Actual touch hold reaches visible ready",
  );
  await page.screenshot({ path: "output/playwright/mobile-ready.png" });
  await touch("touchEnd", []);
  await page.waitForTimeout(240);
  assert((await state()).includes("Solving"), "Actual touch release starts");
  await touch("touchStart", [p]);
  assert(
    (await history()).length === 1,
    "Actual touch first contact stops immediately",
  );
  await touch("touchEnd", []);
  assert(
    !(await state()).includes("Solving"),
    "Actual touch stopping release does not restart",
  );
  await page.waitForTimeout(220);
  await touch("touchStart", [p]);
  await page.waitForTimeout(360);
  await touch("touchCancel", []);
  assert(
    !(await state()).includes("Ready ·") &&
      !(await state()).includes("Solving"),
    "Actual touch cancellation resets hold",
  );
  await touch("touchStart", [p]);
  await page.waitForTimeout(360);
  await touch("touchMove", [{ ...p, y: y + 30 }]);
  await touch("touchEnd", []);
  assert(
    !(await state()).includes("Solving"),
    "Actual touch drag cancels attempt",
  );
  await page.locator(".timer-surface").scrollIntoViewIfNeeded();
  const next = await page.locator(".timer-surface").boundingBox();
  const p1 = { x: Math.round(next.x + 100), y: Math.round(next.y + 80), id: 1 };
  const p2 = { x: p1.x + 40, y: p1.y, id: 2 };
  await touch("touchStart", [p1]);
  await page.waitForTimeout(360);
  await touch("touchStart", [p1, p2]);
  await touch("touchEnd", [p2]);
  assert(
    !(await state()).includes("Solving"),
    "Second finger release does not start",
  );
  await touch("touchEnd", []);
  await page.waitForTimeout(240);
  assert((await state()).includes("Solving"), "Original finger release starts");
  await touch("touchStart", [p1]);
  await touch("touchEnd", []);
  assert((await history()).length === 2, "Repeated touch lifecycle saves once");
  await page.waitForTimeout(220);
  await touch("touchStart", [p1]);
  await page.waitForTimeout(360);
  await page.setViewportSize({ width: 844, height: 390 });
  await touch("touchEnd", []);
  assert(
    !(await state()).includes("Solving"),
    "Orientation resize cancels unstarted hold",
  );
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.detach();
  await page.setViewportSize({ width: 1440, height: 1120 });
  await page.waitForTimeout(150);
  await page.reload();
  await page.keyboard.down("Space");
  await page.waitForTimeout(80);
  await page.keyboard.up("Space");
  assert(
    !(await state()).includes("Solving"),
    "Actual keyboard early release cancels",
  );
  await page.keyboard.down("Space");
  await page.waitForTimeout(360);
  await page.keyboard.press("Escape");
  await page.keyboard.up("Space");
  assert(
    !(await state()).includes("Solving"),
    "Escape cancels keyboard readiness",
  );
  await page.keyboard.down("Space");
  await page.waitForTimeout(360);
  await page.keyboard.up("Space");
  await page.keyboard.press("a");
  assert(
    (await state()).includes("Solving"),
    "Any-key stop honors 200ms start debounce",
  );
  await page.waitForTimeout(230);
  await page.keyboard.press("a");
  assert(
    !(await state()).includes("Solving") && (await history()).length === 3,
    "Any key stops after debounce",
  );
  for (const width of [320, 390, 760, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const measures = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      timer: document.querySelector(".timer-digits").getBoundingClientRect()
        .width,
      surface: document.querySelector(".timer-surface").getBoundingClientRect()
        .width,
    }));
    assert(
      measures.scroll === measures.width && measures.timer <= measures.surface,
      `No overflow at ${width}px`,
    );
  }
  return { passed: checks.length, checks, localOrigin: page.url() };
};
