import sharp from "sharp";
const FAL = process.env.FAL_KEY;
const BASE = "https://lithiumpowersports.com/cdn/shop/files/";
// These 7 slugs are the permissioned partner-store (lithiumpowersports.com)
// photos. They must ALSO be tagged bike_models.image_source='partner' in the DB
// so the bike page does NOT caption them "manufacturer photo". If you add/remove
// a slug here, mirror it with an UPDATE on bike_models.image_source.
const MAP = {
  "surron-light-bee-x": "surron-light-bee-x-electric-bike-mco-nationwide-warranty-centers-black-erides-365.webp",
  "surron-ultra-bee": "surron-ultra-bee-21kw-electric-bike-mco-nationwide-warranty-centers-carbon-black-lower-erides-467.webp",
  "surron-hyper-bee": "surron-hyper-bee-edition-electric-bike-nationwide-warranty-centers-blue-14-front-12-rear-erides-608.webp",
  "super73-mzft": "super73-mzft-the-backyard-brawler-erides-929.webp",
  "super73-m1d": "super73-m1d-the-sweet-spot-erides-766.webp",
  "super73-b1g": "super73-b1g-se-the-final-boss-erides-774.webp",
  "super73-z-miami": "super73-z-miami-se-cooler-compact-cruiser-erides-425.webp",
};
const W = 1400, H = 933;
for (const [slug, file] of Object.entries(MAP)) {
  const res = await fetch("https://fal.run/fal-ai/bria/background/remove", {
    method: "POST", headers: { Authorization: `Key ${FAL}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: BASE + file }),
  });
  const j = await res.json();
  if (!res.ok || !j.image?.url) { console.log("FAIL", slug); continue; }
  const cut = Buffer.from(await (await fetch(j.image.url)).arrayBuffer());
  // slight warm grade on the cutout, then paper composite
  const scaled = await sharp(cut).modulate({ saturation: 1.08 }).resize({ width: Math.round(W*0.9), height: Math.round(H*0.9), fit: "inside" }).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: "#f2efe9" } })
    .composite([{ input: scaled, gravity: "center" }]).jpeg({ quality: 88, mozjpeg: true })
    .toFile(`public/bikes/${slug}.jpg`);
  console.log("swapped", slug);
}
