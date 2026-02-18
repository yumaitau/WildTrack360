'use client';

import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  MapPin,
  Crosshair,
  Upload,
  X,
  Loader2,
  Map,
  Satellite,
} from 'lucide-react';
import { ThankYouScreen } from './thank-you-screen';

interface PindropFormProps {
  sessionId: string;
  token: string;
  callerName: string;
  species?: string | null;
  description?: string | null;
}

const CANBERRA_CENTER = { lat: -35.2809, lng: 149.1300 };
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Stable reference — must be declared outside component to avoid re-renders
const MAPS_LIBRARIES: ('places')[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

interface UploadedPhoto {
  url: string;
  name: string;
}

export function PindropForm({
  sessionId,
  token,
  callerName,
  species,
  description,
}: PindropFormProps) {
  const [markerPosition, setMarkerPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [callerNotes, setCallerNotes] = useState('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [geolocating, setGeolocating] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: MAPS_LIBRARIES,
  });
  const mapAvailable = apiKey && isLoaded;

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      }
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }, []);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setMarkerPosition({ lat, lng });
        reverseGeocode(lat, lng);
      }
    },
    [reverseGeocode]
  );

  const handleMarkerDragEnd = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setMarkerPosition({ lat, lng });
        reverseGeocode(lat, lng);
      }
    },
    [reverseGeocode]
  );

  const useCurrentLocation = () => {
    setGeolocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setMarkerPosition({ lat, lng });
          reverseGeocode(lat, lng);
          mapRef.current?.panTo({ lat, lng });
          setGeolocating(false);
        },
        () => {
          setError('Could not get your location. Please drop a pin on the map instead.');
          setGeolocating(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setGeolocating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError(null);

    for (const file of filesToUpload) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed.');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('Each photo must be under 10MB.');
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`/api/pin/${sessionId}/upload?t=${token}`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Upload failed.');
          continue;
        }
        const data = await res.json();
        setPhotos((prev) => [...prev, { url: data.url, name: file.name }]);
      } catch {
        setError('Upload failed. Please try again.');
      }
    }

    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!markerPosition) {
      setError('Please drop a pin on the map to mark the location.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/pin/${sessionId}/submit?t=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: markerPosition.lat,
          lng: markerPosition.lng,
          address,
          photoUrls: photos.map((p) => p.url),
          callerNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Submission failed.');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <ThankYouScreen />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Share Your Location
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Hi {callerName}, please drop a pin where the animal was spotted
          {species ? ` (${species})` : ''}.
        </p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 italic">
            {description}
          </p>
        )}
      </div>

      {/* Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            <MapPin className="inline h-4 w-4 mr-1" />
            Location
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useCurrentLocation}
            disabled={geolocating}
          >
            <Crosshair className="h-4 w-4 mr-1" />
            {geolocating ? 'Getting...' : 'My Location'}
          </Button>
        </div>

        {mapAvailable ? (
          <div className="relative">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={markerPosition || CANBERRA_CENTER}
              zoom={12}
              onClick={handleMapClick}
              onLoad={(map) => {
                mapRef.current = map;
              }}
              options={{ ...mapOptions, mapTypeId: mapType }}
            >
              {markerPosition && (
                <Marker
                  position={markerPosition}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                  title="Animal Location"
                />
              )}
            </GoogleMap>
            <div className="absolute top-2 right-2 z-10">
              <Button
                onClick={() =>
                  setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')
                }
                size="sm"
                variant="secondary"
                type="button"
              >
                {mapType === 'roadmap' ? (
                  <>
                    <Satellite className="h-4 w-4 mr-1" /> Satellite
                  </>
                ) : (
                  <>
                    <Map className="h-4 w-4 mr-1" /> Street
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : apiKey && !isLoaded ? (
          <div className="w-full h-[300px] rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Loading map...</p>
            </div>
          </div>
        ) : (
          /* No Google Maps API key — show manual location input */
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-3">
            <p className="text-sm text-gray-500">
              Use &quot;My Location&quot; above, or enter coordinates manually:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lat" className="text-xs">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  placeholder="-35.2809"
                  value={markerPosition?.lat ?? ''}
                  onChange={(e) => {
                    const lat = parseFloat(e.target.value);
                    if (!isNaN(lat)) {
                      const lng = markerPosition?.lng ?? CANBERRA_CENTER.lng;
                      setMarkerPosition({ lat, lng });
                      reverseGeocode(lat, lng);
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="lng" className="text-xs">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  placeholder="149.1300"
                  value={markerPosition?.lng ?? ''}
                  onChange={(e) => {
                    const lng = parseFloat(e.target.value);
                    if (!isNaN(lng)) {
                      const lat = markerPosition?.lat ?? CANBERRA_CENTER.lat;
                      setMarkerPosition({ lat, lng });
                      reverseGeocode(lat, lng);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {address && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {address}
          </p>
        )}
        {!markerPosition && mapAvailable && (
          <p className="text-xs text-gray-500">
            Tap the map or use &quot;My Location&quot; to place a pin.
          </p>
        )}
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          <Upload className="inline h-4 w-4 mr-1" />
          Photos (optional, max {MAX_PHOTOS})
        </Label>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-24 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length < MAX_PHOTOS && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="photo-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-1" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Add Photos
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium">
          Additional Notes (optional)
        </Label>
        <Textarea
          id="notes"
          placeholder="Any details about the animal's condition, behaviour, or exact location..."
          value={callerNotes}
          onChange={(e) => setCallerNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={submitting || !markerPosition}
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            Submitting...
          </>
        ) : (
          'Submit Location'
        )}
      </Button>
    </div>
  );
}
