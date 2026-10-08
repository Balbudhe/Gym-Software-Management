const KEY = 'trainerOnShift';

export const setTrainerOnShift = (onShift) => {
  try {
    if (onShift) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch {
    // ignore storage errors
  }
};

export const isTrainerOnShift = () => {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
