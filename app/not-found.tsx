import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-4 py-20 text-center sm:px-8">
      <p className="label-mono text-accent">404</p>
      <h1 className="font-display mt-3 text-5xl font-bold uppercase tracking-tight sm:text-6xl">
        This part fell off
      </h1>
      <p className="mt-3 text-ink-soft">
        Whatever was bolted on here, it isn&apos;t anymore.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/parts"
          className="bg-accent px-6 py-3 text-sm font-semibold uppercase text-accent-ink hover:bg-ink"
        >
          Shop parts
        </Link>
        <Link
          href="/bikes"
          className="border border-ink px-6 py-3 text-sm font-semibold uppercase hover:bg-ink hover:text-paper"
        >
          Find your bike
        </Link>
      </div>
    </div>
  );
}
