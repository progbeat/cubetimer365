declare module "recharts-scale" {
  export function getTickValuesFixedDomain(
    domain: [number, number],
    tickCount: number,
    allowDecimals: boolean,
  ): number[];
}
