"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Crosshair } from 'lucide-react';
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
  const hasAutoLocated = useRef(false);

  // When geolocation resolves and no initial location was provided, update the map center
  useEffect(() => {
    if (!initialLocation && !isLocating && !hasAutoLocated.current) {
      hasAutoLocated.current = true;
      setLat(userLocation.lat);
      setLng(userLocation.lng);
    }
  }, [initialLocation, isLocating, userLocation]);

  // Canberra ACT coordinates
  const CANBERRA_CENTER = { lat: -35.2809, lng: 149.1300 };

  // Determine the effective map center
  const mapCenter = initialLocation
    ? { lat: initialLocation.lat, lng: initialLocation.lng }
    : userLocation;

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    
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

  const centerOnCanberra = () => {
    setLat(CANBERRA_CENTER.lat);
    setLng(CANBERRA_CENTER.lng);
    reverseGeocode(CANBERRA_CENTER.lat, CANBERRA_CENTER.lng);
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={centerOnCanberra}
          >
            <MapPin className="h-4 w-4 mr-1" />
            Canberra
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <SimpleMap
            center={mapCenter}
            onLocationChange={handleLocationChange}
            initialMarker={initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : undefined}
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
            placeholder="-35.2809"
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
            placeholder="149.1300"
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
        Click on the map to drop a pin, or enter coordinates manually.
        The map centres on your current location, or Canberra ACT if location access is unavailable.
      </p>
    </div>
  );
} 