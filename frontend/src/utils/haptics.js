export const haptic = (pattern = 12) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore unsupported devices
  }
};
