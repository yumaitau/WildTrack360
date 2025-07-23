"use client"

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  center: { lat: number; lng: number };
  onLocationChange: (lat: number, lng: number) => void;
  initialMarker?: { lat: number; lng: number };
}

const MapComponent: React.FC<MapComponentProps> = ({ center, onLocationChange, initialMarker }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([center.lat, center.lng], 12);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add initial marker if provided
    if (initialMarker) {
      const marker = L.marker([initialMarker.lat, initialMarker.lng], {
        draggable: true,
        title: 'Rescue Location',
      }).addTo(map);
      markerRef.current = marker;

      // Handle marker drag
      marker.on('dragend', (event) => {
        const position = event.target.getLatLng();
        onLocationChange(position.lat, position.lng);
      });
    }

    // Handle map click
    map.on('click', (event) => {
      const { lat, lng } = event.latlng;
      
      // Remove existing marker
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }

      // Add new marker
      const marker = L.marker([lat, lng], {
        draggable: true,
        title: 'Rescue Location',
      }).addTo(map);
      markerRef.current = marker;

      // Handle marker drag
      marker.on('dragend', (event) => {
        const position = event.target.getLatLng();
        onLocationChange(position.lat, position.lng);
      });

      onLocationChange(lat, lng);
    });

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center.lat, center.lng, onLocationChange, initialMarker]);

  return (
    <div
      ref={mapRef}
      className="w-full h-64 rounded-t-lg"
      style={{ minHeight: '256px' }}
    />
  );
};

export default MapComponent; 