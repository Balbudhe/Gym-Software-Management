const geoError = (error) => {
  if (error?.code === 1) return new Error('Allow location access to check in or check out');
  if (error?.code === 2) return new Error('Could not detect your location. Turn on GPS and try again');
  return new Error('Location request timed out. Keep GPS on and try again');
};

const fromCoords = (coords) => ({
  lat: coords.latitude,
  lng: coords.longitude,
  accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
});

export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(fromCoords(position.coords)),
      (error) => reject(geoError(error)),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });

export const getPrecisePosition = ({ timeoutMs = 22000, targetAccuracy = 35 } = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device'));
      return;
    }

    let best = null;
    let settled = false;
    let watchId = null;
    let timer = null;

    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (value) resolve(value);
      else reject(error || new Error('Could not get a precise GPS location. Turn on GPS and try again'));
    };

    const onPoint = (position) => {
      const next = fromCoords(position.coords);
      if (!best || (next.accuracy != null && (best.accuracy == null || next.accuracy < best.accuracy))) {
        best = next;
      }
      if (next.accuracy != null && next.accuracy <= targetAccuracy) finish(next);
    };

    watchId = navigator.geolocation.watchPosition(onPoint, (error) => {
      if (best) finish(best);
      else finish(null, geoError(error));
    }, { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 });

    navigator.geolocation.getCurrentPosition(onPoint, () => {}, {
      enableHighAccuracy: true,
      timeout: Math.min(8000, timeoutMs),
      maximumAge: 0,
    });

    timer = setTimeout(() => {
      if (best) finish(best);
      else finish(null);
    }, timeoutMs);
  });
