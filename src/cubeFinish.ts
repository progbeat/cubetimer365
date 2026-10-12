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
