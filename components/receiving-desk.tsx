"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usd } from "@/lib/format";
import { ITEM_CONDITION_LABELS } from "@/lib/types";
import type { ItemCondition } from "@/lib/types";
import { TRADE_IN_STATUS_LABELS } from "@/lib/credit";

interface TradeInItem {
  id: string;
  description: string;
  condition: ItemCondition;
  quoted_cents: number;
  final_cents: number | null;
}

interface TradeInQueueRow {
  id: string;
  user_id: string;
  status: string;
  quoted_total_cents: number;
  credited_total_cents: number | null;
  received_at: string | null;
  inspection_note: string | null;
  created_at: string;
  items: TradeInItem[];
}

const FILTERS = [
  { key: "quoted", label: "Awaiting parts" },
  { key: "received", label: "At the dock" },
  { key: null, label: "All open" },
] as const;

export default function ReceivingDesk() {
  const [filter, setFilter] = useState<string | null>("quoted");
  const [rows, setRows] = useState<TradeInQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalValues, setFinalValues] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("admin_list_trade_ins", {
      p_status: filter,
    });
    if (rpcError) {
      setError(rpcError.message);
      setRows([]);
    } else {
      const parsed = (data as TradeInQueueRow[]) ?? [];
      const open = ["quoted", "shipped", "received"];
      setRows(
        parsed.filter((r) => (filter ? r.status === filter : open.includes(r.status)))
      );
      const defaults: Record<string, number> = {};
      for (const row of parsed) {
        for (const item of row.items) {
          defaults[item.id] = item.final_cents ?? item.quoted_cents;
        }
      }
      setFinalValues(defaults);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function markReceived(id: string) {
    setBusy(id);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_mark_received", {
      p_trade_in_id: id,
    });
    if (rpcError) setError(rpcError.message);
    else await load();
    setBusy(null);
  }

  async function finalize(id: string, items: TradeInItem[]) {
    setBusy(id);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_finalize_trade_in", {
      p_trade_in_id: id,
      p_items: items.map((item) => ({
        item_id: item.id,
        final_cents: finalValues[item.id] ?? item.quoted_cents,
      })),
      p_note: notes[id] || null,
    });
    if (rpcError) setError(rpcError.message);
    else await load();
    setBusy(null);
  }

  async function reject(id: string) {
    setBusy(id);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_reject_trade_in", {
      p_trade_in_id: id,
      p_note: notes[id] || "Rejected at receiving",
    });
    if (rpcError) setError(rpcError.message);
    else await load();
    setBusy(null);
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-4 sm:px-8">
        {FILTERS.map((f) => (
          <button
            key={String(f.key)}
            onClick={() => setFilter(f.key)}
            className={`label-mono border px-3 py-1.5 ${
              filter === f.key
                ? "border-accent bg-accent text-accent-ink"
                : "border-line hover:border-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={load}
          className="label-mono ml-auto border border-line px-3 py-1.5 hover:border-ink"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="border-b border-line bg-accent px-4 py-3 text-sm text-accent-ink sm:px-8">
          {error}
        </div>
      )}

      {loading ? (
        <p className="px-4 py-12 text-ink-soft sm:px-8">Loading queue…</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-12 text-ink-soft sm:px-8">Nothing in this queue.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id} className="border-b border-line px-4 py-8 sm:px-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="label-mono text-ink-soft">
                    {fmtDate(row.created_at)} · #{row.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="font-display mt-1 text-2xl font-semibold uppercase">
                    {TRADE_IN_STATUS_LABELS[row.status] ?? row.status}
                  </p>
                </div>
                <p className="font-semibold text-accent">
                  Quote {usd(row.quoted_total_cents)}
                </p>
              </div>

              <ul className="mt-4 space-y-3">
                {row.items.map((item) => (
                  <li
                    key={item.id}
                    className="grid gap-3 border border-line bg-paper-raised p-4 sm:grid-cols-[1fr_auto_auto]"
                  >
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="label-mono mt-0.5 text-ink-soft">
                        Rider graded: {ITEM_CONDITION_LABELS[item.condition]} · quoted{" "}
                        {usd(item.quoted_cents)}
                      </p>
                    </div>
                    {row.status === "received" ? (
                      <label className="flex flex-col gap-1">
                        <span className="label-mono text-ink-soft">Final credit</span>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={finalValues[item.id] ?? item.quoted_cents}
                          onChange={(e) =>
                            setFinalValues((prev) => ({
                              ...prev,
                              [item.id]: Number(e.target.value),
                            }))
                          }
                          className="w-28 border border-line bg-paper px-2 py-1.5 font-mono text-sm"
                        />
                      </label>
                    ) : (
                      <span className="self-center font-semibold">
                        {usd(item.quoted_cents)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <textarea
                placeholder="Inspection notes (optional)"
                value={notes[row.id] ?? ""}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                }
                className="mt-4 w-full max-w-xl border border-line bg-paper px-3 py-2 text-sm"
                rows={2}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {row.status === "quoted" && (
                  <>
                    <button
                      disabled={busy === row.id}
                      onClick={() => markReceived(row.id)}
                      className="bg-ink px-4 py-2 text-sm font-semibold uppercase text-paper hover:bg-accent disabled:opacity-50"
                    >
                      Mark received
                    </button>
                    <button
                      disabled={busy === row.id}
                      onClick={() => reject(row.id)}
                      className="border border-line px-4 py-2 text-sm font-semibold uppercase hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {row.status === "received" && (
                  <>
                    <button
                      disabled={busy === row.id}
                      onClick={() => finalize(row.id, row.items)}
                      className="bg-accent px-4 py-2 text-sm font-semibold uppercase text-accent-ink hover:bg-ink disabled:opacity-50"
                    >
                      Release credit
                    </button>
                    <button
                      disabled={busy === row.id}
                      onClick={() => reject(row.id)}
                      className="border border-line px-4 py-2 text-sm font-semibold uppercase hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
