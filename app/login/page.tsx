import { Suspense } from "react";
import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="label-mono text-ink-soft">Your garage</p>
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        One account holds your trade-in credit, orders, and shipping labels.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
