"use client"

import React, { useEffect, useRef, useState } from 'react';

interface SimpleMapProps {
  center: { lat: number; lng: number };
  onLocationChange: (lat: number, lng: number) => void;
  initialMarker?: { lat: number; lng: number };
}

const SimpleMap: React.FC<SimpleMapProps> = ({ center, onLocationChange, initialMarker }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    // Only load Leaflet on the client side
    if (typeof window === 'undefined') return;

    // Prevent multiple initializations
    if (isInitializedRef.current) return;

    // Load Leaflet CSS if not already loaded
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const loadMap = async () => {
      try {
        const L = await import('leaflet');
        // CSS is loaded via CDN to avoid module resolution issues

        // Store Leaflet instance
        leafletRef.current = L;

        // Fix for default markers in Leaflet with Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

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
          markerInstanceRef.current = marker;

          // Handle marker drag
          marker.on('dragend', (event: any) => {
            const position = event.target.getLatLng();
            onLocationChange(position.lat, position.lng);
          });
        }

        // Handle map click
        map.on('click', (event: any) => {
          const { lat, lng } = event.latlng;
          
          // Remove existing marker
          if (markerInstanceRef.current) {
            map.removeLayer(markerInstanceRef.current);
          }

          // Add new marker
          const marker = L.marker([lat, lng], {
            draggable: true,
            title: 'Rescue Location',
          }).addTo(map);
          markerInstanceRef.current = marker;

          // Handle marker drag
          marker.on('dragend', (event: any) => {
            const position = event.target.getLatLng();
            onLocationChange(position.lat, position.lng);
          });

          onLocationChange(lat, lng);
        });

        setIsMapLoaded(true);
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Error loading map:', error);
      }
    };

    loadMap();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []); // Empty dependency array - only run once

  return (
    <div
      ref={mapRef}
      className="w-full h-64 rounded-t-lg"
      style={{ minHeight: '256px' }}
    />
  );
};

export default SimpleMap; 