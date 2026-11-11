// Refreshes specs/<slug>.json for every platform in the live API.SH catalog, and index.json.
// No API key needed: the catalog and the specs are public. Node 18+, no dependencies.
//
//   node scripts/sync.mjs                 # everything
//   node scripts/sync.mjs reddit zillow   # only these platforms (index.json is still rebuilt)
//
// A spec that can't be fetched keeps its previous copy and is listed at the end; the exit code is 1 only if
// more than a tenth of the platforms failed, so one slow platform doesn't block the daily update.

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = process.env.APISH_CATALOG_URL ?? "https://api.api.sh/catalog";
const SPEC = (slug) => `https://api.sh/openapi/${slug}.json`;
const CONCURRENCY = 4;
const ATTEMPTS = 4;
// Not stored here, read them from the live URL instead: legislation.gov.uk's amendment records use ids shaped like
// "key-<32 hex>", which GitHub's secret scanning mistakes for an email-service API key and refuses to accept.
const SKIP = new Set(["legislation-gov-uk"]);
const HEADERS = { accept: "application/json", "user-agent": "apish-openapi-sync (+https://api.sh)" };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return await res.json();
      // 4xx other than 408/429 won't get better by asking again
      if (res.status < 500 && ![408, 429].includes(res.status)) throw Object.assign(new Error(`HTTP ${res.status}`), { final: true });
      if (attempt >= ATTEMPTS) throw new Error(`HTTP ${res.status}`);
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
    } catch (error) {
      if (error.final || attempt >= ATTEMPTS) throw error;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

const stable = (value) => JSON.stringify(value, null, 2) + "\n";

async function main() {
  const only = process.argv.slice(2);
  const catalog = await getJson(CATALOG);
  const platforms = [...catalog.platforms].filter((p) => !SKIP.has(p.slug)).sort((a, b) => a.slug.localeCompare(b.slug));
  if (!platforms.length) throw new Error("the catalog lists no platforms; not touching anything");
  await mkdir(join(ROOT, "specs"), { recursive: true });

  const todo = only.length ? platforms.filter((p) => only.includes(p.slug)) : platforms;
  const failed = [];
  let changed = 0;
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < todo.length) {
      const p = todo[next++];
      const file = join(ROOT, "specs", `${p.slug}.json`);
      try {
        const spec = await getJson(SPEC(p.slug));
        if (!spec.openapi || !spec.paths) throw new Error("not an OpenAPI document");
        const text = stable(spec);
        const before = await readFile(file, "utf8").catch(() => null);
        if (before !== text) {
          await writeFile(file, text);
          changed++;
        }
      } catch (error) {
        failed.push({ slug: p.slug, error: error.message });
      }
    }
  }));

  // Platforms that left the catalog lose their spec.
  const keep = new Set(platforms.map((p) => `${p.slug}.json`));
  let removed = 0;
  if (!only.length) {
    for (const name of await readdir(join(ROOT, "specs"))) {
      if (name.endsWith(".json") && !keep.has(name)) {
        await rm(join(ROOT, "specs", name));
        removed++;
      }
    }
  }

  const present = new Set(await readdir(join(ROOT, "specs")));
  const index = {
    source: CATALOG,
    platforms: platforms.filter((p) => present.has(`${p.slug}.json`)).map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      endpoints: p.endpoints.length,
      spec: `specs/${p.slug}.json`,
      url: SPEC(p.slug),
    })),
  };
  await writeFile(join(ROOT, "index.json"), stable(index));

  console.log(`${todo.length} platforms checked: ${changed} specs changed, ${removed} removed, ${failed.length} failed`);
  for (const f of failed) console.log(`  failed: ${f.slug} (${f.error})`);
  if (failed.length > todo.length / 10) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
