import { StrictMode } from "react";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AnalyticsPrivacy from "./AnalyticsPrivacy";

vi.hoisted(() => {
  vi.stubEnv(
    "VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN",
    "0123456789abcdef0123456789abcdef",
  );
  vi.stubEnv("PROD", true);
});
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  document
    .querySelectorAll("script[data-cf-beacon]")
    .forEach((script) => script.remove());
  localStorage.clear();
});
it("keeps an honest privacy notice without Google or consent controls and preserves local data", async () => {
  localStorage.setItem("history", "[12.34]");
  localStorage.setItem("cube-style", "neon");
  const saved = { ...localStorage };
  const { rerender } = render(
    <StrictMode>
      <MantineProvider>
        <AnalyticsPrivacy />
      </MantineProvider>
    </StrictMode>,
  );
  expect(
    screen.queryByRole("button", { name: "Allow analytics" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "No thanks" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Privacy & analytics" }));
  expect(
    await screen.findByRole("dialog", { name: "Privacy notice" }),
  ).toBeVisible();
  expect(
    screen.getByText("Visit analytics is enabled through Cloudflare."),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Cloudflare privacy" }),
  ).toHaveAttribute("href", "https://www.cloudflare.com/web-analytics/");
  expect(
    screen.getByText(/Your daily results are saved in this browser/),
  ).toBeVisible();
  expect(screen.getByText(/including your IP address/)).toBeVisible();
  expect(
    screen.queryByText(
      /Google Analytics|has been removed|version of the site|not configured/,
    ),
  ).not.toBeInTheDocument();
  for (const name of ["Local data", "Analytics", "Your choices"]) {
    expect(screen.getByRole("heading", { name })).toBeVisible();
  }
  expect({ ...localStorage }).toEqual(saved);
  rerender(
    <StrictMode>
      <MantineProvider>
        <AnalyticsPrivacy />
      </MantineProvider>
    </StrictMode>,
  );
  expect(document.querySelectorAll("script[data-cf-beacon]")).toHaveLength(1);
});
