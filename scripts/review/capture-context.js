async (page) => {
  await page.goto('http://127.0.0.1:5173/cubetimer365/');
  // Isolated localhost sample history for visual review only; no production data is used.
  await page.evaluate(()=>{localStorage.setItem('today',new Date().toISOString().split('T')[0]);localStorage.setItem('history',JSON.stringify([19.98,20.38,19.50,20.12,19.31,21.08,19.95,18.43,20.05,18.94,19.32]));});
  await page.reload(); await page.setViewportSize({width:1440,height:1160}); await page.waitForTimeout(150);
  await page.keyboard.down('Space'); await page.waitForTimeout(360); await page.keyboard.up('Space');
  if(!(await page.locator('.timer-status').textContent()).includes('Solving')) throw new Error('Preview timer did not start');
  await page.waitForTimeout(18420); await page.keyboard.down('Space'); await page.keyboard.up('Space');
  if((await page.locator('.timer-status').textContent()).includes('Solving')) throw new Error('Preview timer did not stop');
  if((await page.evaluate(()=>JSON.parse(localStorage.getItem('history')))).length !== 12) throw new Error('Preview history count incorrect');
  await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(300);
  if(await page.locator('thead th').count() !== 3) throw new Error('History must have exactly index/time/delete');
  await page.screenshot({path:'output/playwright/cyber-precision-desktop.png'});
  await page.setViewportSize({width:390,height:844}); await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'})); await page.waitForTimeout(100);
  await page.screenshot({path:'output/playwright/cyber-precision-mobile.png'});
  await page.getByRole('link',{name:'History',exact:true}).click(); await page.waitForTimeout(600);
  await page.screenshot({path:'output/playwright/cyber-precision-mobile-history.png'});
  await page.setViewportSize({width:320,height:740}); await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'})); await page.waitForTimeout(100);
  await page.screenshot({path:'output/playwright/cyber-precision-mobile-320.png'});
  await page.goto('http://127.0.0.1:5173/cubetimer365/output/playwright/cyber-fidelity.html');
  await page.setViewportSize({width:1320,height:1120}); await page.waitForTimeout(150);
  await page.screenshot({path:'output/playwright/cyber-precision-comparison.png'});
  return {sampleData:true,desktop:[1440,1160],phone:[390,844],comparison:[1320,1120],liveComponentComparison:true};
}
