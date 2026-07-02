"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-4 py-20 text-center sm:px-8">
      <p className="label-mono text-accent">Error</p>
      <h1 className="font-display mt-3 text-5xl font-bold uppercase tracking-tight sm:text-6xl">
        Something slipped a gear
      </h1>
      <p className="mt-3 text-ink-soft">
        That one was on our end, not yours. Give it another turn.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={reset}
          className="bg-accent px-6 py-3 text-sm font-semibold uppercase text-accent-ink hover:bg-ink"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border border-ink px-6 py-3 text-sm font-semibold uppercase hover:bg-ink hover:text-paper"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
