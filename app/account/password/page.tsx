"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PasswordPage() {
  // Created at render so the client picks up the recovery code from the
  // URL as soon as the page loads, not on first submit.
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setExpired(true);
      } else {
        setError(err.message);
      }
      setBusy(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="label-mono text-ink-soft">Your garage</p>
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight">
        New password
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Pick a new password. Six characters minimum.
      </p>
      {expired ? (
        <div className="mt-8 border border-line bg-paper-raised p-6">
          <p className="text-sm">This reset link expired. Request a new one.</p>
          <Link
            href="/login"
            className="label-mono mt-3 inline-block text-accent hover:text-ink"
          >
            Back to sign in →
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="max-w-[16rem]">
            <label htmlFor="password" className="label-mono text-ink-soft">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-line bg-paper-raised px-3 py-2.5 outline-none focus:border-ink"
              autoComplete="new-password"
            />
          </div>
          <div className="max-w-[16rem]">
            <label htmlFor="confirm" className="label-mono text-ink-soft">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full border border-line bg-paper-raised px-3 py-2.5 outline-none focus:border-ink"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="border border-accent bg-accent/10 p-3 text-sm text-accent">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="w-full bg-accent px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-accent-ink hover:bg-ink disabled:bg-line disabled:text-ink-soft"
          >
            {busy ? "Working…" : "Set password"}
          </button>
        </form>
      )}
    </div>
  );
}
