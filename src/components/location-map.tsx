"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LocationMapProps {
  rescueLocation?: { lat: number; lng: number; address: string };
  releaseLocation?: { lat: number; lng: number; address: string };
  animalName: string;
  jurisdiction?: string;
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const LocationMap: React.FC<LocationMapProps> = ({ rescueLocation, releaseLocation, animalName, jurisdiction }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [initTick, setInitTick] = useState(0);

  // Debug: Log location data
  console.log('LocationMap props:', {
    rescueLocation,
    releaseLocation,
    animalName,
    jurisdiction
  });

  // Check compliance for ACT jurisdiction
  const isNonCompliant = React.useMemo(() => {
    if (jurisdiction !== 'ACT' || !rescueLocation || !releaseLocation) {
      return false;
    }
    const distance = calculateDistance(
      rescueLocation.lat, 
      rescueLocation.lng, 
      releaseLocation.lat, 
      releaseLocation.lng
    );
    return distance < 10; // Less than 10km is non-compliant for ACT
  }, [jurisdiction, rescueLocation, releaseLocation]);

  useEffect(() => {
    // Only load Leaflet on the client side
    if (typeof window === 'undefined') return;

    // Prevent multiple initializations
    if (isInitializedRef.current) return;

    // Require a visible container and at least one valid location
    const hasValidRescue = !!(rescueLocation && typeof rescueLocation.lat === 'number' && typeof rescueLocation.lng === 'number');
    const hasValidRelease = !!(releaseLocation && typeof releaseLocation.lat === 'number' && typeof releaseLocation.lng === 'number');
    if (!mapRef.current || (!hasValidRescue && !hasValidRelease)) return;
    if (mapRef.current.clientHeight === 0 || mapRef.current.clientWidth === 0) {
      // Defer init until container is laid out
      const t = setTimeout(() => setInitTick((v) => v + 1), 100);
      return () => clearTimeout(t);
    }

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

        // Fix for default markers in Leaflet with Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        if (!mapRef.current || mapInstanceRef.current) return;

        // Determine map center based on available locations
        let center: [number, number];
        if (rescueLocation) {
          center = [rescueLocation.lat, rescueLocation.lng];
        } else if (releaseLocation) {
          center = [releaseLocation.lat, releaseLocation.lng];
        } else {
          // Default to Canberra if no locations
          center = [-35.2809, 149.1300];
        }

        // Initialize map
        const map = L.map(mapRef.current).setView(center, 10);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Add rescue location marker
        if (rescueLocation && rescueLocation.lat && rescueLocation.lng) {
          console.log('Adding rescue marker at:', rescueLocation.lat, rescueLocation.lng);
          const rescueIcon = L.divIcon({
            className: 'custom-marker rescue-marker',
            html: '<div style="background-color: #ef4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">R</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          const rescueMarker = L.marker([rescueLocation.lat, rescueLocation.lng], {
            icon: rescueIcon,
            title: 'Rescue Location',
          }).addTo(map);

          rescueMarker.bindPopup(`
            <div style="text-align: center;">
              <strong style="color: #ef4444;">🆘 Rescue Location</strong><br>
              <strong>${animalName}</strong><br>
              ${rescueLocation.address}
            </div>
          `);
        } else {
          console.log('Rescue location data missing or invalid:', rescueLocation);
        }

        // Add release location marker
        if (releaseLocation && releaseLocation.lat && releaseLocation.lng) {
          console.log('Adding release marker at:', releaseLocation.lat, releaseLocation.lng);
          const releaseIcon = L.divIcon({
            className: 'custom-marker release-marker',
            html: '<div style="background-color: #10b981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">H</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          const releaseMarker = L.marker([releaseLocation.lat, releaseLocation.lng], {
            icon: releaseIcon,
            title: 'Release Location',
          }).addTo(map);

          releaseMarker.bindPopup(`
            <div style="text-align: center;">
              <strong style="color: #10b981;">🏠 Release Location</strong><br>
              <strong>${animalName}</strong><br>
              ${releaseLocation.address}
            </div>
          `);
        } else {
          console.log('Release location data missing or invalid:', releaseLocation);
        }

        // Fit bounds if both locations exist, or zoom to rescue location if only rescue exists
        if (rescueLocation && releaseLocation) {
          const bounds = L.latLngBounds([
            [rescueLocation.lat, rescueLocation.lng],
            [releaseLocation.lat, releaseLocation.lng]
          ]);
          map.fitBounds(bounds, { padding: [20, 20] });
        } else if (rescueLocation && rescueLocation.lat && rescueLocation.lng) {
          // If only rescue location exists, center on it with appropriate zoom
          map.setView([rescueLocation.lat, rescueLocation.lng], 12);
        }

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
        isInitializedRef.current = false;
      }
    };
  }, [rescueLocation, releaseLocation, animalName, initTick]);

  if (!rescueLocation && !releaseLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No location information available for this animal.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Map
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={mapRef}
          className="w-full h-80 rounded-b-lg"
          style={{ minHeight: '320px' }}
        />
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-b-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        
        <div className="p-4 space-y-3">
          {isNonCompliant && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>ACT Compliance Warning:</strong> Release location is within 10km of rescue location. 
                ACT Wildlife Code requires release sites to be at least 10km from the rescue location.
              </AlertDescription>
            </Alert>
          )}
          
          {rescueLocation && (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-semibold text-red-700">Rescue Location</div>
                <div className="text-sm text-red-600">{rescueLocation.address}</div>
                <div className="text-xs text-red-500 mt-1">
                  Coordinates: {rescueLocation.lat.toFixed(6)}, {rescueLocation.lng.toFixed(6)}
                </div>
              </div>
            </div>
          )}
          
          {releaseLocation && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-semibold text-green-700">Release Location</div>
                <div className="text-sm text-green-600">{releaseLocation.address}</div>
                <div className="text-xs text-green-500 mt-1">
                  Coordinates: {releaseLocation.lat.toFixed(6)}, {releaseLocation.lng.toFixed(6)}
                </div>
              </div>
            </div>
          )}
          
          {rescueLocation && releaseLocation && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-semibold text-blue-700 mb-1">Distance Information</div>
              <div className="text-sm text-blue-600">
                Distance between rescue and release: {calculateDistance(
                  rescueLocation.lat, 
                  rescueLocation.lng, 
                  releaseLocation.lat, 
                  releaseLocation.lng
                ).toFixed(2)} km
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationMap; 