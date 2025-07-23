"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Crosshair } from 'lucide-react';
import SimpleMap from './simple-map';

interface LocationPickerProps {
  onLocationChange: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number; address: string };
}

export function LocationPicker({ onLocationChange, initialLocation }: LocationPickerProps) {
  const [lat, setLat] = useState(initialLocation?.lat || -35.2809);
  const [lng, setLng] = useState(initialLocation?.lng || 149.1300);
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [isLoading, setIsLoading] = useState(false);

  // Canberra ACT coordinates
  const CANBERRA_CENTER = { lat: -35.2809, lng: 149.1300 };

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
        onLocationChange({ lat, lng, address: newAddress });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(fallbackAddress);
      onLocationChange({ lat, lng, address: fallbackAddress });
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
            center={initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : CANBERRA_CENTER}
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
            value={lat}
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
            value={lng}
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
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter or select location on map"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Click on the map to drop a pin, or enter coordinates manually. 
        The map is centered on Canberra ACT by default.
      </p>
    </div>
  );
} 