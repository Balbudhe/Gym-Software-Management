const GEOFENCE_METERS = Number(process.env.TRAINER_GEOFENCE_METERS || 200);

const parseCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const parseAttendanceLocation = (body = {}) => {
  const lat = parseCoordinate(body.latitude ?? body.lat);
  const lng = parseCoordinate(body.longitude ?? body.lng);
  if (lat == null || lng == null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const accuracy = parseCoordinate(body.accuracy);
  return {
    lat,
    lng,
    accuracy: accuracy != null && accuracy >= 0 ? accuracy : null,
    address: '',
  };
};

const reverseGeocode = async (lat, lng) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'GymSoftwareWebsite/1.0 (trainer-attendance)' },
      signal: controller.signal,
    });
    if (!response.ok) return '';
    const data = await response.json();
    return String(data.display_name || '').trim();
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
};

const withAddress = async (location) => {
  if (!location) return null;
  const address = await reverseGeocode(location.lat, location.lng);
  return { ...location, address };
};

const requireAttendanceLocation = async (body) => {
  const location = parseAttendanceLocation(body);
  if (!location) {
    const error = new Error('Location is required. Allow location access and try again.');
    error.statusCode = 400;
    throw error;
  }
  return withAddress(location);
};

const toRad = (degrees) => (degrees * Math.PI) / 180;

const distanceMeters = (from, to) => {
  if (!from || !to || from.lat == null || to.lat == null) return null;
  const earthRadius = 6371000;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(haversine)));
};

const isOutsideCheckInArea = (checkInLocation, currentLocation) => {
  const distance = distanceMeters(checkInLocation, currentLocation);
  if (distance == null) return { outside: false, distance: null, radius: GEOFENCE_METERS };
  const accuracyBuffer = (Number(checkInLocation.accuracy) || 0) + (Number(currentLocation.accuracy) || 0);
  const radius = Math.max(GEOFENCE_METERS, accuracyBuffer + 50);
  return { outside: distance > radius, distance, radius };
};

const locationLabel = (location) => {
  if (!location) return 'Unknown location';
  if (location.address) return location.address;
  if (location.lat == null || location.lng == null) return 'Unknown location';
  return `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}`;
};

const mapsUrl = (location) =>
  location?.lat != null && location?.lng != null
    ? `https://maps.google.com/?q=${location.lat},${location.lng}`
    : '';

module.exports = {
  GEOFENCE_METERS,
  parseAttendanceLocation,
  requireAttendanceLocation,
  withAddress,
  distanceMeters,
  isOutsideCheckInArea,
  locationLabel,
  mapsUrl,
};
