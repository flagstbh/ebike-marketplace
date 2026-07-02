// A bike with year-variant parts carries multiple catalog rows for the same
// component, but any single bike (one model year) only ever has ONE of them.
// "Up to" totals therefore take the best variant per component, never the sum.
interface ValuedPart {
  component: string;
  trade_in_catalog?: { base_value_cents: number } | null;
}

export function takeoffPotential(parts: ValuedPart[]): number {
  const bestPerComponent = new Map<string, number>();
  for (const p of parts) {
    const v = p.trade_in_catalog?.base_value_cents ?? 0;
    const prev = bestPerComponent.get(p.component) ?? 0;
    if (v > prev) bestPerComponent.set(p.component, v);
  }
  let sum = 0;
  for (const v of bestPerComponent.values()) sum += v;
  return sum;
}
