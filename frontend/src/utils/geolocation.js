export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => {
        if (error.code === 1) {
          reject(new Error('Allow location access to check in or check out'));
          return;
        }
        if (error.code === 2) {
          reject(new Error('Could not detect your location. Turn on GPS and try again'));
          return;
        }
        reject(new Error('Location request timed out. Try again'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
