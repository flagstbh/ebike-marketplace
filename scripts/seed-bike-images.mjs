// Encodes downloaded manufacturer bike photos into public/bikes/<slug>.jpg and
// sets bike_models.image_url. Reads manifest-*.json from a source dir.
// Usage: node scripts/seed-bike-images.mjs <source-dir> [--execute]
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SUPABASE_URL = "https://jabktttgfxvcuszksncj.supabase.co";
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!KEY) {
  console.error("SUPABASE_SECRET_KEY not set");
  process.exit(1);
}
const srcDir = process.argv[2];
const EXECUTE = process.argv.includes("--execute");
if (!srcDir) {
  console.error("usage: node scripts/seed-bike-images.mjs <source-dir> [--execute]");
  process.exit(1);
}

async function patch(slug, url) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bike_models?slug=eq.${slug}`, {
    method: "PATCH",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: url }),
  });
  if (!res.ok) throw new Error(`patch ${slug}: ${res.status} ${await res.text()}`);
}

async function main() {
  const manifests = readdirSync(srcDir).filter((f) => /^manifest.*\.json$/.test(f));
  const rows = manifests.flatMap((f) => JSON.parse(readFileSync(path.join(srcDir, f), "utf8")));
  const downloaded = rows.filter((r) => r.status === "downloaded" && r.file);
  const notFound = rows.filter((r) => r.status !== "downloaded");
  console.log(`manifests: ${manifests.length} | downloaded: ${downloaded.length} | not_found: ${notFound.length}`);

  const encoded = [];
  const failed = [];
  const skipped = [];
  for (const r of downloaded) {
    // Preserve pre-placed images (e.g. permissioned/edited photos) — never
    // overwrite an existing public/bikes/<slug>.jpg from a manufacturer source.
    if (existsSync(path.join("public", "bikes", `${r.slug}.jpg`))) {
      skipped.push(r.slug);
      continue;
    }
    const srcPath = path.join(srcDir, r.file);
    if (!existsSync(srcPath)) {
      failed.push(`${r.slug}: file missing (${r.file})`);
      continue;
    }
    try {
      await sharp(readFileSync(srcPath))
        .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(path.join("public", "bikes", `${r.slug}.jpg`));
      encoded.push(r.slug);
    } catch (e) {
      failed.push(`${r.slug}: ${e.message.slice(0, 60)}`);
    }
  }
  console.log(`encoded: ${encoded.length} | skipped (pre-placed): ${skipped.length} | encode failures: ${failed.length}`);
  failed.forEach((f) => console.log("  FAIL", f));

  if (!EXECUTE) return console.log("\nDRY RUN — pass --execute to update the DB.");

  // Update image_url for everything now present in public/bikes/ (encoded +
  // pre-placed), so the DB reflects the full set.
  const allSlugs = [...encoded, ...skipped];
  for (const slug of allSlugs) await patch(slug, `/bikes/${slug}.jpg`);
  console.log(`updated ${allSlugs.length} bike_models.image_url`);
}

main().catch((e) => { console.error(e); process.exit(1); });
