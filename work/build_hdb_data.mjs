import fs from "node:fs/promises";

const inputFiles = [
  "work/hdb-property-0.json",
  "work/hdb-property-5000.json",
  "work/hdb-property-10000.json"
];
const cachePath = "work/onemap-hdb-geocode-cache.json";
const blocksOutputPath = "public/data/hdb-blocks.json";
const areasOutputPath = "public/data/hdb-areas.json";
const estatesCompatOutputPath = "public/data/hdb-estates.sample.json";

const townNames = {
  AMK: "Ang Mo Kio",
  BB: "Bukit Batok",
  BD: "Bedok",
  BH: "Bishan",
  BM: "Bukit Merah",
  BP: "Bukit Panjang",
  BT: "Bukit Timah",
  CCK: "Choa Chu Kang",
  CL: "Clementi",
  CT: "Central Area",
  GL: "Geylang",
  HG: "Hougang",
  JE: "Jurong East",
  JW: "Jurong West",
  KWN: "Kallang/Whampoa",
  MP: "Marine Parade",
  PG: "Punggol",
  PRC: "Pasir Ris",
  QT: "Queenstown",
  SB: "Sembawang",
  SK: "Sengkang",
  SR: "Serangoon",
  TAM: "Tampines",
  TG: "Tengah",
  TP: "Toa Payoh",
  WL: "Woodlands",
  YS: "Yishun"
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bAve\b/g, "Avenue")
    .replace(/\bRd\b/g, "Road")
    .replace(/\bSt\b/g, "Street")
    .replace(/\bDr\b/g, "Drive")
    .replace(/\bNth\b/g, "North")
    .replace(/\bSth\b/g, "South");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseIntField(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readRecords() {
  const pages = await Promise.all(inputFiles.map(async (path) => JSON.parse(await fs.readFile(path, "utf8"))));
  return pages.flatMap((page) => page.result.records);
}

async function readCache() {
  try {
    return new Map(Object.entries(JSON.parse(await fs.readFile(cachePath, "utf8"))));
  } catch {
    return new Map();
  }
}

async function writeCache(cache) {
  await fs.writeFile(cachePath, `${JSON.stringify(Object.fromEntries(cache), null, 2)}\n`);
}

function pickBestResult(results, record) {
  const block = String(record.blk_no).trim().toUpperCase();
  const street = String(record.street).trim().toUpperCase();
  return (
    results.find((item) => item.BLK_NO?.toUpperCase() === block && item.ROAD_NAME?.toUpperCase() === street) ??
    results.find((item) => item.BLK_NO?.toUpperCase() === block && item.ADDRESS?.toUpperCase().includes(street)) ??
    results[0]
  );
}

async function geocode(record, cache) {
  const query = `${record.blk_no} ${record.street}`.trim().replace(/\s+/g, " ");
  if (cache.has(query)) return cache.get(query);

  const url = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
  url.searchParams.set("searchVal", query);
  url.searchParams.set("returnGeom", "Y");
  url.searchParams.set("getAddrDetails", "Y");
  url.searchParams.set("pageNum", "1");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`OneMap geocode failed for ${query}: ${response.status}`);
  const payload = await response.json();
  const best = pickBestResult(payload.results ?? [], record);
  const result = best
    ? {
        latitude: Number(best.LATITUDE),
        longitude: Number(best.LONGITUDE),
        postalCode: best.POSTAL || undefined,
        address: best.ADDRESS || query
      }
    : null;

  cache.set(query, result);
  return result;
}

function buildAreas(blocks) {
  const groups = new Map();
  for (const block of blocks) {
    const key = `${block.townCode}|${block.street}`;
    const group = groups.get(key) ?? {
      id: `hdb-area-${slugify(block.townCode)}-${slugify(block.street)}`,
      name: titleCase(block.street),
      town: block.town,
      townCode: block.townCode,
      latitude: 0,
      longitude: 0,
      blockCount: 0,
      dwellingUnits: 0,
      blocks: []
    };
    group.latitude += block.latitude;
    group.longitude += block.longitude;
    group.blockCount += 1;
    group.dwellingUnits += block.totalDwellingUnits;
    group.blocks.push(block.block);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      latitude: Number((group.latitude / group.blockCount).toFixed(8)),
      longitude: Number((group.longitude / group.blockCount).toFixed(8)),
      blocks: group.blocks.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    }))
    .sort((a, b) => a.town.localeCompare(b.town) || a.name.localeCompare(b.name));
}

const rawRecords = await readRecords();
const residentialRecords = rawRecords.filter((record) => record.residential === "Y");
const cache = await readCache();
const blocks = [];
let completed = 0;
let missed = 0;

for (const record of residentialRecords) {
  const location = await geocode(record, cache);
  completed += 1;
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    missed += 1;
  } else {
    const townCode = String(record.bldg_contract_town || "").trim();
    const street = String(record.street || "").trim();
    blocks.push({
      id: `hdb-block-${slugify(record.blk_no)}-${slugify(street)}`,
      block: String(record.blk_no).trim(),
      street: titleCase(street),
      town: townNames[townCode] ?? townCode,
      townCode,
      address: location.address,
      postalCode: location.postalCode,
      latitude: location.latitude,
      longitude: location.longitude,
      totalDwellingUnits: parseIntField(record.total_dwelling_units),
      yearCompleted: parseIntField(record.year_completed) || undefined,
      maxFloorLevel: parseIntField(record.max_floor_lvl) || undefined
    });
  }

  if (completed % 250 === 0) {
    console.log(`geocoded ${completed}/${residentialRecords.length}; blocks=${blocks.length}; missed=${missed}`);
    await writeCache(cache);
    await sleep(150);
  }
}

await writeCache(cache);
const areas = buildAreas(blocks);
await fs.writeFile(blocksOutputPath, `${JSON.stringify(blocks, null, 2)}\n`);
await fs.writeFile(areasOutputPath, `${JSON.stringify(areas, null, 2)}\n`);
await fs.writeFile(estatesCompatOutputPath, `${JSON.stringify(areas, null, 2)}\n`);
console.log(`wrote ${blocks.length} HDB blocks to ${blocksOutputPath}`);
console.log(`wrote ${areas.length} HDB areas to ${areasOutputPath}`);
