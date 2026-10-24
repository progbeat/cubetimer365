import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CubeNet from "./CubeNet";
import { renderCube } from "./cubeRenderer";

vi.mock("./cubeRenderer", async (original) => ({
  ...(await original<typeof import("./cubeRenderer")>()),
  renderCube: vi.fn(),
}));

let resize: (width: number) => void;
let decodes: { href: string; resolve: () => void; reject: () => void }[];
beforeEach(() => {
  decodes = [];
  let sequence = 0;
  vi.mocked(renderCube).mockImplementation(
    async () =>
      ({
        toDataURL: () => `data:image/png;base64,paint-${++sequence}`,
      }) as HTMLCanvasElement,
  );
  vi.stubGlobal("CanvasRenderingContext2D", class {});
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode() {
        return new Promise<void>((resolve, reject) =>
          decodes.push({
            href: this.src,
            resolve,
            reject: () => reject(new Error("decode failed")),
          }),
        );
      }
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = (width) =>
          callback(
            [{ contentRect: { width } }] as ResizeObserverEntry[],
            {} as ResizeObserver,
          );
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 170,
    height: 170,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 170,
    bottom: 170,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const flush = () => act(async () => {});

it("shows no simplified material during loading and ignores a stale style decode", async () => {
  const view = render(<CubeNet scramble="R U" side={96} style="neon" />);
  await flush();
  expect(view.container.querySelector("svg")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(view.container.querySelector("[data-cube-fallback]")).toHaveAttribute(
    "opacity",
    "0",
  );
  expect(view.container.querySelector("image")).toBeNull();
  expect(view.container.querySelector("[data-cube-loading]")).not.toBeNull();
  view.rerender(<CubeNet scramble="R U" side={96} style="cyber" />);
  await flush();
  await act(async () => decodes[0].resolve());
  expect(view.container.querySelector("image")).toBeNull();
  await act(async () => decodes[1].resolve());
  expect(view.container.querySelector("image")).toHaveAttribute(
    "href",
    decodes[1].href,
  );
  expect(view.container.querySelector("svg")).toHaveAttribute(
    "data-material-state",
    "ready",
  );
  expect(view.container.querySelector("svg")).not.toHaveAttribute("aria-busy");
  expect(view.container.querySelector("[data-cube-loading]")).toBeNull();
});

it("keeps a decoded finish visible while preparing a new measured size", async () => {
  const view = render(<CubeNet scramble="R U" side={96} style="neon" />);
  await flush();
  await act(async () => decodes[0].resolve());
  const first = view.container.querySelector("image")!;
  const position = first.getAttribute("x");
  act(() => resize(124));
  await flush();
  expect(view.container.querySelector("image")).toHaveAttribute(
    "href",
    decodes[0].href,
  );
  expect(view.container.querySelector("image")).toHaveAttribute("x", position);
  expect(view.container.querySelector("[data-cube-fallback]")).toHaveAttribute(
    "opacity",
    "0",
  );
  expect(view.container.querySelector("[data-cube-loading]")).toBeNull();
  await act(async () => decodes[1].resolve());
  expect(view.container.querySelector("image")).toHaveAttribute(
    "href",
    decodes[1].href,
  );
});

it("reveals the fallback after decode failure and recovers when that finish is retried", async () => {
  const view = render(<CubeNet scramble="R U" side={96} style="flat" />);
  await flush();
  await act(async () => decodes[0].reject());
  expect(view.container.querySelector("svg")).toHaveAttribute(
    "data-material-state",
    "fallback",
  );
  expect(view.container.querySelector("svg")).not.toHaveAttribute("aria-busy");
  expect(view.container.querySelector("[data-cube-fallback]")).toHaveAttribute(
    "opacity",
    "1",
  );
  expect(view.container.querySelector("[data-cube-loading]")).toBeNull();
  view.rerender(<CubeNet scramble="R U" side={96} style="neon" />);
  await flush();
  await act(async () => decodes[1].resolve());
  view.rerender(<CubeNet scramble="R U" side={96} style="flat" />);
  await flush();
  expect(view.container.querySelector("svg")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(view.container.querySelector("[data-cube-fallback]")).toHaveAttribute(
    "opacity",
    "0",
  );
  await act(async () => decodes[2].resolve());
  expect(view.container.querySelector("svg")).toHaveAttribute(
    "data-material-state",
    "ready",
  );
  expect(view.container.querySelector("image")).toHaveAttribute(
    "href",
    decodes[2].href,
  );
});
