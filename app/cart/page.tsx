import CartView from "@/components/cart-view";
import { createClient } from "@/lib/supabase/server";

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let creditCents = 0;
  let pendingCents = 0;
  if (user) {
    const [{ data: available }, { data: pending }] = await Promise.all([
      supabase.rpc("get_available_credit"),
      supabase.rpc("get_pending_credit"),
    ]);
    creditCents = (available as number | null) ?? 0;
    pendingCents = (pending as number | null) ?? 0;
  }

  return (
    <CartView
      signedIn={!!user}
      creditCents={creditCents}
      pendingCents={pendingCents}
    />
  );
}
