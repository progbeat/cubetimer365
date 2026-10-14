export type Face = "L" | "F" | "R" | "U" | "D";
export type Point = { x: number; y: number };
export type Palette = Record<string, string>;
export type StickerInput = {
  id: string;
  color: string;
  points: string;
  sourceOpacity: number;
};
export type ProjectedSticker = StickerInput & {
  face: Face;
  row: number;
  column: number;
  d: string;
  sampled: Point[];
};
export type ShadeStop = { offset: number; color: string; opacity: number };
export type SurfaceLayer = {
  from: readonly number[];
  to: readonly number[];
  stops: readonly ShadeStop[];
};
export type FadeStop = { offset: number; opacity: number };
export type GlintLayer = {
  from: readonly number[];
  to: readonly number[];
  color: string;
  mix: number;
  width: number;
  opacity: number;
};
export type MaterialParameters = {
  center: number;
  edge: number;
  knee: number;
  power: number;
  brightness: number;
  saturation: number;
  edgeWhite: number;
  contourWhite: number;
  contourColor: string;
  contourWidth: number;
  inset: number;
  glow: number;
  glowRadius: number;
  glowSpread: number;
  substrate: string;
  background: string;
  noisePitch: number;
  noiseWidth: number;
  noiseOpacity: number;
  noiseColor: string;
  noisePhase: number;
  palette: Palette | null;
  contourPalette: Palette | null;
  surface: SurfaceLayer | null;
  contourMode: "stroke" | "ring";
  contourMinFraction: number;
  contourMaxFraction: number;
  contourFade: readonly FadeStop[] | null;
  lightFrom: readonly number[];
  lightTo: readonly number[];
  glints: readonly GlintLayer[] | null;
  noiseActive: boolean;
};
export type RenderOptions = {
  size: number;
  padding: number;
  dpr: number;
  opaqueBackground: boolean;
  renderInterference: boolean;
};

// Shared face-plane material and screen-space compositing; names are not renderer inputs.
export const PALETTE: Palette = Object.freeze({
  "yellow-4": "#ffe145",
  "gray-2": "#e1edf3",
  "green-6": "#27dd72",
  "blue-6": "#299cff",
  "red-6": "#ff4056",
  "orange-5": "#ffa135",
});
export const FACE_CORNERS = Object.freeze<
  Record<Face, [number[], number[], number[], number[]]>
