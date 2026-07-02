export const metadata = { title: "Policies & fine print" };

const SECTIONS: { label: string; body: string }[] = [
  {
    label: "Used-part warranty",
    body: "Every used part carries a 90-day warranty. If it arrives dead, you get a full refund or a replacement, your call. Normal wear is not a defect and is not covered.",
  },
  {
    label: "Trade-in credit",
    body: "Credit never expires. Quotes are honored for 14 days. Quotes over $50 stay pending until your parts arrive and pass inspection. If the condition differs from the grade you picked, we adjust the final credit. If you disagree with the adjustment, we ship your parts back instead.",
  },
  {
    label: "Shipping",
    body: "Trade-ins over $50 get a free prepaid label. Orders ship from Madison, WI in 1–2 business days. Shipping on orders is free.",
  },
  {
    label: "Returns on new parts",
    body: "New parts can come back within 30 days. Unused, uninstalled, in the original packaging. Once it bolts on, it is yours.",
  },
  {
    label: "Batteries",
    body: "Every battery gets tested and capacity-graded before it goes back on sale. The grade is on the listing. We do not ship batteries internationally.",
  },
  {
    label: "Privacy",
    body: "We store your account email and order history to run the service. That data lives in Supabase. We do not sell it. We do not run ad tracking. Want out? Email us and we purge your account.",
  },
];

export default function PoliciesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="label-mono text-ink-soft">Takeoff Parts Co.</p>
      <h1 className="font-display text-5xl font-bold uppercase tracking-tight">
        The fine print
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        The whole rulebook, in plain English. No surprises buried in legal
        boilerplate.
      </p>
      <div className="mt-8 space-y-4">
        {SECTIONS.map((s) => (
          <section key={s.label} className="border border-line bg-paper-raised p-6">
            <h2 className="label-mono text-ink-soft">{s.label}</h2>
            <p className="mt-2 text-sm leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
