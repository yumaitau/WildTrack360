"use client"

import { useState, useEffect } from 'react';

const CANBERRA_CENTER = { lat: -35.2809, lng: 149.1300 };

interface UserLocationResult {
  location: { lat: number; lng: number };
  isLocating: boolean;
  hasUserLocation: boolean;
}

export function useUserLocation(): UserLocationResult {
  const [location, setLocation] = useState(CANBERRA_CENTER);
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
        // Permission denied or error — keep Canberra default
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  return { location, isLocating, hasUserLocation };
}
