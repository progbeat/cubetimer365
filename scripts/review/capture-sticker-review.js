async (page) => {
  await page.setViewportSize({width:1420,height:1050}); await page.waitForTimeout(150);
  await page.locator('#front-pair').screenshot({path:'output/playwright/sticker-material-front-review.png'});
  await page.locator('#side-pair').screenshot({path:'output/playwright/sticker-material-side-review.png'});
  await page.screenshot({path:'output/playwright/sticker-material-comparison-review.png',fullPage:true});
}
