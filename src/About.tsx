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
      size={520}
      padding={0}
      radius={12}
      xOffset={12}
      yOffset={12}
      returnFocus={false}
      overlayProps={{ color: "#050708", backgroundOpacity: 0.72, blur: 2 }}
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
      <p className="about-intro">
        Try different solutions to the same scramble. CubeTimer365 keeps one
        starting position for the day, so you can repeat it and compare your
        times.
      </p>
      <p className="about-detail">
        Review today’s times, averages of 5 and 12, and best results as you
        practise. Each new day brings a fresh scramble to work on.
      </p>
      <section className="about-device" aria-labelledby="about-device-title">
        <h3 id="about-device-title">Saved in your browser</h3>
        <p>
          Today’s solves and your cube finish are saved on this device. Clearing
          this site’s browser data removes them.
        </p>
      </section>
      <div className="about-project">
        <span>
          By{" "}
          <a
            href="https://github.com/progbeat"
            target="_blank"
            rel="noreferrer"
          >
            Roman Rizvanov
          </a>
        </span>
        <div className="about-links">
          <a
            href="https://github.com/progbeat/cubetimer365"
            target="_blank"
            rel="noreferrer"
          >
            Source code
          </a>
          <a
            href="https://github.com/progbeat/cubetimer365/issues/new"
            target="_blank"
            rel="noreferrer"
          >
            Feedback
          </a>
        </div>
      </div>
      <button type="button" className="about-return" onClick={onClose}>
        Back to timer
      </button>
    </Modal>
  );
}
