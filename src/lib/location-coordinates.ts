export type JsonCoordinates = { lat?: unknown; lng?: unknown } | null | undefined;

export type MapLocation = { lat: number; lng: number; address: string };

export function normaliseCoordinates(coordinates: JsonCoordinates): { lat: number; lng: number } | null {
  if (!coordinates) return null;
  if (coordinates.lat === null || coordinates.lng === null) return null;
  if (coordinates.lat === '' || coordinates.lng === '') return null;
  const lat = typeof coordinates.lat === 'number' ? coordinates.lat : Number(coordinates.lat);
  const lng = typeof coordinates.lng === 'number' ? coordinates.lng : Number(coordinates.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function mapLocation(
  coordinates: JsonCoordinates,
  address: string | null | undefined,
  fallbackAddress: string
): MapLocation | undefined {
  const coords = normaliseCoordinates(coordinates);
  if (!coords) return undefined;
  return { ...coords, address: address || fallbackAddress };
}

export function mapFirstValidLocation(
  coordinateOptions: JsonCoordinates[],
  address: string | null | undefined,
  fallbackAddress: string
): MapLocation | undefined {
  for (const coordinates of coordinateOptions) {
    const location = mapLocation(coordinates, address, fallbackAddress);
    if (location) return location;
  }
  return undefined;
}
