"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else if (data.session) {
        router.push(next);
        router.refresh();
        return;
      } else {
        setNotice(
          "Check your email for a confirmation link, then sign in here."
        );
        setMode("signin");
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        router.push(next);
        router.refresh();
        return;
      }
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div className="flex border border-line">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`label-mono flex-1 py-2.5 ${
              mode === m ? "bg-ink text-paper" : "hover:bg-paper-raised"
            }`}
          >
            {m === "signup" ? "New account" : "Sign in"}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="email" className="label-mono text-ink-soft">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full border border-line bg-paper-raised px-3 py-2.5 outline-none focus:border-ink"
          autoComplete="email"
        />
      </div>
      <div className="max-w-[16rem]">
        <label htmlFor="password" className="label-mono text-ink-soft">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full border border-line bg-paper-raised px-3 py-2.5 outline-none focus:border-ink"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>
      {error && (
        <p className="border border-accent bg-accent/10 p-3 text-sm text-accent">
          {error}
        </p>
      )}
      {notice && (
        <p className="border border-line bg-paper-raised p-3 text-sm">
          {notice}
        </p>
      )}
      <button
        disabled={busy}
        className="w-full bg-accent px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-accent-ink hover:bg-ink disabled:bg-line disabled:text-ink-soft"
      >
        {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
