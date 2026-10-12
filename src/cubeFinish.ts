type Point = { x: number; y: number };

// Round within each existing projected quadrilateral; face geometry stays unchanged.
export function roundedStickerPath(points: Point[]): string {
  const inset = (corner: Point, neighbor: Point) => ({
    x: corner.x + (neighbor.x - corner.x) * 0.13,
    y: corner.y + (neighbor.y - corner.y) * 0.13,
  });
  return `${points
    .map((corner, index) => {
      const entry = inset(corner, points[(index + 3) % 4]);
      const exit = inset(corner, points[(index + 1) % 4]);
      return `${index === 0 ? "M" : "L"}${entry.x},${entry.y}Q${corner.x},${corner.y} ${exit.x},${exit.y}`;
    })
    .join(" ")} Z`;
}

type Project = (row: number, column: number) => Point;

// Round in the physical face plane, then apply the original perspective to each sample.
export function projectedSticker(
  project: Project,
  row: number,
  column: number,
  pixelsPerUnit = 1,
) {
  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const width = distance(
    project(row + 0.5, column),
    project(row + 0.5, column + 1),
  );
  const height = distance(
    project(row, column + 0.5),
    project(row + 1, column + 0.5),
  );
  const gx = Math.max(0.04, Math.min(0.105, 0.45 / pixelsPerUnit / width));
  const gy = Math.max(0.04, Math.min(0.105, 0.45 / pixelsPerUnit / height));
  const thicknessX = Math.max(0.034, Math.min(0.085, 0.85 / width));
  const thicknessY = Math.max(0.034, Math.min(0.085, 0.85 / height));
  const radius = Math.max(
    0.14,
    Math.min(0.24, 0.9 / (Math.min(width, height) * pixelsPerUnit)),
  );
  const left = column + gx,
    right = column + 1 - gx;
  const top = row + gy,
    bottom = row + 1 - gy;
  const rounded = (insetX: number, insetY: number) => {
    const l = left + insetX,
      r = right - insetX,
      t = top + insetY,
      b = bottom - insetY;
    const rx = radius - insetX,
      ry = radius - insetY;
    const corners = [
      [r - rx, t + ry, -Math.PI / 2],
      [r - rx, b - ry, 0],
      [l + rx, b - ry, Math.PI / 2],
      [l + rx, t + ry, Math.PI],
    ];
    const points = corners.flatMap(([cx, cy, start]) =>
      Array.from({ length: 9 }, (_, step) => {
        const angle = start + (step * Math.PI) / 16;
        return project(cy + Math.sin(angle) * ry, cx + Math.cos(angle) * rx);
      }),
    );
    return `${points
      .map(({ x, y }, index) => `${index ? "L" : "M"}${x},${y}`)
      .join(" ")} Z`;
  };
  const outer = rounded(0, 0),
    inner = rounded(thicknessX, thicknessY);
  const bandCount = Math.max(
    0,
    Math.min(width, height) * pixelsPerUnit <
      (Math.max(width, height) / Math.min(width, height) > 1.5 ? 18 : 10)
      ? 0
      : Math.min(21, Math.floor((height * (1 - gy * 2) * pixelsPerUnit) / 2.2)),
  );
  const halfBand = 0.09 / (height * pixelsPerUnit);
  const bands = Array.from({ length: bandCount }, (_, index) => {
    const phase =
      (index + 0.5 + 0.04 * Math.sin(index * 1.7 + row * 4 + column * 6)) /
      Math.max(1, bandCount);
    const y = top + (bottom - top) * phase;
    const points = [
      project(y - halfBand, left),
      project(y + halfBand, left),
      project(y + halfBand, right),
      project(y - halfBand, right),
    ];
    return `${points
      .map(({ x, y }, point) => `${point ? "L" : "M"}${x},${y}`)
      .join(" ")} Z`;
  }).join(" ");
  return {
    radius,
    bandCount,
    outer,
    inner,
    ring: `${outer} ${inner}`,
    bevel: `${outer} ${rounded(
      Math.min(0.092, thicknessX * 1.8),
      Math.min(0.092, thicknessY * 1.8),
    )}`,
    bands,
    left,
    right,
    top,
    bottom,
  };
}
