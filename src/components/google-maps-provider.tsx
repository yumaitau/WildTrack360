"use client"

import { LoadScript } from '@react-google-maps/api';
import { ReactNode } from 'react';

interface GoogleMapsProviderProps {
  children: ReactNode;
}

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!apiKey) {
    console.error('Google Maps API key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_KEY to your environment variables.');
    return <div>{children}</div>;
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries}
      loadingElement={<div>Loading maps...</div>}
    >
      {children}
    </LoadScript>
  );
}