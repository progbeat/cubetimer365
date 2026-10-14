import { StrictMode } from "react";
import { MantineProvider } from "@mantine/core";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AnalyticsPrivacy from "./AnalyticsPrivacy";
import { ANALYTICS_CONSENT_KEY } from "./analytics";

vi.hoisted(() => {
  vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TEST365");
  vi.stubEnv("BASE_URL", "/cubetimer365/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  localStorage.clear();
  document
    .querySelectorAll('script[src*="googletagmanager.com"]')
    .forEach((script) => script.remove());
});

it("requires an explicit choice and keeps Privacy available after refusal", async () => {
  localStorage.clear();
  const view = () => (
    <StrictMode>
      <MantineProvider>
        <AnalyticsPrivacy />
      </MantineProvider>
    </StrictMode>
  );
  const { rerender } = render(view());
  expect(screen.getByRole("button", { name: "Allow analytics" })).toBeVisible();
  expect(
    document.querySelector('script[src*="googletagmanager.com"]'),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "No thanks" }));
  expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
  expect(
    screen.queryByRole("button", { name: "Allow analytics" }),
  ).not.toBeInTheDocument();
  expect(
    document.querySelector('script[src*="googletagmanager.com"]'),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Privacy & analytics" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Privacy & analytics",
  });
  await waitFor(() => expect(dialog).toBeVisible());
  expect(screen.getByText("Analytics: off.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Allow analytics" }));
  expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("granted");
  expect(screen.getByText("Analytics: allowed.")).toBeVisible();
  rerender(view());
  expect(
    document.querySelectorAll('script[src*="googletagmanager.com"]'),
  ).toHaveLength(1);
  const views = (window.dataLayer || [])
    .map((args) => Array.from(args))
    .filter((args) => args[0] === "event" && args[1] === "page_view");
  expect(views).toHaveLength(1);
});
