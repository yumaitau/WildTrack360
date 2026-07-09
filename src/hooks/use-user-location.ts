"use client"

import { useState, useEffect } from 'react';

// Geographic centre of Australia — neutral fallback when the user's
// location is unavailable, so maps no longer default to Canberra.
const AUSTRALIA_CENTER = { lat: -25.2744, lng: 133.7751 };

interface UserLocationResult {
  location: { lat: number; lng: number };
  isLocating: boolean;
  hasUserLocation: boolean;
}

export function useUserLocation(): UserLocationResult {
  const [location, setLocation] = useState(AUSTRALIA_CENTER);
  const [isLocating, setIsLocating] = useState(true);
  const [hasUserLocation, setHasUserLocation] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setHasUserLocation(true);
        setIsLocating(false);
      },
      () => {
        // Permission denied or error — keep the neutral Australia-wide default
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  return { location, isLocating, hasUserLocation };
}
