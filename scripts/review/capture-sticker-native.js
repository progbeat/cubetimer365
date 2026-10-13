async (page) => {
  await page.setViewportSize({width:900,height:400}); await page.waitForTimeout(150);
  for(const id of ['ref-front','front','ref-side','side']) await page.locator(`#${id}`).screenshot({path:`output/playwright/sticker-material-${id}-native.png`});
  return {stage:'two isolated stickers',runtimeCubeChanged:false};
}
