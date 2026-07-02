// Verifies every product image URL in the database serves bytes that
// exactly match the local source file. Run after any image change.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.SITE_URL ?? "https://www.takeoffpartsco.com";
const supabaseUrl = "https://jabktttgfxvcuszksncj.supabase.co";
const anonKey = "sb_publishable_u5ojX6kskzYfglTnpXk2_w_uyDVJfRY";

const rows = await fetch(
  `${supabaseUrl}/rest/v1/products?select=slug,image_url&image_url=not.is.null`,
  { headers: { apikey: anonKey } }
).then((r) => r.json());

let failures = 0;
for (const { slug, image_url } of rows) {
  const local = path.join("public", image_url);
  try {
    const localHash = createHash("sha256").update(await readFile(local)).digest("hex");
    const res = await fetch(base + image_url, { cache: "no-store" });
    const remoteHash = createHash("sha256")
      .update(Buffer.from(await res.arrayBuffer()))
      .digest("hex");
    const ok = res.status === 200 && localHash === remoteHash;
    if (!ok) failures++;
    console.log(ok ? "OK  " : "FAIL", slug, ok ? "" : `(status ${res.status}, hash match: ${localHash === remoteHash})`);
  } catch (e) {
    failures++;
    console.log("FAIL", slug, e.message);
  }
}
console.log(failures === 0 ? `\nAll ${rows.length} images verified.` : `\n${failures} of ${rows.length} images FAILED.`);
process.exit(failures === 0 ? 0 : 1);
