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
  const appScripts = new Set();
  const scriptParsed = ({ scriptId, url }) => {
    if (url.startsWith(root)) appScripts.add(scriptId);
  };
  cdp.on("Debugger.scriptParsed", scriptParsed);
  await cdp.send("Debugger.enable");
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const contact = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const scrollBlockers = async () => {
    const objectGroup = "mobile-stop-listeners";
    const { result } = await cdp.send("Runtime.evaluate", {
      expression: "window",
      objectGroup,
    });
    const { listeners } = await cdp.send("DOMDebugger.getEventListeners", {
      objectId: result.objectId,
    });
    await cdp.send("Runtime.releaseObjectGroup", { objectGroup });
    return listeners.filter(
      // Locator use also installs Playwright's own global hit-testing listeners.
      ({ type, passive, scriptId }) =>
        appScripts.has(scriptId) &&
        ["touchstart", "touchmove"].includes(type) &&
        !passive,
    ).length;
  };
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
        if (name === "timer") {
          assert(
            (await scrollBlockers()) === 0,
            `${width}: idle browsing has no global non-passive scroll listeners`,
          );
        }
        await start();
        await page.waitForTimeout(250);
        const stoppingPoint = await point(selector);
        await contact("touchStart", [stoppingPoint]);
        await page.waitForFunction(
          () =>
            JSON.parse(localStorage.getItem("history") || "[]").length === 2,
        );
        if (name === "timer") {
          assert(
            (await scrollBlockers()) > 0,
            `${width}: scroll blockers exist only during the consumed stop`,
          );
        }
        assert(
          !(await solving()),
          `${name}/${width}: first contact stops anywhere on the page`,
        );
        await page.waitForTimeout(350);
        await contact("touchEnd", []);
        await page.waitForTimeout(80);
        if (name === "timer") {
          assert(
            (await scrollBlockers()) === 0,
            `${width}: all scroll blockers are removed on final touch release`,
          );
        }
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
    for (const ending of ["touchCancel", "blur", "resize"]) {
      await reset();
      await start();
      await contact("touchStart", [await point(".cube-style-trigger")]);
      await page.waitForFunction(
        () => JSON.parse(localStorage.getItem("history") || "[]").length === 2,
      );
      assert(
        (await scrollBlockers()) > 0,
        `${ending}: stop gesture initially has scroll blockers`,
      );
      if (ending !== "touchCancel") {
        await page.evaluate(
          (type) => window.dispatchEvent(new Event(type)),
          ending,
        );
        await contact("touchEnd", []);
      } else {
        await contact("touchCancel", []);
      }
      await page.waitForTimeout(80);
      assert(
        (await scrollBlockers()) === 0 && (await history()).length === 2,
        `${ending}: canceled/interrupted gestures remove scroll blockers without another save`,
      );
      await page.locator(".cube-style-trigger").evaluate((target) => {
        for (let n = 0; n < 2; n++)
          target.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              detail: 1,
            }),
          );
      });
      assert(
        (await history()).length === 2 &&
          !(await solving()) &&
          !(await page.locator(".cube-finish-popover").isVisible()),
        `${ending}: delayed compatibility clicks still cannot activate controls`,
      );
      await contact("touchStart", [await point(".cube-style-trigger")]);
      await contact("touchEnd", []);
      await page.locator(".cube-finish-popover").waitFor({ state: "visible" });
      assert(
        (await history()).length === 2 && !(await solving()),
        `${ending}: the next independent tap uses controls normally`,
      );
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
    for (const input of ["keyboard", "touch"]) {
      await reset();
      let held = { x: 3, y: 3, id: 1 };
      if (input === "keyboard") {
        await contact("touchStart", [held]);
        await page.locator(".timer-surface").focus();
        await page.keyboard.down("Space");
        await page.waitForTimeout(360);
        await page.keyboard.up("Space");
      } else {
        const starting = await point(".timer-surface");
        held = { ...held, id: 2 };
        await contact("touchStart", [starting]);
        await page.waitForTimeout(360);
        await contact("touchStart", [starting, held]);
        // CDP touchEnd points identify the released contacts, not those retained.
        await contact("touchEnd", [starting]);
      }
      assert(
        await solving(),
        `${input}: solve starts with another finger held`,
      );
      assert(
        (await history()).length === 1,
        `${input}: retained finger does not save on start`,
      );
      const stopping = { ...(await point(".cube-style-trigger")), id: 3 };
      await contact("touchStart", [held, stopping]);
      assert(
        (await history()).length === 2 && !(await solving()),
        `${input}: non-primary contact stops and saves`,
      );
      assert(
        !(await page.locator(".cube-finish-popover").isVisible()),
        `${input}: non-primary stopping contact does not activate the control`,
      );
      await page.waitForTimeout(350);
      await contact("touchEnd", [stopping]);
      const later = { ...(await point(".cube-style-trigger")), id: 4 };
      await contact("touchStart", [held, later]);
      await contact("touchEnd", [later]);
      assert(
        (await history()).length === 2 &&
          !(await solving()) &&
          !(await page.locator(".cube-finish-popover").isVisible()),
        `${input}: later fingers remain consumed while the older finger is held`,
      );
      await contact("touchEnd", []);
      assert(
        (await history()).length === 2 && !(await solving()),
        `${input}: all releases cannot restart or save twice`,
      );
      await page.locator(".cube-style-trigger").evaluate((target) => {
        for (let n = 0; n < 2; n++)
          target.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              detail: 1,
            }),
          );
      });
      assert(
        (await history()).length === 2 &&
          !(await page.locator(".cube-finish-popover").isVisible()),
        `${input}: non-primary compatibility clicks are consumed`,
      );
      await contact("touchStart", [await point(".cube-style-trigger")]);
      await contact("touchEnd", []);
      await page.locator(".cube-finish-popover").waitFor({ state: "visible" });
      assert(
        (await history()).length === 2,
        `${input}: next independent tap uses controls normally`,
      );
    }
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
    cdp.off("Debugger.scriptParsed", scriptParsed);
    await cdp.send("Debugger.disable");
    await cdp.detach();
  }
};
