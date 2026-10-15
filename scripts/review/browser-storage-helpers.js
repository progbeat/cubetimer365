export async function waitForStorage(page) {
  await page.locator(".history-panel").waitFor();
  await page.getByText("Saved on this device", { exact: true }).waitFor();
}
