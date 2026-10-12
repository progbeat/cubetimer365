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

// The illuminated screen is inset inside its original logical sticker cell.
export function cyberStickerPath(points: Point[]): string {
  const center = points.reduce(
    (sum, point) => ({ x: sum.x + point.x / 4, y: sum.y + point.y / 4 }),
    { x: 0, y: 0 },
  );
  const plate = points.map((point) => ({
    x: center.x + (point.x - center.x) * 0.96,
    y: center.y + (point.y - center.y) * 0.96,
  }));
  const toward = (from: Point, to: Point, fraction: number) => ({
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
  });
  return `${plate
    .map((corner, index) => {
      const entry = toward(corner, plate[(index + 3) % 4], 0.12);
      const exit = toward(corner, plate[(index + 1) % 4], 0.12);
      const controlIn = toward(entry, corner, 0.55228475);
      const controlOut = toward(exit, corner, 0.55228475);
      return `${index === 0 ? "M" : "L"}${entry.x},${entry.y}C${controlIn.x},${controlIn.y} ${controlOut.x},${controlOut.y} ${exit.x},${exit.y}`;
    })
    .join(" ")} Z`;
}
