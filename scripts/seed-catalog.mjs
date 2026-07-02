// Expert Catalog seeder: reconciles data/catalog-research/*.json into Supabase.
// Dry-run by default; pass --execute to write. Requires SUPABASE_SECRET_KEY in env.
//
// What it does, in order:
//   1. Fetch current DB state (bikes, parts mappings, catalog, products, categories).
//   2. Merge the six research dossiers: dedupe catalog entries by name, dedupe
//      upgrade products by brand+name, match existing bikes/products so slugs
//      and ids are preserved.
//   3. Enforce the pricing floor: base value can never exceed 50% of comp
//      (40% for halo bikes); violations clamp DOWN.
//   4. Execute: insert new products -> insert catalog entries -> upsert bikes
//      -> rebuild bike_stock_parts for covered bikes -> deactivate the old
//      generic catalog entries. A full pre-state backup is written first.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SUPABASE_URL = "https://jabktttgfxvcuszksncj.supabase.co";
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!KEY) {
  console.error("SUPABASE_SECRET_KEY not set");
  process.exit(1);
}
const EXECUTE = process.argv.includes("--execute");

const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function rest(pathname, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...init,
    headers: { ...H, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${pathname}: ${res.status} ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchAll(table, select = "*") {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const page = await rest(`${table}?select=${select}&limit=1000&offset=${from}`);
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

async function insertChunked(table, rows, returning = "representation") {
  const out = [];
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const res = await rest(table, {
      method: "POST",
      headers: { Prefer: `return=${returning}` },
      body: JSON.stringify(chunk),
    });
    if (res) out.push(...res);
  }
  return out;
}

const norm = (s) =>
  (s ?? "")
    .toLowerCase()
    .replace(/\b(e-?bikes?|bikes?|power)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

const kebab = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// Map a free-text component name to a category slug.
function categoryFor(component, upgradeSlug) {
  const c = component.toLowerCase();
  const rules = [
    [/battery|charger|range/, "batteries"],
    [/motor|drive unit/, "motors"],
    [/display|controller|throttle|remote/, "controllers-displays"],
    [/derailleur|drivetrain|chain|sprocket|cassette|shifter|crank|belt|pedal assist/, "drivetrain"],
    [/brake/, "brakes"],
    [/tire|tyre|wheel|tube/, "tires-wheels"],
    [/fork|shock|suspension|seatpost/, "suspension"],
    [/rack|fender|basket|cargo|kickstand/, "racks-cargo"],
    [/saddle|seat|grip|pedal|cockpit|handlebar|bar|stem|footpeg|mirror|light/, "cockpit"],
  ];
  for (const [re, slug] of rules) if (re.test(c)) return slug;
  return upgradeSlug ?? "cockpit";
}

async function main() {
  const dir = path.join(process.cwd(), "data", "catalog-research");
  const dossiers = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));

  const [dbBikes, dbParts, dbCatalog, dbProducts, dbCategories] = await Promise.all([
    fetchAll("bike_models"),
    fetchAll("bike_stock_parts"),
    fetchAll("trade_in_catalog"),
    fetchAll("products"),
    fetchAll("categories"),
  ]);

  writeFileSync(
    path.join(process.cwd(), "data", "backups", "pre-expert-catalog.json"),
    JSON.stringify({ when: new Date().toISOString(), dbBikes, dbParts, dbCatalog, dbProducts }, null, 1)
  );

  const catBySlug = Object.fromEntries(dbCategories.map((c) => [c.slug, c.id]));
  const bikeByKey = new Map(dbBikes.map((b) => [norm(b.brand + b.model), b]));
  const bikeBySlug = new Map(dbBikes.map((b) => [b.slug, b]));
  const productByKey = new Map(dbProducts.map((p) => [norm(p.brand + p.name), p]));
  const oldGenericCatalogIds = dbCatalog.filter((c) => c.brand === "OEM").map((c) => c.id);

  const report = { newBikes: [], matchedBikes: [], newProducts: [], matchedProducts: [], clamps: [], warnings: [] };

  // ---- 1. collect bikes ----------------------------------------------------
  let sortNext = Math.max(...dbBikes.map((b) => b.sort)) + 10;
  const bikesOut = []; // {row, existing, parts:[...]}
  const seenBikeKeys = new Set();
  for (const dossier of dossiers) {
    for (const bike of dossier.bikes) {
      const key = norm(bike.brand + bike.model);
      if (seenBikeKeys.has(key)) {
        report.warnings.push(`duplicate bike across dossiers skipped: ${bike.brand} ${bike.model}`);
        continue;
      }
      seenBikeKeys.add(key);
      const existing = bikeByKey.get(key) ?? bikeBySlug.get(bike.slug);
      const row = {
        slug: existing ? existing.slug : bikeBySlug.has(bike.slug) ? `${bike.slug}-2` : bike.slug,
        brand: existing ? existing.brand : bike.brand,
        model: existing ? existing.model : bike.model,
        style: bike.style,
        motor: bike.motor,
        battery: bike.battery,
        years: bike.years,
        blurb: bike.blurb,
        tier: bike.tier,
        sort: existing ? existing.sort : sortNext++,
      };
      (existing ? report.matchedBikes : report.newBikes).push(row.slug);
      bikesOut.push({ row, existing, parts: bike.stock_parts, tier: bike.tier });
    }
  }

  // ---- 2. collect products (upgrades) --------------------------------------
  // Only upgrades attached to parts riders swap commonly become retail SKUs;
  // occasional-swap parts keep their upgrade_note text without a store link.
  // Keeps the retail catalog near the ~40-60 Brock approved.
  const productsOut = new Map(); // key -> {row, existing}
  const usedSlugs = new Set(dbProducts.map((p) => p.slug));
  for (const { parts } of bikesOut) {
    for (const p of parts) {
      const u = p.upgrade;
      if (!u) continue;
      if (p.swap_likelihood === "occasional") continue;
      const key = norm(u.brand + u.name);
      if (productsOut.has(key)) continue;
      const existing = productByKey.get(key) ?? dbProducts.find((dp) => norm(dp.name) === norm(u.name));
      if (existing) {
        productsOut.set(key, { existing });
        report.matchedProducts.push(existing.slug);
        continue;
      }
      if (!catBySlug[u.category_slug]) {
        report.warnings.push(`upgrade with unknown category dropped: ${u.name} (${u.category_slug})`);
        continue;
      }
      let slug = kebab(`${u.brand} ${u.name}`);
      while (usedSlugs.has(slug)) slug = `${slug}-2`;
      usedSlugs.add(slug);
      const row = {
        slug,
        name: u.name,
        brand: u.brand,
        category_id: catBySlug[u.category_slug],
        condition: "new",
        description: `${u.note ?? "The upgrade riders actually buy for this slot."} Fitment questions? The bike pages show exactly which stock part this replaces.`,
        specs: {},
        fits: [],
        price_cents: u.price_cents,
        compare_at_cents: u.compare_at_cents ?? null,
        stock: 10,
        image_url: null,
        featured: false,
        source: "retail",
        condition_note: null,
      };
      productsOut.set(key, { row });
      report.newProducts.push(row.slug);
    }
  }

  // ---- 3. collect catalog entries ------------------------------------------
  const catalogOut = new Map(); // normName -> {row, tierPct, upgradeKey}
  for (const { parts, tier } of bikesOut) {
    const pct = tier === "halo" ? 0.4 : 0.5;
    for (const p of parts) {
      const key = norm(p.catalog_name);
      let comp = p.ebay_comp_cents ?? null;
      let base = p.base_value_cents ?? 0;
      const cap = comp != null ? Math.floor((comp * pct) / 100) * 100 : 1000;
      if (base > cap) {
        report.clamps.push(`${p.catalog_name}: base ${base} -> ${cap}`);
        base = cap;
      }
      const entry = catalogOut.get(key);
      if (entry) {
        // Shared entry seen again: keep the LOWEST base value (never overpay),
        // keep the first non-null upgrade + comp metadata.
        if (base < entry.row.base_value_cents) entry.row.base_value_cents = base;
        if (entry.upgradeKey == null && p.upgrade) entry.upgradeKey = norm(p.upgrade.brand + p.upgrade.name);
        continue;
      }
      catalogOut.set(key, {
        row: {
          category_id: catBySlug[categoryFor(p.component, p.upgrade?.category_slug)],
          name: p.catalog_name,
          brand: p.catalog_brand,
          base_value_cents: base,
          ebay_comp_cents: comp,
          active: true,
          replaces_with_product_id: null,
          upgrade_note: p.upgrade?.note ?? null,
          comp_confidence: comp == null ? null : (p.comp_confidence ?? "estimated"),
          comp_note: p.comp_note ?? null,
        },
        upgradeKey: p.upgrade ? norm(p.upgrade.brand + p.upgrade.name) : null,
      });
    }
  }

  // ---- report ---------------------------------------------------------------
  const solid = [...catalogOut.values()].filter((c) => c.row.comp_confidence === "solid").length;
  const est = [...catalogOut.values()].filter((c) => c.row.comp_confidence === "estimated").length;
  const nulls = [...catalogOut.values()].filter((c) => c.row.ebay_comp_cents == null).length;
  console.log(`bikes:    ${bikesOut.length} total (${report.newBikes.length} new, ${report.matchedBikes.length} existing updated)`);
  console.log(`catalog:  ${catalogOut.size} entries (${solid} solid, ${est} estimated, ${nulls} no-comp) — ${oldGenericCatalogIds.length} old generics to deactivate`);
  console.log(`products: ${report.newProducts.length} new retail SKUs, ${report.matchedProducts.length} matched existing`);
  console.log(`mappings: ${bikesOut.reduce((n, b) => n + b.parts.length, 0)} bike_stock_parts rows to write`);
  if (report.clamps.length) console.log(`clamped DOWN ${report.clamps.length} base values (never-overpay rule)`);
  for (const w of report.warnings) console.log("WARN:", w);
  writeFileSync(path.join(process.cwd(), "data", "backups", "seed-report.json"), JSON.stringify(report, null, 1));

  if (!EXECUTE) {
    console.log("\nDRY RUN ONLY — pass --execute to write.");
    return;
  }

  // ---- 4. execute -----------------------------------------------------------
  // products first (catalog references them)
  const newProductRows = [...productsOut.values()].filter((p) => p.row).map((p) => p.row);
  const insertedProducts = await insertChunked("products", newProductRows);
  const productIdByKey = new Map();
  for (const [key, val] of productsOut) {
    if (val.existing) productIdByKey.set(key, val.existing.id);
  }
  for (const row of insertedProducts) {
    productIdByKey.set(norm(row.brand + row.name), row.id);
  }
  console.log(`inserted ${insertedProducts.length} products`);

  // catalog entries (all new, model-specific)
  const catalogRows = [...catalogOut.values()].map((c) => ({
    ...c.row,
    replaces_with_product_id: c.upgradeKey ? (productIdByKey.get(c.upgradeKey) ?? null) : null,
  }));
  const insertedCatalog = await insertChunked("trade_in_catalog", catalogRows);
  const catalogIdByName = new Map(insertedCatalog.map((c) => [norm(c.name), c.id]));
  console.log(`inserted ${insertedCatalog.length} catalog entries`);

  // bikes: patch existing, insert new
  const bikeIdBySlug = new Map();
  for (const b of bikesOut) {
    if (b.existing) {
      await rest(`bike_models?id=eq.${b.existing.id}`, { method: "PATCH", body: JSON.stringify(b.row) });
      bikeIdBySlug.set(b.row.slug, b.existing.id);
    }
  }
  const newBikeRows = bikesOut.filter((b) => !b.existing).map((b) => b.row);
  const insertedBikes = await insertChunked("bike_models", newBikeRows);
  for (const row of insertedBikes) bikeIdBySlug.set(row.slug, row.id);
  console.log(`updated ${bikesOut.length - newBikeRows.length} bikes, inserted ${insertedBikes.length}`);

  // rebuild mappings for every covered bike
  const coveredIds = bikesOut.map((b) => bikeIdBySlug.get(b.row.slug));
  await rest(`bike_stock_parts?bike_id=in.(${coveredIds.join(",")})`, { method: "DELETE" });
  const partRows = [];
  for (const b of bikesOut) {
    const bikeId = bikeIdBySlug.get(b.row.slug);
    b.parts.forEach((p, i) => {
      partRows.push({
        bike_id: bikeId,
        catalog_id: catalogIdByName.get(norm(p.catalog_name)) ?? null,
        component: p.component,
        stock_part: p.stock_part,
        swap_likelihood: p.swap_likelihood,
        sort: i + 1,
      });
    });
  }
  const insertedParts = await insertChunked("bike_stock_parts", partRows, "minimal");
  console.log(`rebuilt ${partRows.length} bike_stock_parts rows`);

  // deactivate old generic entries last
  await rest(`trade_in_catalog?id=in.(${oldGenericCatalogIds.join(",")})`, {
    method: "PATCH",
    body: JSON.stringify({ active: false }),
  });
  console.log(`deactivated ${oldGenericCatalogIds.length} generic catalog entries`);
  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