>({
  L: [
    [-300, -100, 2],
    [-100, -100, 1],
    [-300, 100, 2],
    [-100, 100, 1],
  ],
  F: [
    [-100, -100, 1],
    [100, -100, 1],
    [-100, 100, 1],
    [100, 100, 1],
  ],
  R: [
    [100, -100, 1],
    [300, -100, 2],
    [100, 100, 1],
    [300, 100, 2],
  ],
  U: [
    [100, -100, 1],
    [-100, -100, 1],
    [100, -300, 2],
    [-100, -300, 2],
  ],
  D: [
    [-100, 100, 1],
    [100, 100, 1],
    [-100, 300, 2],
    [100, 300, 2],
  ],
});
export const BASE = Object.freeze({
  center: 0.08,
  edge: 0.16,
  knee: 0.25,
  power: 2.2,
  brightness: 1,
  saturation: 1.6,
  edgeWhite: 0,
  contourWhite: 0.28,
  contourColor: "#ffffff",
  contourWidth: 1.4,
  inset: 0.015,
  glow: 0.8,
  glowRadius: 2.4,
  glowSpread: 0.28,
  substrate: "#060b10",
  background: "#101619",
  noisePitch: 3.4,
  noiseWidth: 0.6,
  noiseOpacity: 0.18,
  noiseColor: "#020917",
  noisePhase: 0.7,
});
// Every effect is controlled by paint parameters, never by a material/style name.
export const EFFECT_DEFAULTS = Object.freeze({
  palette: null,
  contourPalette: null,
  surface: null,
  contourMode: "stroke" as const,
  contourMinFraction: 0.034,
  contourMaxFraction: 0.085,
  contourFade: null,
  lightFrom: [0.1, 0.16],
  lightTo: [0.85, 0.95],
  glints: null,
  noiseActive: false,
});
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export function project(face: Face, i: number, j: number) {
  const [lu, ru, ld, rd] = FACE_CORNERS[face];
  let alpha = (3 - i) / 3,
    beta = i / 3;
  const lX = lu[0] * alpha + ld[0] * beta,
    lY = lu[1] * alpha + ld[1] * beta,
    lZ = lu[2] * alpha + ld[2] * beta;
  const rX = ru[0] * alpha + rd[0] * beta,
    rY = ru[1] * alpha + rd[1] * beta,
    rZ = ru[2] * alpha + rd[2] * beta;
  alpha = (3 - j) / 3;
  beta = j / 3;
  const z = lZ * alpha + rZ * beta;
  return { x: (lX * alpha + rX * beta) / z, y: (lY * alpha + rY * beta) / z };
}
// Preserve the original quadratic face-plane corner profile and arithmetic.
export function samples(face: Face, row: number, column: number, inset = 0) {
  const points = [
    { x: column + 0.025, y: row + 0.025 },
    { x: column + 0.025, y: row + 0.975 },
    { x: column + 0.975, y: row + 0.975 },
    { x: column + 0.975, y: row + 0.025 },
  ];
  return points.flatMap((corner, index) => {
    const previous = points[(index + 3) % 4],
      next = points[(index + 1) % 4];
    const entry = {
      x: corner.x + (previous.x - corner.x) * 0.13,
      y: corner.y + (previous.y - corner.y) * 0.13,
    };
    const exit = {
      x: corner.x + (next.x - corner.x) * 0.13,
      y: corner.y + (next.y - corner.y) * 0.13,
    };
    return Array.from({ length: 9 }, (_, step) => {
      const t = step / 8,
        a = (1 - t) ** 2,
        b = 2 * (1 - t) * t,
        c = t ** 2;
      let r = a * entry.y + b * corner.y + c * exit.y,
        k = a * entry.x + b * corner.x + c * exit.x;
      if (inset !== 0) {
        const scale = (0.95 - 2 * inset) / 0.95;
        r = row + 0.5 + (r - row - 0.5) * scale;
        k = column + 0.5 + (k - column - 0.5) * scale;
      }
      return project(face, r, k);
    });
  });
}
export const pathOf = (pts: Point[]) =>
  `${pts.map(({ x, y }, i) => `${i ? "L" : "M"}${x},${y}`).join(" ")} Z`;
export function inverseFace(face: Face, x: number, y: number) {
  const [lu, ru, ld] = FACE_CORNERS[face];
  const a = (ru[0] - lu[0] - x * (ru[2] - lu[2])) / 3,
    b = (ld[0] - lu[0] - x * (ld[2] - lu[2])) / 3;
  const c = (ru[1] - lu[1] - y * (ru[2] - lu[2])) / 3,
    d = (ld[1] - lu[1] - y * (ld[2] - lu[2])) / 3;
  const u = x * lu[2] - lu[0],
    v = y * lu[2] - lu[1],
    det = a * d - b * c;
  return { j: (u * d - b * v) / det, i: (a * v - u * c) / det };
}
export function hexRgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}
export function rgbHsv(rgb: readonly number[]) {
  const [r, g, b] = rgb,
    mx = Math.max(...rgb),
    mn = Math.min(...rgb),
    d = mx - mn;
  const h =
    d === 0
      ? 0
      : mx === r
        ? ((g - b) / d + 6) % 6
        : mx === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  return [h / 6, mx === 0 ? 0 : d / mx, mx];
}
export function hsvRgb([h, s, v]: readonly number[]) {
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}
export const mix = (a: readonly number[], b: readonly number[], t: number) =>
  a.map((v, i) => v * (1 - t) + b[i] * t);
export const rgbCss = (rgb: readonly number[]) =>
  `rgb(${rgb.map((v) => Math.round(clamp(v) * 255)).join(" ")})`;
