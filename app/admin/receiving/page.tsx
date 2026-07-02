import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReceivingDesk from "@/components/receiving-desk";

export const dynamic = "force-dynamic";

export default async function AdminReceivingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/receiving");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="px-4 py-20 sm:px-8">
        <h1 className="font-display text-4xl font-bold uppercase">Receiving desk</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          This area is for dock staff only. Ask an admin to promote your account
          in Supabase:{" "}
          <code className="label-mono bg-paper-raised px-1">
            update profiles set role = &apos;admin&apos; where user_id = &apos;…&apos;;
          </code>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-line px-4 py-10 sm:px-8">
        <p className="label-mono text-accent">Dock operations</p>
        <h1 className="font-display text-5xl font-bold uppercase tracking-tight">
          Receiving desk
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
          Trade-ins over $50 stay pending until parts arrive. Mark received,
          adjust final credit per line if condition differs, then release
          spendable credit or reject.
        </p>
      </div>
      <ReceivingDesk />
    </div>
  );
}
