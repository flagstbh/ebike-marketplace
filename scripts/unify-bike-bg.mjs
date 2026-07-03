// Unify all manufacturer bike photos onto our paper studio background via Fal
// Bria bg-removal + warm grade, matching the 7 permissioned partner images.
// Quality gate: measures the cutout's opaque coverage; a bad cutout (too much
// or too little removed) is SKIPPED so the bike keeps its clean original photo.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
const FAL = process.env.FAL_KEY;
const dir = process.argv[2];
const FRIEND = new Set(["surron-light-bee-x","surron-ultra-bee","surron-hyper-bee","super73-mzft","super73-m1d","super73-b1g","super73-z-miami"]);
const W = 1400, H = 933;

const rows = fs.readdirSync(dir).filter(f=>/^manifest.*\.json$/.test(f))
  .flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")))
  .filter(r=>r.status==="downloaded" && r.image_url && !FRIEND.has(r.slug));

const swapped=[], kept=[], errored=[];
for (const r of rows) {
  try {
    const res = await fetch("https://fal.run/fal-ai/bria/background/remove", {
      method:"POST", headers:{Authorization:`Key ${FAL}`,"Content-Type":"application/json"},
      body: JSON.stringify({ image_url: r.image_url }),
    });
    const j = await res.json();
    if (!res.ok || !j.image?.url) { errored.push(r.slug); continue; }
    const cut = Buffer.from(await (await fetch(j.image.url)).arrayBuffer());
    const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let opaque=0; const total=info.width*info.height;
    for (let i=3;i<data.length;i+=info.channels) if (data[i]>128) opaque++;
    const frac = opaque/total;
    if (frac < 0.08 || frac > 0.65) { kept.push(`${r.slug}(${frac.toFixed(2)})`); continue; }
    const scaled = await sharp(cut).modulate({saturation:1.08}).resize({width:Math.round(W*0.9),height:Math.round(H*0.9),fit:"inside"}).png().toBuffer();
    await sharp({create:{width:W,height:H,channels:3,background:"#f2efe9"}}).composite([{input:scaled,gravity:"center"}]).jpeg({quality:88,mozjpeg:true}).toFile(`public/bikes/${r.slug}.jpg`);
    swapped.push(r.slug);
  } catch(e) { errored.push(`${r.slug}:${e.message.slice(0,30)}`); }
}
console.log(`swapped:${swapped.length} kept-plain(gate):${kept.length} errored:${errored.length}`);
if (kept.length) console.log("KEPT PLAIN:", kept.join(", "));
if (errored.length) console.log("ERRORED (kept plain):", errored.join(", "));
fs.writeFileSync("scripts/_swapped.json", JSON.stringify(swapped));
