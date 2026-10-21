import { Modal } from "@mantine/core";
import "./About.css";

export default function About({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      id="about-cubetimer"
      opened={opened}
      onClose={onClose}
      title="About CubeTimer365"
      centered
      size={480}
      padding={0}
      radius={12}
      xOffset={12}
      yOffset={12}
      returnFocus={false}
      overlayProps={{ color: "#050708", backgroundOpacity: 0.6 }}
      transitionProps={{ transition: "fade", duration: 120 }}
      closeButtonProps={{ "aria-label": "Close About" }}
      classNames={{
        content: "about-modal-content",
        header: "about-modal-header",
        title: "about-modal-title",
        body: "about-modal-body",
        close: "about-modal-close",
      }}
    >
      <p>
        CubeTimer365 keeps one scramble for the day so you can explore beyond
        your first solution. Try a different opening, rethink an awkward step,
        or look for a route with fewer moves, then start again from the same
        position.
      </p>
      <p>
        Repeated attempts give you a way to practise the sequences you discover
        and compare approaches on familiar ground. The next day brings a new
        position to work through.
      </p>
      <div className="about-links">
        <a
          href="https://github.com/progbeat/cubetimer365"
          target="_blank"
          rel="noreferrer"
        >
          Source
        </a>
        <a
          href="https://github.com/progbeat/cubetimer365/issues/new"
          target="_blank"
          rel="noreferrer"
        >
          Feedback
        </a>
      </div>
    </Modal>
  );
}
