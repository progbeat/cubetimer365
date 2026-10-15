import { useState } from "react";
import { Modal, Stack, Text, Group, Button } from "@mantine/core";
import { formatTime } from "./solveStatistics";
import type { LegacyHistory } from "./solveStorage";

export default function LegacyHistoryImport({
  candidate,
  onImport,
  onIgnore,
}: {
  candidate: LegacyHistory;
  onImport: () => void;
  onIgnore: () => void;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <div className="legacy-import">
      <button
        type="button"
        className="privacy-link"
        onClick={() => setOpened(true)}
      >
        Review previous browser results
      </button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Import previous results?"
      >
        <Stack>
          <Text size="sm">
            {candidate.history.length} results saved for {candidate.date}.
          </Text>
          <Text size="sm">
            First results:{" "}
            {candidate.history.slice(0, 5).map(formatTime).join(", ")}
            {candidate.history.length > 5 ? ", …" : ""}
          </Text>
          <Text size="sm">
            These shared browser keys do not identify the app that saved them.
            Import only if these are your CubeTimer365 solves. The original data
            stays untouched.
          </Text>
          <Group>
            <Button onClick={onImport}>Import into CubeTimer365</Button>
            <Button variant="default" onClick={onIgnore}>
              Keep separate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
