export type LedgerKind =
  | "trade_in_credit"
  | "trade_in_credit_pending"
  | "order_redemption"
  | "adjustment";

export interface LedgerRow {
  delta_cents: number;
  kind: LedgerKind;
}

const SPENDABLE: LedgerKind[] = [
  "trade_in_credit",
  "order_redemption",
  "adjustment",
];

export function availableCredit(rows: LedgerRow[]): number {
  return rows
    .filter((r) => SPENDABLE.includes(r.kind))
    .reduce((s, r) => s + r.delta_cents, 0);
}

export function pendingCredit(rows: LedgerRow[]): number {
  return rows
    .filter((r) => r.kind === "trade_in_credit_pending")
    .reduce((s, r) => s + r.delta_cents, 0);
}

/** Quotes at or below this total get instant spendable credit. */
export const INSTANT_CREDIT_THRESHOLD_CENTS = 5000;

export const TRADE_IN_STATUS_LABELS: Record<string, string> = {
  quoted: "Awaiting shipment",
  shipped: "In transit",
  received: "At the dock",
  credited: "Credited",
  rejected: "Rejected",
};
