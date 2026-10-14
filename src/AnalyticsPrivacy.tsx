import { useEffect, useState } from "react";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import {
  analyticsConfigured,
  ANALYTICS_CONSENT_KEY,
  privacySignalEnabled,
  readAnalyticsConsent,
  saveAnalyticsConsent,
  startAnalytics,
  type AnalyticsConsent,
} from "./analytics";
import "./AnalyticsPrivacy.css";

export default function AnalyticsPrivacy() {
  const [opened, setOpened] = useState(false);
  const [consent, setConsent] =
    useState<AnalyticsConsent>(readAnalyticsConsent);
  const blocked = privacySignalEnabled();
  useEffect(() => {
    startAnalytics();
  }, [consent]);
  useEffect(() => {
    const syncConsent = (event: StorageEvent) => {
      if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) {
        setConsent(readAnalyticsConsent());
      }
    };
    window.addEventListener("storage", syncConsent);
    return () => window.removeEventListener("storage", syncConsent);
  }, []);
  const choose = (choice: Exclude<AnalyticsConsent, null>) => {
    saveAnalyticsConsent(choice);
    setConsent(readAnalyticsConsent());
    // A fresh document removes the Google tag and its listeners after withdrawal.
    // The disable flag is set before reload, including for unload events.
    if (consent === "granted" && choice === "denied") {
      window.location.reload();
    }
  };
  const choices = (
    <Group gap="sm">
      <Button
        variant="default"
        onClick={() => choose("granted")}
        disabled={blocked}
      >
        Allow analytics
      </Button>
      <Button variant="default" onClick={() => choose("denied")}>
        No thanks
      </Button>
    </Group>
  );
  return (
    <footer className="analytics-privacy">
      {analyticsConfigured && consent === null && !blocked && (
        <section
          className="analytics-choice"
          aria-label="Optional visit analytics"
        >
          <p>
            Allow Google Analytics to count visits? It uses cookies for up to 30
            days. Your solve history stays on this device.
          </p>
          {choices}
        </section>
      )}
      <button
        type="button"
        className="privacy-link"
        onClick={() => setOpened(true)}
      >
        Privacy &amp; analytics
      </button>
      <Modal
        className="analytics-privacy-modal"
        opened={opened}
        onClose={() => setOpened(false)}
        title="Privacy & analytics"
      >
        <Stack>
          <Text size="sm">
            CubeTimer365 stores your solve history and daily date in this
            browser on this device. Clearing browser data removes them. They are
            never sent to Google Analytics.
          </Text>
          <Text size="sm">
            Optional Google Analytics 4 measures visits to the timer, stats,
            history and cube finishes screens. Google receives a random cookie
            identifier, basic browser and device information, and visit
            activity. Your IP address reaches Google to serve requests and
            derive approximate location. We send no solve times, scrambles,
            field contents, names, email addresses, User-ID or arbitrary URL
            parameters.
          </Text>
          <Text size="sm">
            The Google tag loads only after you allow analytics. Until then, or
            after you decline, this app makes no analytics requests or creates
            analytics cookies. Analytics cookies last up to 30 days and are
            limited to this app. We remember your choice locally until you
            change it or clear browser data. Advertising consent is always
            denied; Google Signals and advertising personalization are disabled.
          </Text>
          <Text size="sm">
            Do Not Track and Global Privacy Control prevent analytics even if
            you previously allowed it. You can withdraw consent here; this
            removes this app's analytics cookies and reloads the page.
            Previously collected data remains with Google.
          </Text>
          <Text size="sm">
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noreferrer"
            >
              How Google uses information from sites that use its services
            </a>
          </Text>
          <Text size="sm">
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Google Privacy Policy
            </a>
            {" · "}
            <a
              href="https://github.com/progbeat/cubetimer365/issues"
              target="_blank"
              rel="noreferrer"
            >
              Contact the site maintainer
            </a>
          </Text>
          {!analyticsConfigured ? (
            <Text size="sm">
              Analytics is not configured on this version of the site.
            </Text>
          ) : blocked ? (
            <Text size="sm">
              Analytics is off because your browser sends a privacy signal.
            </Text>
          ) : (
            <>
              <Text size="sm">
                Analytics: {consent === "granted" ? "allowed" : "off"}.
              </Text>
              {choices}
            </>
          )}
        </Stack>
      </Modal>
    </footer>
  );
}
