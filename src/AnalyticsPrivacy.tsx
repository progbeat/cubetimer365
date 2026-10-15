import { useEffect, useState } from "react";
import { Modal, Stack, Text } from "@mantine/core";
import {
  analyticsConfigured,
  privacySignalEnabled,
  startAnalytics,
} from "./analytics";
import "./AnalyticsPrivacy.css";

export default function AnalyticsPrivacy() {
  const [opened, setOpened] = useState(false);
  const blocked = privacySignalEnabled();
  useEffect(() => {
    startAnalytics();
  }, []);
  return (
    <footer className="analytics-privacy">
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
        title="Privacy notice"
      >
        <Stack gap="md">
          <section aria-labelledby="privacy-local">
            <Text
              component="h3"
              id="privacy-local"
              fw={600}
              size="sm"
              mt={0}
              mb="xs"
            >
              Local data
            </Text>
            <Text size="sm">
              Your daily results are saved in this browser. Clearing site data
              removes them. Cube appearance is a local setting.
            </Text>
          </section>
          <section aria-labelledby="privacy-analytics">
            <Text
              component="h3"
              id="privacy-analytics"
              fw={600}
              size="sm"
              mt={0}
              mb="xs"
            >
              Analytics
            </Text>
            <Text size="sm" mb="xs">
              {!import.meta.env.PROD || !analyticsConfigured
                ? "Visit analytics is off."
                : blocked
                  ? "Visit analytics is off because your browser sends a privacy signal."
                  : "Visit analytics is enabled through Cloudflare."}
            </Text>
            <Text size="sm">
              When enabled, Cloudflare Web Analytics receives page and referrer
              information, browser details, network information including your
              IP address, and page performance measurements. It uses no
              analytics cookies or visitor fingerprinting. Solve times and
              scrambles are not sent to analytics.
            </Text>
          </section>
          <section aria-labelledby="privacy-choices">
            <Text
              component="h3"
              id="privacy-choices"
              fw={600}
              size="sm"
              mt={0}
              mb="xs"
            >
              Your choices
            </Text>
            <Text size="sm" mb="xs">
              Your browser's Do Not Track and Global Privacy Control signals
              keep visit analytics off.
            </Text>
            <Text size="sm">
              <a
                href="https://www.cloudflare.com/web-analytics/"
                target="_blank"
                rel="noreferrer"
              >
                Cloudflare privacy
              </a>
              {" · "}
              <a
                href="https://github.com/progbeat/cubetimer365/issues"
                target="_blank"
                rel="noreferrer"
              >
                Contact the maintainer
              </a>
            </Text>
          </section>
        </Stack>
      </Modal>
    </footer>
  );
}