export function colorKey(color: string) {
  return color.replace("var(--mantine-color-", "").replace(")", "");
}
export function emission(color: string, p: MaterialParameters) {
  const [h, s, v] = rgbHsv(
    hexRgb(p.palette?.[colorKey(color)] || PALETTE[colorKey(color)] || color),
  );
  return hsvRgb([h, clamp(s * p.saturation), clamp(v * p.brightness)]);
}
export function contourEmission(color: string, p: MaterialParameters) {
  const value = p.contourPalette?.[colorKey(color)];
  return value ? hexRgb(value) : emission(color, p);
}
// Square, separable four-edge field in the ORIGINAL face plane.
// Smooth union removes the diagonal cusps/pyramid planes of a raw L-infinity ramp.
// Both axes use exactly the same curve. No lighting direction, position or hue term.
export function fillAt(
  u: number,
  v: number,
  color: string,
  p: MaterialParameters,
) {
  const ramp = (z: number) => {
    const a = clamp((clamp(Math.abs(z - 0.5) / 0.475) - p.knee) / (1 - p.knee));
    return (a * a * (3 - 2 * a)) ** p.power;
  };
  const a = ramp(u),
    b = ramp(v),
    t = 1 - (1 - a) * (1 - b);
  const e = emission(color, p),
    level = p.center + (p.edge - p.center) * t;
  return mix(
    e.map((x) => clamp(x * level)),
    [1, 1, 1],
    p.edgeWhite * t,
  );
}
export function geometry(stickers: StickerInput[]): ProjectedSticker[] {
  return stickers.map((s) => {
    const [key, row, column] = s.id.split("-");
    const face = key as Face;
    const points = samples(face, +row, +column);
    return {
      ...s,
      face,
      row: +row,
      column: +column,
      d: pathOf(points),
      sampled: points,
    };
  });
}
export function samplesXY(
  face: Face,
  row: number,
  column: number,
  insetX: number,
  insetY: number,
) {
  const points = [
    { x: column + 0.025, y: row + 0.025 },
    { x: column + 0.025, y: row + 0.975 },
    { x: column + 0.975, y: row + 0.975 },
    { x: column + 0.975, y: row + 0.025 },
  ];
  return points.flatMap((corner, index) => {
    const previous = points[(index + 3) % 4],
      next = points[(index + 1) % 4];
    const entry = {
      x: corner.x + (previous.x - corner.x) * 0.13,
      y: corner.y + (previous.y - corner.y) * 0.13,
    };
    const exit = {
      x: corner.x + (next.x - corner.x) * 0.13,
      y: corner.y + (next.y - corner.y) * 0.13,
    };
    return Array.from({ length: 9 }, (_, step) => {
      const t = step / 8,
        a = (1 - t) ** 2,
        b = 2 * (1 - t) * t,
        c = t ** 2;
      const u =
        column +
        0.5 +
        (a * entry.x + b * corner.x + c * exit.x - column - 0.5) *
          (1 - (2 * insetX) / 0.95);
      const v =
        row +
        0.5 +
        (a * entry.y + b * corner.y + c * exit.y - row - 0.5) *
          (1 - (2 * insetY) / 0.95);
      return project(face, v, u);
    });
  });
}
// Optional common face-plane compositing layer: identical stops/axis for every cell.
export function surfaceAt(
  rgb: readonly number[],
  u: number,
  v: number,
  layer: SurfaceLayer | null,
) {
  if (!layer) {
    return rgb;
  }
  const [ax, ay] = layer.from,
    [bx, by] = layer.to,
    dx = bx - ax,
    dy = by - ay;
  const t = clamp(((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy));
  let a = layer.stops[0],
    b = layer.stops[layer.stops.length - 1];
  for (let i = 1; i < layer.stops.length; i++) {
    if (t <= layer.stops[i].offset) {
      a = layer.stops[i - 1];
      b = layer.stops[i];
      break;
    }
  }
  const f = clamp((t - a.offset) / (b.offset - a.offset || 1));
  const tint = mix(hexRgb(a.color), hexRgb(b.color), f),
    opacity = a.opacity + (b.opacity - a.opacity) * f;
  return mix(rgb, tint, opacity);
}
export function contourPlate(s: ProjectedSticker, p: MaterialParameters) {
  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const width = dist(
    project(s.face, s.row + 0.5, s.column),
    project(s.face, s.row + 0.5, s.column + 1),
  );
  const height = dist(
    project(s.face, s.row, s.column + 0.5),
    project(s.face, s.row + 1, s.column + 0.5),
  );
  const tx = clamp(
    p.contourWidth / width,
    p.contourMinFraction,
    p.contourMaxFraction,
  );
  const ty = clamp(
    p.contourWidth / height,
    p.contourMinFraction,
    p.contourMaxFraction,
  );
  const outer = pathOf(samplesXY(s.face, s.row, s.column, p.inset, p.inset));
  const inner = pathOf(
    samplesXY(s.face, s.row, s.column, p.inset + tx, p.inset + ty),
  );
  return { ring: `${outer} ${inner}`, tx, ty };
}
const outline =
  "M-50,-150 L50,-150 L150,-50 L150,50 L50,150 L-50,150 L-150,50 L-150,-50 Z";
function svgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })),
      im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      resolve(im);
    };
    im.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    im.src = url;
  });
}
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
export function contoursSVG(g: ProjectedSticker[], p: MaterialParameters) {
  const paths = g.map((s) => {
    const rgb = contourEmission(s.color, p),
      stroke = rgbCss(mix(rgb, hexRgb(p.contourColor), p.contourWhite));
    const d = pathOf(samples(s.face, s.row, s.column, p.inset));
    return {
      id: s.id,
      d,
      stroke,
      glowColor: rgbCss(rgb),
      clip: s.d,
      source: s,
      plate: contourPlate(s, p),
    };
  });
  const pad = Math.max(12, p.glowRadius * 4);
  const size = 300 + pad * 2;
  const gradients = paths
    .map((s) => {
      if (!p.contourFade) {
        return "";
      }
      const a = project(
        s.source.face,
        s.source.row + p.lightFrom[1],
        s.source.column + p.lightFrom[0],
      );
      const b = project(
        s.source.face,
        s.source.row + p.lightTo[1],
        s.source.column + p.lightTo[0],
      );
      return `<linearGradient id="fade-${s.id}" gradientUnits="userSpaceOnUse" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}">${p.contourFade.map((stop) => `<stop offset="${stop.offset}" stop-color="${s.stroke}" stop-opacity="${stop.opacity}"/>`).join("")}</linearGradient>`;
    })
    .join("");
  const defs = `<defs><filter id="broad" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${p.glowRadius}"/></filter><filter id="near" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${p.glowRadius * 0.32}"/></filter>${paths.map((s) => `<clipPath id="plate-${s.id}"><path d="${s.clip}"/></clipPath><clipPath id="band-${s.id}"><path d="${s.plate.ring}" clip-rule="evenodd"/></clipPath>`).join("")}${gradients}</defs>`;
  const draw = (color: "stroke" | "glowColor", width: number, extra: boolean) =>
    paths
      .map((s) => {
        const paint =
          color === "stroke" && p.contourFade ? `url(#fade-${s.id})` : s[color];
        return p.contourMode === "ring"
          ? `<path d="${s.plate.ring}" fill="${paint}" fill-rule="evenodd"/>`
          : `<path d="${s.d}" fill="none" stroke="${paint}" stroke-width="${width}" stroke-linejoin="round" ${extra ? `clip-path="url(#plate-${s.id})"` : ""}/>`;
      })
      .join("");
  const glints = paths
    .map((s) => {
      if (!p.glints) {
        return "";
      }
      const cell = s.source,
        parts = [];
      for (const layer of p.glints) {
        const [au, av] = layer.from,
          [bu, bv] = layer.to;
        const a = project(cell.face, cell.row + av, cell.column + au),
          b = project(cell.face, cell.row + bv, cell.column + bu);
        const rgb = mix(
          contourEmission(cell.color, p),
          hexRgb(layer.color),
          layer.mix,
        );
        parts.push(
          `<path d="M${a.x},${a.y} L${b.x},${b.y}" stroke="${rgbCss(rgb)}" stroke-width="${layer.width}" opacity="${layer.opacity}" stroke-linecap="round"/>`,
        );
      }
      return `<g clip-path="url(#band-${s.id})">${parts.join("")}</g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-150 - pad} ${-150 - pad} ${size} ${size}" width="${size}" height="${size}">${defs}<g filter="url(#broad)" opacity="${p.glow * p.glowSpread}">${draw("glowColor", p.contourWidth * 1.7, false)}</g><g filter="url(#near)" opacity="${p.glow}">${draw("glowColor", p.contourWidth * 1.15, false)}</g>${draw("stroke", p.contourWidth, true)}${glints}</svg>`;
}
export function screenInterference(
  ctx: CanvasRenderingContext2D,
  {
    size,
    padding,
    dpr = 1,
  }: Pick<RenderOptions, "size" | "padding"> & { dpr?: number },
  p: MaterialParameters,
) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, padding * dpr, padding * dpr);
  ctx.scale(size / 300, size / 300);
  ctx.translate(150, 150);
  ctx.clip(new Path2D(outline));
  ctx.setTransform(dpr, 0, 0, dpr, padding * dpr, padding * dpr);
  ctx.globalAlpha = p.noiseOpacity;
  ctx.fillStyle = p.noiseColor;
  for (let y = p.noisePhase; y < size; y += p.noisePitch) {
    ctx.fillRect(0, y, size, p.noiseWidth);
  }
  ctx.restore();
}
export async function renderCube(
  stickers: StickerInput[],
  params: Partial<MaterialParameters>,
  options: Partial<RenderOptions> = {},
) {
  const p: MaterialParameters = { ...BASE, ...EFFECT_DEFAULTS, ...params },
    o = {
      size: 600,
      padding: 36,
      dpr: 1,
      opaqueBackground: true,
      renderInterference: true,
      ...options,
    };
  const { size, padding, dpr } = o,
    extent = size + 2 * padding;
  const out = canvas(Math.round(extent * dpr), Math.round(extent * dpr)),
    ctx = out.getContext("2d")!;
  if (o.opaqueBackground) {
    ctx.fillStyle = p.background;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  const g = geometry(stickers),
    tex = canvas(Math.round(size * dpr), Math.round(size * dpr)),
    tx = tex.getContext("2d")!;
  const pixels = tx.createImageData(tex.width, tex.height),
    lookup = new Map(g.map((s) => [s.id, s]));
  for (let py = 0; py < tex.height; py++) {
    for (let px = 0; px < tex.width; px++) {
      const x = ((px + 0.5) * 300) / tex.width - 150,
        y = ((py + 0.5) * 300) / tex.height - 150;
      for (const face of Object.keys(FACE_CORNERS) as Face[]) {
        const { i, j } = inverseFace(face, x, y);
        if (i < 0 || i >= 3 || j < 0 || j >= 3) {
          continue;
        }
        const row = Math.floor(i),
          col = Math.floor(j),
          s = lookup.get(`${face}-${row}-${col}`)!;
        const rgb = surfaceAt(
          fillAt(j - col, i - row, s.color, p),
          j - col,
          i - row,
          p.surface,
        );
        const index = (py * tex.width + px) * 4;
        pixels.data[index] = clamp(rgb[0]) * 255;
        pixels.data[index + 1] = clamp(rgb[1]) * 255;
        pixels.data[index + 2] = clamp(rgb[2]) * 255;
        pixels.data[index + 3] = 255;
        break;
      }
    }
  }
  tx.putImageData(pixels, 0, 0);
  ctx.save();
  ctx.setTransform(
    (size * dpr) / 300,
    0,
    0,
    (size * dpr) / 300,
    (padding + size / 2) * dpr,
    (padding + size / 2) * dpr,
  );
  ctx.fillStyle = p.substrate;
  ctx.fill(new Path2D(outline));
  ctx.clip(new Path2D(g.map((s) => s.d).join(" ")));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(tex, padding * dpr, padding * dpr);
  ctx.restore();
  if (p.contourWidth > 0) {
    const svg = contoursSVG(g, p),
      im = await svgImage(svg),
      pad = Math.max(12, p.glowRadius * 4);
    ctx.drawImage(
      im,
      (padding - (pad * size) / 300) * dpr,
      (padding - (pad * size) / 300) * dpr,
      ((300 + pad * 2) * size * dpr) / 300,
      ((300 + pad * 2) * size * dpr) / 300,
    );
  }
  if (p.noiseActive && o.renderInterference) {
    screenInterference(ctx, o, p);
  }
  return out;
}
