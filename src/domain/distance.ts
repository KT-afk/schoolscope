import type { HdbEstate, LatLngPoint } from "../types";

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number
): number {
  const dLat = toRadians(endLatitude - startLatitude);
  const dLng = toRadians(endLongitude - startLongitude);
  const lat1 = toRadians(startLatitude);
  const lat2 = toRadians(endLatitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export function estateIntersectsCircle(
  estate: HdbEstate,
  centerLatitude: number,
  centerLongitude: number,
  radiusMeters = 1_000
): boolean {
  if (!estate.polygon?.length) {
    return haversineMeters(centerLatitude, centerLongitude, estate.latitude, estate.longitude) <= radiusMeters;
  }

  return (
    estate.polygon.some(
      (point) => haversineMeters(centerLatitude, centerLongitude, point.latitude, point.longitude) <= radiusMeters
    ) || pointInsidePolygon({ latitude: centerLatitude, longitude: centerLongitude }, estate.polygon)
  );
}

function pointInsidePolygon(point: LatLngPoint, polygon: LatLngPoint[]): boolean {
  let inside = false;
  let j = polygon.length - 1;
  for (let i = 0; i < polygon.length; i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    const crosses = pi.longitude > point.longitude !== pj.longitude > point.longitude;
    if (crosses) {
      const latitudeAtLongitude =
        ((pj.latitude - pi.latitude) * (point.longitude - pi.longitude)) /
          (pj.longitude - pi.longitude) +
        pi.latitude;
      if (point.latitude < latitudeAtLongitude) inside = !inside;
    }
    j = i;
  }
  return inside;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function formatDistance(meters?: number): string {
  if (meters === undefined) return "Select estate";
  if (meters < 1_000) return `${Math.round(meters)} m`;
  return `${(meters / 1_000).toFixed(1)} km`;
}
