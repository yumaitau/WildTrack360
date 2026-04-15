'use client';

import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Crosshair, Upload, X, Loader2, Map, Satellite } from 'lucide-react';

interface PindropFormProps {
  sessionId: string;
  token: string;
  initialPhone?: string;
}

const AU_CENTER = { lat: -33.8688, lng: 151.2093 };
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MAPS_LIBRARIES: ('places')[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

interface UploadedPhoto {
  url: string;
  name: string;
}

export function PindropForm({ sessionId, token, initialPhone = '' }: PindropFormProps) {
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [callerName, setCallerName] = useState('');
  const [callerEmail, setCallerEmail] = useState('');
  const [callerPhone, setCallerPhone] = useState(initialPhone);
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
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'WildTrack360/1.0 (wildlife management app)' } }
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
          mapRef.current?.setZoom(15);
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
          callerName: callerName.trim() || null,
          callerEmail: callerEmail.trim() || null,
          callerPhone: callerPhone.trim() || null,
          lat: markerPosition.lat,
          lng: markerPosition.lng,
          address,
          photoUrls: photos.map((p) => p.url),
          callerNotes: callerNotes.trim() || null,
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
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">&#9989;</div>
        <h1 className="text-2xl font-headline font-bold text-foreground mb-2">Thank You!</h1>
        <p className="text-muted-foreground mb-4">
          Your location and details have been submitted successfully. Our team will review the information and follow up as needed.
        </p>
        <p className="text-sm text-muted-foreground">You can safely close this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-headline font-bold text-foreground">
          Share Your Details
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Please fill in your details and drop a pin where the animal was spotted.
        </p>
      </div>

      {/* Contact Details */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Your Details</h2>
        <div>
          <label htmlFor="pin-name" className="block text-sm font-medium text-foreground mb-1">Name</label>
          <input
            id="pin-name"
            type="text"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Your full name"
            value={callerName}
            onChange={(e) => setCallerName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pin-email" className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              id="pin-email"
              type="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
              value={callerEmail}
              onChange={(e) => setCallerEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="pin-phone" className="block text-sm font-medium text-foreground mb-1">Phone</label>
            <input
              id="pin-phone"
              type="tel"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0412 345 678"
              value={callerPhone}
              onChange={(e) => setCallerPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-1">
            <MapPin className="h-4 w-4" /> Location *
          </h2>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geolocating}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {geolocating ? 'Getting...' : 'My Location'}
          </button>
        </div>

        {mapAvailable ? (
          <div className="relative">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={markerPosition || AU_CENTER}
              zoom={markerPosition ? 15 : 5}
              onClick={handleMapClick}
              onLoad={(map) => { mapRef.current = map; }}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                mapTypeId: mapType,
              }}
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
              <button
                type="button"
                onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
                className="inline-flex items-center gap-1 rounded-md bg-background shadow px-2 py-1 text-xs font-medium text-foreground"
              >
                {mapType === 'roadmap' ? (
                  <><Satellite className="h-3.5 w-3.5" /> Satellite</>
                ) : (
                  <><Map className="h-3.5 w-3.5" /> Street</>
                )}
              </button>
            </div>
          </div>
        ) : apiKey && !isLoaded ? (
          <div className="w-full h-[300px] rounded-lg bg-muted flex items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Use &quot;My Location&quot; above, or enter coordinates manually:</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lat" className="block text-xs text-muted-foreground mb-1">Latitude</label>
                <input
                  id="lat"
                  type="number"
                  step="any"
                  placeholder="-33.8688"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={markerPosition?.lat ?? ''}
                  onChange={(e) => {
                    const lat = parseFloat(e.target.value);
                    if (!isNaN(lat)) {
                      const lng = markerPosition?.lng ?? AU_CENTER.lng;
                      setMarkerPosition({ lat, lng });
                      reverseGeocode(lat, lng);
                    }
                  }}
                />
              </div>
              <div>
                <label htmlFor="lng" className="block text-xs text-muted-foreground mb-1">Longitude</label>
                <input
                  id="lng"
                  type="number"
                  step="any"
                  placeholder="151.2093"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={markerPosition?.lng ?? ''}
                  onChange={(e) => {
                    const lng = parseFloat(e.target.value);
                    if (!isNaN(lng)) {
                      const lat = markerPosition?.lat ?? AU_CENTER.lat;
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
          <p className="text-xs text-muted-foreground truncate">{address}</p>
        )}
        {!markerPosition && mapAvailable && (
          <p className="text-xs text-muted-foreground">Tap the map or use &quot;My Location&quot; to place a pin.</p>
        )}
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-1">
          <Upload className="h-4 w-4" /> Photos (optional, max {MAX_PHOTOS})
        </h2>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="w-full h-24 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                  <span className="text-xs text-muted-foreground truncate px-1">{photo.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {uploading ? (
                <><Loader2 className="animate-spin h-4 w-4" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4" /> Add Photos</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label htmlFor="pin-notes" className="block text-sm font-medium text-foreground">
          Additional Notes (optional)
        </label>
        <textarea
          id="pin-notes"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Any details about the animal's condition, behaviour, or exact location..."
          value={callerNotes}
          onChange={(e) => setCallerNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !markerPosition}
        className="w-full rounded-md bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-semibold py-3 text-sm transition-colors"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Submitting...</span>
        ) : (
          'Submit Location & Details'
        )}
      </button>
    </div>
  );
}
