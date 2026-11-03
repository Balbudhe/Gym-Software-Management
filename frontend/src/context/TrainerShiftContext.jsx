import { createContext, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { setTrainerOnShift } from '../services/shiftBridge';
import { getPrecisePosition } from '../utils/geolocation';

const TrainerShiftContext = createContext(null);

const PING_INTERVAL_MS = 12000;

export function TrainerShiftProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [onShift, setOnShift] = useState(false);
  const [outsideGym, setOutsideGym] = useState(false);
  const [item, setItem] = useState(null);
  const lastPingAt = useRef(0);
  const alertedRef = useRef(false);

  const refresh = async () => {
    if (!user?.trainerId) return;
    try {
      const { data } = await api.get('/trainer-attendance/today');
      const nextOnShift = !!(data.onShift || (data.item?.checkInTime && !data.item?.checkOutTime));
      setItem(data.item || null);
      setOnShift(nextOnShift);
      setOutsideGym(!!data.item?.outsideGym);
      setTrainerOnShift(nextOnShift);
      if (!nextOnShift) alertedRef.current = false;
    } catch {
      // keep last known shift state
    }
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [user?.trainerId]);

  useEffect(() => {
    if (!onShift || !navigator.geolocation) return undefined;

    const sendPing = async (coords, force = false) => {
      const now = Date.now();
      if (!force && now - lastPingAt.current < PING_INTERVAL_MS) return;
      lastPingAt.current = now;
      try {
        const { data } = await api.post('/trainer-attendance/location-ping', {
          latitude: coords.latitude ?? coords.lat,
          longitude: coords.longitude ?? coords.lng,
          accuracy: coords.accuracy,
        });
        setOutsideGym(!!data.outsideGym);
        setItem(data.item || null);
        if (data.alertSent && !alertedRef.current) {
          alertedRef.current = true;
          toast.push('You left the 200m check-in area. Owner notified by SMS.', 'error');
        }
        if (!data.outsideGym) alertedRef.current = false;
      } catch {
        // next watch tick will retry
      }
    };

    getPrecisePosition({ timeoutMs: 18000, targetAccuracy: 40 })
      .then((position) => sendPing(position, true))
      .catch(() => {});

    const watchId = navigator.geolocation.watchPosition(
      (position) => sendPing(position.coords),
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [onShift, toast]);

  return (
    <TrainerShiftContext.Provider value={{ onShift, outsideGym, item, refresh }}>
      {children}
    </TrainerShiftContext.Provider>
  );
}

export const useTrainerShift = () => useContext(TrainerShiftContext);
