import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink text-paper">
      <div className="grid gap-10 px-4 py-12 sm:grid-cols-3 sm:px-8">
        <div>
          <p className="font-display text-xl font-bold uppercase">
            Takeoff<span className="text-accent">.</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-paper/70">
            Every e-bike gets modified in its first month. We buy the stock
            parts you pull off, resell them to riders who need them, and put
            the credit toward your next upgrade.
          </p>
        </div>
        <div className="text-sm">
          <p className="label-mono mb-3 text-paper/50">Browse</p>
          <ul className="space-y-2">
            <li><Link href="/parts" className="hover:text-accent">Upgrade parts</Link></li>
            <li><Link href="/used" className="hover:text-accent">Used takeoffs</Link></li>
            <li><Link href="/trade-in" className="hover:text-accent">Get a trade-in quote</Link></li>
            <li><Link href="/account" className="hover:text-accent">Your garage</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="label-mono mb-3 text-paper/50">The fine print</p>
          <ul className="space-y-2 text-paper/70">
            <li>90-day warranty on all used parts</li>
            <li>Trade-in credit never expires</li>
            <li>Free shipping label for trade-ins over $50</li>
            <li>Batteries tested and capacity-graded before resale</li>
          </ul>
        </div>
      </div>
      <div className="label-mono border-t border-paper/15 px-4 py-4 text-paper/50 sm:px-8">
        Takeoff Parts Co. — Demo storefront
      </div>
    </footer>
  );
}
