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
        title="Privacy & analytics"
      >
        <Stack>
          <Text size="sm">
            Your solve history and daily date are stored in this browser on this
            device. Clearing browser data removes them. The app does not send
            your solve times or scrambles to analytics.
          </Text>
          <Text size="sm">
            When enabled, Cloudflare Web Analytics measures page visits and
            loading performance. Cloudflare states that it uses no analytics
            cookies, localStorage identifiers or visitor fingerprinting.
            Requests still reach Cloudflare with network and browser
            information; page and referrer information and performance metrics
            are measured.
          </Text>
          <Text size="sm">
            Google Analytics has been removed. This app expires its old Google
            analytics cookies. Do Not Track and Global Privacy Control prevent
            the Cloudflare beacon from loading.
          </Text>
          <Text size="sm">
            {!import.meta.env.PROD || !analyticsConfigured
              ? "Visit analytics is not configured on this version of the site."
              : blocked
                ? "Visit analytics is off because your browser sends a privacy signal."
                : "Cloudflare Web Analytics is enabled on this version of the site."}
          </Text>
          <Text size="sm">
            <a
              href="https://www.cloudflare.com/web-analytics/"
              target="_blank"
              rel="noreferrer"
            >
              Cloudflare Web Analytics privacy
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
        </Stack>
      </Modal>
    </footer>
  );
}
