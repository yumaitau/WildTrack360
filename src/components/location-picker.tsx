"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Crosshair, MousePointerClick, CheckCircle2 } from 'lucide-react';
import SimpleMap from './simple-map';
import { useUserLocation } from '@/hooks/use-user-location';

interface LocationPickerProps {
  onLocationChange: (location: { 
    lat: number; 
    lng: number; 
    address: string;
    // Structured address components
    streetAddress?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
  }) => void;
  initialLocation?: { lat: number; lng: number; address: string };
}

export function LocationPicker({ onLocationChange, initialLocation }: LocationPickerProps) {
  const { location: userLocation, isLocating } = useUserLocation();
  const [lat, setLat] = useState<number>(initialLocation?.lat || userLocation.lat);
  const [lng, setLng] = useState<number>(initialLocation?.lng || userLocation.lng);
  const [address, setAddress] = useState<string>(initialLocation?.address || '');
  const [isLoading, setIsLoading] = useState(false);
  const [locationSelected, setLocationSelected] = useState<boolean>(!!initialLocation);
  const hasAutoLocated = useRef(false);

  // When geolocation resolves and no initial location was provided, update the map center
  useEffect(() => {
    if (!initialLocation && !isLocating && !hasAutoLocated.current) {
      hasAutoLocated.current = true;
      setLat(userLocation.lat);
      setLng(userLocation.lng);
    }
  }, [initialLocation, isLocating, userLocation]);

  // Determine the effective map center
  const mapCenter = initialLocation
    ? { lat: initialLocation.lat, lng: initialLocation.lng }
    : userLocation;

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setLocationSelected(true);

    // Simple reverse geocoding using OpenStreetMap Nominatim
    reverseGeocode(newLat, newLng);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.display_name) {
        const newAddress = data.display_name;
        setAddress(newAddress);
        
        // Extract structured address components from Nominatim response
        const addr = data.address || {};
        
        // Build street address (house number + road)
        let streetAddress = '';
        if (addr.house_number) {
          streetAddress = addr.house_number;
        }
        if (addr.road) {
          streetAddress = streetAddress ? `${streetAddress} ${addr.road}` : addr.road;
        } else if (addr.street) {
          streetAddress = streetAddress ? `${streetAddress} ${addr.street}` : addr.street;
        }
        
        // Get suburb/town (try multiple fields in order of preference)
        const suburb = addr.suburb || addr.town || addr.city || addr.locality || addr.village || '';
        
        // Get postcode
        const postcode = addr.postcode || '';
        
        // Get state
        const state = addr.state || addr.territory || 'NSW';
        
        onLocationChange({ 
          lat, 
          lng, 
          address: newAddress,
          streetAddress,
          suburb,
          postcode,
          state
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      onLocationChange({ 
        lat, 
        lng, 
        address: fallbackAddress,
        streetAddress: '',
        suburb: '',
        postcode: '',
        state: 'NSW'
      });
    }
  };

  const handleCoordinateChange = () => {
    const newLat = parseFloat(lat.toString());
    const newLng = parseFloat(lng.toString());

    if (!isNaN(newLat) && !isNaN(newLng)) {
      setLocationSelected(true);
      reverseGeocode(newLat, newLng);
    }
  };

  const useCurrentLocation = () => {
    setIsLoading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;

          setLat(newLat);
          setLng(newLng);
          setLocationSelected(true);
          reverseGeocode(newLat, newLng);
          setIsLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setIsLoading(false);
        }
      );
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Rescue Location</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useCurrentLocation}
            disabled={isLoading}
          >
            <Crosshair className="h-4 w-4 mr-1" />
            {isLoading ? 'Getting...' : 'My Location'}
          </Button>
        </div>
      </div>

      {locationSelected ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Rescue location set</p>
            <p className="text-xs">Click anywhere on the map to move the pin, or drag the marker to fine-tune.</p>
          </div>
        </div>
      ) : (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border-2 border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          <MousePointerClick className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Click on the map below to mark the rescue location</p>
            <p className="text-xs">
              The map is centred on your current location, but no rescue pin has been placed yet.
              Tap or click the exact spot on the map where the animal was found.
            </p>
          </div>
        </div>
      )}

      <Card className={locationSelected ? '' : 'ring-2 ring-amber-400 ring-offset-2'}>
        <CardContent className="p-0">
          <SimpleMap
            center={mapCenter}
            onLocationChange={handleLocationChange}
            initialMarker={locationSelected ? { lat, lng } : undefined}
            showClickHint={!locationSelected}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="latitude" className="text-sm font-medium">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            value={lat || ''}
            onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
            onBlur={handleCoordinateChange}
            placeholder="-25.2744"
          />
        </div>
        <div>
          <Label htmlFor="longitude" className="text-sm font-medium">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            value={lng || ''}
            onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
            onBlur={handleCoordinateChange}
            placeholder="133.7751"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address" className="text-sm font-medium">Address</Label>
        <Input
          id="address"
          value={address || ''}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter or select location on map"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Drop a pin by clicking the map, drag it to adjust, or enter coordinates manually.
        The map initially centres on your current location, or an Australia-wide view if location access is unavailable.
      </p>
    </div>
  );
} 