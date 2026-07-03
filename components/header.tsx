"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import YourRideChip from "@/components/your-ride-chip";

const NAV = [
  { href: "/bikes", label: "Your bike" },
  { href: "/parts", label: "Upgrade parts" },
  { href: "/used", label: "Used takeoffs" },
  { href: "/trade-in", label: "Trade in" },
];

const MOBILE_NAV = [...NAV, { href: "/account", label: "Garage" }];

export default function Header() {
  const { count } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu when the route changes.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

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
          <YourRideChip />
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`hidden items-center border-l border-line text-sm font-medium hover:bg-paper sm:flex sm:px-5 ${
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
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex items-center border-l border-line px-4 hover:bg-paper sm:hidden"
          >
            {menuOpen ? (
              <span aria-hidden="true" className="text-base leading-none">
                ✕
              </span>
            ) : (
              <span aria-hidden="true" className="flex flex-col gap-1">
                <span className="block h-0.5 w-5 bg-ink" />
                <span className="block h-0.5 w-5 bg-ink" />
                <span className="block h-0.5 w-5 bg-ink" />
              </span>
            )}
          </button>
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
      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-line sm:hidden"
        >
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`block border-b border-line px-4 py-3 text-sm font-medium last:border-b-0 hover:bg-paper ${
                pathname.startsWith(item.href) ? "text-accent" : "text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
