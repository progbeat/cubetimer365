export default async (page) => {
  // Fixtures must never run on the hosted preview or a user's browser storage.
  const origin = new URL(page.url());
  if (!["127.0.0.1", "localhost"].includes(origin.hostname))
    throw new Error("Use an isolated localhost browser");
  const root = `${origin.origin}/cubetimer365/`;
  const checks = [];
  const assert = (value, label) => {
    if (!value) throw new Error(label);
    checks.push(label);
  };
  const state = () => page.locator(".timer-status").textContent();
  const history = () =>
    page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("cubetimer365:daily-history:v1") || "null",
        )?.history || [],
    );
  const reset = async () => {
    await page.goto(root);
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
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
  };
  const bodyFocus = async () =>
    page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  const start = async () => {
    await bodyFocus();
    await page.keyboard.down("Space");
    await page.waitForTimeout(340);
    await page.keyboard.up("Space");
    await page.waitForTimeout(240);
  };
  await reset();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await bodyFocus();
  await page.keyboard.down("Space");
  for (let i = 0; i < 4; i++) await page.keyboard.down("Space");
  await page.waitForTimeout(360);
  assert(
    (await page.evaluate(() => scrollY)) === 0,
    "Repeated Space keydowns do not scroll",
  );
  assert(
    (await state()).includes("Ready ·"),
    "Repeated Space preserves readiness hold",
  );
  await page.keyboard.up("Space");
  const measurements = [];
  for (let i = 0; i < 12; i++) {
    measurements.push(
      await page.locator(".timer-digits").evaluate((el) => ({
        width: el.getBoundingClientRect().width,
        x: el.getBoundingClientRect().x,
        slots: [...el.children].map((e) => e.getBoundingClientRect().x),
      })),
    );
    await page.waitForTimeout(40);
  }
  assert(
    measurements.every(
      (m) =>
        Math.abs(m.width - measurements[0].width) < 0.02 &&
        m.slots.every((x, i) => Math.abs(x - measurements[0].slots[i]) < 0.02),
    ),
    "Actual running digits retain width and every column position",
  );
  await page.keyboard.down("Space");
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  assert(
    (await history()).length === 1,
    "Stop/repeat/keyup saves exactly once",
  );
  assert(
    await page.evaluate(() => {
      const r = document
        .querySelector(".scramble-panel")
        .getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight && scrollY === 0;
    }),
    "Scramble stays visible after keyboard stop",
  );
  await page.waitForTimeout(220);
  await start();
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  await page.keyboard.press("Space");
  assert(
    await page.evaluate(() => {
      const r = document
        .querySelector(".scramble-panel")
        .getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    }),
    "Stopping from a scrolled view reveals the scramble",
  );
  assert(
    (await history()).length === 2,
    "Revealing scramble does not duplicate the solve",
  );
  for (const kind of [
    "input",
    "textarea",
    "contenteditable",
    "plaintext-only",
  ]) {
    await reset();
    await bodyFocus();
    await page.evaluate((kind) => {
      const e = document.createElement(
        kind === "input" || kind === "textarea" ? kind : "div",
      );
      e.id = "feedback-editable";
      e.style.cssText =
        "position:fixed;top:4px;left:4px;width:80px;z-index:9999";
      if (kind === "contenteditable" || kind === "plaintext-only") {
        e.setAttribute(
          "contenteditable",
          kind === "contenteditable" ? "" : "plaintext-only",
        );
        e.tabIndex = 0;
      }
      document.body.append(e);
    }, kind);
    await page.keyboard.down("Space");
    await page.waitForTimeout(340);
    await page.locator("#feedback-editable").focus();
    await page.keyboard.up("Space");
    assert(
      !(await state()).includes("Solving") &&
        !(await state()).includes("Ready ·"),
      `Focus into ${kind} cancels readiness`,
    );
    await page.keyboard.press("Space");
    const text = await page
      .locator("#feedback-editable")
      .evaluate((e) => ("value" in e ? e.value : e.textContent));
    assert(
      Boolean(text?.length) && !(await state()).includes("Solving"),
      `Space remains native editing in ${kind}`,
    );
    await page.locator("#feedback-editable").evaluate((e) => e.remove());
  }
  await reset();
  await bodyFocus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(340);
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await page.keyboard.up("Space");
  assert(
    !(await state()).includes("Solving"),
    "Window blur cancels keyboard readiness and stale keyup",
  );
  await start();
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await page.waitForTimeout(220);
  assert(
    (await state()).includes("Solving"),
    "Window blur keeps an already running solve",
  );
  await page.keyboard.press("a");
  assert(
    (await history()).length === 1,
    "Running solve after blur still stops and saves normally",
  );

  const widths = [];
  for (const width of [320, 390, 760, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const m = await page.locator(".timer-digits").evaluate((el) => {
      const clone = el.cloneNode(true);
      clone.style.cssText = "position:absolute;visibility:hidden";
      document.body.append(clone);
      const samples = [
        "00:00.00",
        "00:11.11",
        "00:88.88",
        "11:11.11",
        "88:88.88",
      ].map((value) => {
        [...clone.children].forEach((e, i) => (e.textContent = value[i]));
        return { value, width: clone.getBoundingClientRect().width };
      });
      clone.remove();
      return {
        samples,
        actual: el.getBoundingClientRect().width,
        surface: document
          .querySelector(".timer-surface")
          .getBoundingClientRect().width,
        scroll: document.documentElement.scrollWidth,
        viewport: innerWidth,
      };
    });
    assert(
      Math.max(...m.samples.map((s) => s.width)) -
        Math.min(...m.samples.map((s) => s.width)) <
        0.02,
      `Fixed numeric widths across all glyphs at ${width}px`,
    );
    assert(
      m.scroll === m.viewport && m.actual <= m.surface,
      `Responsive timer and no overflow at ${width}px`,
    );
    widths.push({ width, ...m });
  }

  const picker = () => page.getByRole("button", { name: "Choose cube finish" });
  const dialog = () => page.locator(".cube-finish-popover");
  const focusedTimer = () =>
    page.waitForFunction(() =>
      document.activeElement?.classList.contains("timer-surface"),
    );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await reset();
    assert(
      (await page.locator(".cube-finish-select").count()) === 0,
      `No permanent dropdown at ${width}px`,
    );
    await picker().focus();
    await page.keyboard.press("Space");
    await dialog().waitFor();
    assert(
      (await state()).includes("Ready for"),
      `Space opens cube popover without arming timer at ${width}px`,
    );
    assert(
      (await page
        .getByRole("button", { name: "Cyber · Round", exact: true })
        .getAttribute("aria-pressed")) === "true",
      `Opening preserves chosen style at ${width}px`,
    );
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await dialog().waitFor({ state: "hidden" });
    await focusedTimer();
    assert(
      (await page.locator(".cube-net--neon").count()) === 1,
      `Keyboard selection changes finish and closes at ${width}px`,
    );
    assert(
      (await history()).length === 0 && !(await state()).includes("Solving"),
      `Style selection preserves timer/history at ${width}px`,
    );
    await picker().focus();
    await page.keyboard.press("Space");
    await dialog().waitFor();
    await page.keyboard.press("Escape");
    await dialog().waitFor({ state: "hidden" });
    await focusedTimer();
    assert(
      (await page.locator(".cube-net--neon").count()) === 1,
      `Escape closes popover and restores timer focus/style at ${width}px`,
    );
    let cdp;
    const tap = async (target) => {
      if (width !== 390) {
        await target.click();
        return;
      }
      const b = await target.boundingBox();
      const p = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 };
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [p],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    };
    if (width === 390) {
      cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 1,
      });
    }
    await tap(picker());
    await dialog().waitFor();
    await tap(page.getByRole("button", { name: "Flat · Round", exact: true }));
    await dialog().waitFor({ state: "hidden" });
    assert(
      (await page.locator(".cube-net--flat").count()) === 1,
      `Click/tap selects Flat and closes at ${width}px`,
    );
    await tap(picker());
    await dialog().waitFor();
    await tap(page.getByRole("button", { name: "Cyber · Round", exact: true }));
    await dialog().waitFor({ state: "hidden" });
    assert(
      (await page.locator(".cube-net--cyber").count()) === 1,
      `Click/tap reopens and restores explicitly chosen Cyber at ${width}px`,
    );
    await tap(picker());
    await dialog().waitFor();
    const surface = await page.locator(".timer-surface").boundingBox();
    const outside = { x: surface.x + 24, y: surface.y + 24, id: 1 };
    if (width === 390) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [outside],
      });
    } else {
      await page.mouse.move(outside.x, outside.y);
      await page.mouse.down();
    }
    await page.waitForTimeout(360);
    if (width === 390) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await page.mouse.up();
    }
    await dialog().waitFor({ state: "hidden" });
    assert(
      !(await state()).includes("Solving") &&
        !(await state()).includes("Ready ·") &&
        (await history()).length === 0,
      `Long outside press closes picker without starting timer at ${width}px`,
    );
    if (cdp) {
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
      await cdp.detach();
    }
  }
  await page.goto(`${root}?cube-options`);
  assert(
    (await page.getByText("Original / Baseline", { exact: true }).count()) ===
      0 &&
      (await page
        .getByRole("link", { name: "Use Flat finish", exact: true })
        .count()) === 1,
    "Compare contains Flat/Neon/Cyber and omits Original Baseline",
  );
  await reset();
  const textures = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const bands = await page.locator("[data-scanlines]").evaluateAll((nodes) =>
      nodes.map((n) => ({
        id: n.dataset.scanlines,
        count: Number(n.dataset.bandCount),
        d: n.getAttribute("d"),
        opacity: Number(n.getAttribute("opacity")),
        clip:
          n.getAttribute("clip-path") ||
          n.parentElement.getAttribute("clip-path"),
      })),
    );
    assert(
      bands.length === 0 &&
        (await page.locator("[data-screen-interference]").count()) === 1,
      `Default Cyber uses one screen-space pass at ${width}px`,
    );
    assert(
      (await page
        .locator(".cube-display [filter], .cube-display feGaussianBlur")
        .count()) === 0,
      `Cyber remains crisp without blur at ${width}px`,
    );
    textures.push({ width, bands });
  }
  return {
    passed: checks.length,
    checks,
    widths,
    textures,
    localOrigin: page.url(),
  };
};
