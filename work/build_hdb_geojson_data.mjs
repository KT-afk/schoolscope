import fs from "node:fs/promises";

const hdbBuildingsPath = "work/hdb-existing-building.geojson";
const subzonesPath = "work/master-plan-2019-subzone.geojson";
const blocksOutputPath = "public/data/hdb-blocks.json";
const areasOutputPath = "public/data/hdb-areas.json";
const estatesCompatOutputPath = "public/data/hdb-estates.sample.json";

function centroidOfGeometry(geometry) {
  const points = flattenCoordinates(geometry.coordinates, geometry.type);
  let longitude = 0;
  let latitude = 0;
  for (const [lng, lat] of points) {
    longitude += lng;
    latitude += lat;
  }
  return {
    latitude: latitude / points.length,
    longitude: longitude / points.length
  };
}

function flattenCoordinates(coordinates, type) {
  if (type === "Point") return [coordinates];
  if (type === "Polygon") return coordinates.flat();
  if (type === "MultiPolygon") return coordinates.flat(2);
  return [];
}

function exteriorRing(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates[0];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.sort((a, b) => b[0].length - a[0].length)[0][0];
  return [];
}

function bboxOfRing(ring) {
  return ring.reduce(
    (bbox, [lng, lat]) => ({
      minLng: Math.min(bbox.minLng, lng),
      maxLng: Math.max(bbox.maxLng, lng),
      minLat: Math.min(bbox.minLat, lat),
      maxLat: Math.max(bbox.maxLat, lat)
    }),
    { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
  );
}

function pointInsideRing(point, ring) {
  let inside = false;
  let j = ring.length - 1;
  for (let i = 0; i < ring.length; i += 1) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];
    const crosses = latI > point.latitude !== latJ > point.latitude;
    if (crosses) {
      const lngAtLat = ((lngJ - lngI) * (point.latitude - latI)) / (latJ - latI) + lngI;
      if (point.longitude < lngAtLat) inside = !inside;
    }
    j = i;
  }
  return inside;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleCase(value) {
  return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function normalizePostal(value) {
  const postal = String(value ?? "").trim();
  return postal && postal !== "0" ? postal.padStart(6, "0") : undefined;
}

function findSubzone(point, subzones) {
  return subzones.find((subzone) => {
    const { bbox } = subzone;
    return (
      point.longitude >= bbox.minLng &&
      point.longitude <= bbox.maxLng &&
      point.latitude >= bbox.minLat &&
      point.latitude <= bbox.maxLat &&
      pointInsideRing(point, subzone.ring)
    );
  });
}

const [hdbBuildings, subzoneGeojson] = await Promise.all([
  fs.readFile(hdbBuildingsPath, "utf8").then(JSON.parse),
  fs.readFile(subzonesPath, "utf8").then(JSON.parse)
]);

const subzones = subzoneGeojson.features.map((feature) => {
  const ring = exteriorRing(feature.geometry);
  return {
    id: feature.properties.SUBZONE_C,
    name: titleCase(feature.properties.SUBZONE_N),
    town: titleCase(feature.properties.PLN_AREA_N),
    townCode: feature.properties.PLN_AREA_C,
    ring,
    bbox: bboxOfRing(ring),
    centroid: centroidOfGeometry(feature.geometry)
  };
});

const blocks = [];
const areaGroups = new Map();
let unmatched = 0;

for (const feature of hdbBuildings.features) {
  const centroid = centroidOfGeometry(feature.geometry);
  const subzone = findSubzone(centroid, subzones);
  if (!subzone) unmatched += 1;

  const block = String(feature.properties.BLK_NO ?? "").trim();
  const postalCode = normalizePostal(feature.properties.POSTAL_COD);
  const area = subzone ?? {
    id: "unknown",
    name: "Unknown HDB Area",
    town: "Unknown",
    townCode: "UNK",
    ring: [],
    centroid
  };

  const blockRecord = {
    id: `hdb-block-${feature.properties.OBJECTID}`,
    block,
    name: `Blk ${block}${postalCode ? `, Singapore ${postalCode}` : ""}`,
    area: area.name,
    town: area.town,
    townCode: area.townCode,
    postalCode,
    latitude: Number(centroid.latitude.toFixed(8)),
    longitude: Number(centroid.longitude.toFixed(8))
  };
  blocks.push(blockRecord);

  const group = areaGroups.get(area.id) ?? {
    id: `hdb-area-${slugify(area.id)}`,
    name: area.name,
    town: area.town,
    townCode: area.townCode,
    latitude: 0,
    longitude: 0,
    blockCount: 0,
    polygon: area.ring.map(([longitude, latitude]) => ({ latitude, longitude }))
  };
  group.latitude += blockRecord.latitude;
  group.longitude += blockRecord.longitude;
  group.blockCount += 1;
  areaGroups.set(area.id, group);
}

const areas = Array.from(areaGroups.values())
  .filter((area) => area.blockCount > 0 && area.town !== "Unknown")
  .map((area) => ({
    ...area,
    latitude: Number((area.latitude / area.blockCount).toFixed(8)),
    longitude: Number((area.longitude / area.blockCount).toFixed(8))
  }))
  .sort((a, b) => a.town.localeCompare(b.town) || a.name.localeCompare(b.name));

blocks.sort((a, b) => a.town.localeCompare(b.town) || a.area.localeCompare(b.area) || a.block.localeCompare(b.block, undefined, { numeric: true }));

await fs.writeFile(blocksOutputPath, `${JSON.stringify(blocks, null, 2)}\n`);
await fs.writeFile(areasOutputPath, `${JSON.stringify(areas, null, 2)}\n`);
await fs.writeFile(estatesCompatOutputPath, `${JSON.stringify(areas, null, 2)}\n`);

console.log(`wrote ${blocks.length} HDB building centroids to ${blocksOutputPath}`);
console.log(`wrote ${areas.length} HDB areas to ${areasOutputPath}`);
console.log(`unmatched buildings: ${unmatched}`);
