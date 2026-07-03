// Aftermarket upgrade + fitment seeder: reads data/upgrades-v4/*.json.
// Dry-run by default; --execute writes. Requires SUPABASE_SECRET_KEY.
//
// The fitment floor (founder: "we CANNOT be wrong"): status must be
// verified|check; "verified" without an evidence note is downgraded to
// "check" here — a wrong verified is the one unforgivable error.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SUPABASE_URL = "https://jabktttgfxvcuszksncj.supabase.co";
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!KEY) {
  console.error("SUPABASE_SECRET_KEY not set");
  process.exit(1);
}
const EXECUTE = process.argv.includes("--execute");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(pathname, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${pathname}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const MAGIC = [
  [0xff, 0xd8, 0xff], // jpeg
  [0x89, 0x50, 0x4e, 0x47], // png
  [0x52, 0x49, 0x46, 0x46], // webp (RIFF)
];
function looksLikeImage(buf) {
  return MAGIC.some((m) => m.every((b, i) => buf[i] === b));
}

async function fetchImage(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000 || !looksLikeImage(buf)) throw new Error("not an image / too small");
  return buf;
}

async function main() {
  const dir = path.join(process.cwd(), "data", "upgrades-v4");
  const dossiers = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("seed-"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));

  const [dbProducts, dbBikes, dbCategories, dbFitments] = await Promise.all([
    rest("products?select=id,slug,brand,name,image_url&limit=1000"),
    rest("bike_models?select=id,slug&limit=1000"),
    rest("categories?select=id,slug"),
    rest("product_fitments?select=id,product_id,bike_id&limit=5000"),
  ]);
  const catBySlug = Object.fromEntries(dbCategories.map((c) => [c.slug, c.id]));
  const bikeBySlug = new Map(dbBikes.map((b) => [b.slug, b.id]));
  const productByKey = new Map(dbProducts.map((p) => [norm(p.brand + p.name), p]));
  const usedSlugs = new Set(dbProducts.map((p) => p.slug));

  const report = { newProducts: [], imageFails: [], fitments: { verified: 0, check: 0, downgraded: 0, badBike: [], badProduct: [] } };

  // ---- products ----
  const toInsert = []; // {row, imageUrl}
  for (const d of dossiers) {
    for (const p of d.products ?? []) {
      if (p.name.toLowerCase().startsWith(p.brand.toLowerCase() + " ")) p.name = p.name.slice(p.brand.length + 1);
      const key = norm(p.brand + p.name);
      if (productByKey.has(key) || toInsert.some((t) => norm(t.row.brand + t.row.name) === key)) continue;
      if (!catBySlug[p.category_slug] || !p.price_cents) {
        report.fitments.badProduct.push(`${p.brand} ${p.name}: bad category/price`);
        continue;
      }
      let slug = kebab(`${p.brand} ${p.name}`);
      while (usedSlugs.has(slug)) slug = `${slug}-2`;
      usedSlugs.add(slug);
      toInsert.push({
        row: {
          slug,
          name: p.name,
          brand: p.brand,
          category_id: catBySlug[p.category_slug],
          condition: "new",
          description: p.description ?? "The upgrade riders actually buy for this slot.",
          specs: {},
          fits: [],
          price_cents: p.price_cents,
          compare_at_cents: null,
          stock: 10,
          image_url: null,
          featured: false,
          source: "retail",
          condition_note: null,
        },
        imageUrl: p.image_url ?? null,
      });
      report.newProducts.push(slug);
    }
  }

  // ---- fitments ----
  const seenPair = new Set(dbFitments.map((f) => f.product_id + f.bike_id));
  const fitmentsBySlug = []; // resolved to product ids after insert
  for (const d of dossiers) {
    for (const f of d.fitments ?? []) {
      let name = f.product_name;
      if (name.toLowerCase().startsWith(f.product_brand.toLowerCase() + " ")) name = name.slice(f.product_brand.length + 1);
      const key = norm(f.product_brand + name);
      const bikeId = bikeBySlug.get(f.bike_slug);
      if (!bikeId) {
        report.fitments.badBike.push(`${f.bike_slug} (${f.product_name})`);
        continue;
      }
      let status = f.status === "verified" ? "verified" : "check";
      if (status === "verified" && (!f.note || f.note.length < 20)) {
        status = "check";
        report.fitments.downgraded++;
      }
      report.fitments[status]++;
      fitmentsBySlug.push({ key, bikeId, years: f.years ?? null, status, note: f.note ?? null });
    }
  }

  console.log(`products: ${toInsert.length} new (${dbProducts.length} existing)`);
  console.log(`fitments: ${fitmentsBySlug.length} rows — ${report.fitments.verified} verified, ${report.fitments.check} check (${report.fitments.downgraded} downgraded for missing evidence)`);
  if (report.fitments.badBike.length) console.log("unknown bikes skipped:", report.fitments.badBike.slice(0, 5).join("; "), report.fitments.badBike.length > 5 ? `+${report.fitments.badBike.length - 5} more` : "");
  if (report.fitments.badProduct.length) report.fitments.badProduct.forEach((w) => console.log("WARN", w));
  writeFileSync(path.join(dir, "seed-upgrades-report.json"), JSON.stringify(report, null, 1));

  if (!EXECUTE) return console.log("\nDRY RUN — pass --execute to write.");

  // download + encode images, then insert products
  for (const t of toInsert) {
    if (!t.imageUrl) continue;
    try {
      const buf = await fetchImage(t.imageUrl);
      const out = path.join("public", "products", `${t.row.slug}.jpg`);
      await sharp(buf).resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85, mozjpeg: true }).toFile(out);
      t.row.image_url = `/products/${t.row.slug}.jpg`;
    } catch (e) {
      report.imageFails.push(`${t.row.slug}: ${e.message.slice(0, 60)}`);
    }
  }
  const inserted = [];
  for (let i = 0; i < toInsert.length; i += 100) {
    const res = await rest("products", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(toInsert.slice(i, i + 100).map((t) => t.row)) });
    inserted.push(...res);
  }
  console.log(`inserted ${inserted.length} products (${report.imageFails.length} image failures -> placeholder)`);
  report.imageFails.forEach((f) => console.log("IMG FAIL", f));
  for (const row of inserted) productByKey.set(norm(row.brand + row.name), row);

  // resolve + dedupe fitments: one row per (product, bike). A dossier can
  // list the same pair twice (e.g. a product that fits multiple year ranges);
  // Postgres upsert forbids touching a row twice per command, so collapse
  // here, keeping verified over check and the longer evidence note.
  const byPair = new Map();
  for (const f of fitmentsBySlug) {
    const product = productByKey.get(f.key);
    if (!product) {
      report.fitments.badProduct.push(`fitment for unknown product: ${f.key}`);
      continue;
    }
    const pair = product.id + f.bikeId;
    const cand = { product_id: product.id, bike_id: f.bikeId, years: f.years, status: f.status, note: f.note };
    const prev = byPair.get(pair);
    if (!prev) { byPair.set(pair, cand); continue; }
    const better =
      (cand.status === "verified" && prev.status !== "verified") ||
      (cand.status === prev.status && (cand.note?.length ?? 0) > (prev.note?.length ?? 0));
    if (better) byPair.set(pair, cand);
  }
  const rows = [...byPair.values()];
  for (let i = 0; i < rows.length; i += 200) {
    await rest("product_fitments?on_conflict=product_id,bike_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows.slice(i, i + 200)),
    });
  }
  console.log(`upserted ${rows.length} fitment rows`);
  writeFileSync(path.join(dir, "seed-upgrades-report.json"), JSON.stringify(report, null, 1));
  console.log("DONE");
}

main().catch((e) => { console.error(e); process.exit(1); });
