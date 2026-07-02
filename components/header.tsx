"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

const NAV = [
  { href: "/bikes", label: "Your bike" },
  { href: "/parts", label: "Upgrade parts" },
  { href: "/used", label: "Used takeoffs" },
  { href: "/trade-in", label: "Trade in" },
];

export default function Header() {
  const { count } = useCart();
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="label-mono flex items-center justify-between border-b border-line px-4 py-1.5 text-ink-soft sm:px-8">
        <span>Instant credit on stock parts, applied at checkout automatically</span>
        <span className="hidden sm:inline">Ships from Madison, WI</span>
      </div>
      <div className="flex items-stretch justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 py-4">
          <span className="font-display text-2xl font-bold uppercase leading-none tracking-tight">
            Takeoff
            <span className="text-accent">.</span>
          </span>
          <span className="label-mono hidden text-ink-soft md:inline">
            E-bike parts exchange
          </span>
        </Link>
        <nav className="flex items-stretch">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center border-l border-line px-3 text-sm font-medium hover:bg-paper sm:px-5 ${
                pathname.startsWith(item.href)
                  ? "text-accent"
                  : "text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/account"
            className={`hidden items-center border-l border-line px-5 text-sm font-medium hover:bg-paper sm:flex ${
              pathname.startsWith("/account") ? "text-accent" : "text-ink"
            }`}
          >
            Garage
          </Link>
          <Link
            href="/cart"
            className="flex items-center gap-2 border-l border-line bg-ink px-4 text-sm font-medium text-paper hover:bg-accent sm:px-6"
          >
            Cart
            <span className="label-mono rounded-none bg-paper px-1.5 py-0.5 text-ink">
              {count}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
