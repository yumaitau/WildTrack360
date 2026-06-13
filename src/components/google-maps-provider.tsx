"use client"

import { createContext, useContext, type ReactNode } from 'react';
import { useJsApiLoader, type Libraries } from '@react-google-maps/api';
import { isClientScreenshotMode } from '@/lib/screenshot-mode';

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface GoogleMapsContextValue {
  isLoaded: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({ isLoaded: false });

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  if (isClientScreenshotMode() && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  return <GoogleMapsLoaderProvider>{children}</GoogleMapsLoaderProvider>;
}

function GoogleMapsLoaderProvider({ children }: { children: ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}
