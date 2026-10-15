export async function interceptAnalytics(context) {
  const intercepted = [];
  await context.route(
    /^https:\/\/[^/]*(?:cloudflareinsights\.com|googletagmanager\.com|google-analytics\.com)\//,
    async (route) => {
      intercepted.push(route.request().url());
      await route.fulfill({ contentType: "application/javascript", body: "" });
    },
  );
  return { intercepted };
}
