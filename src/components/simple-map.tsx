"use client"

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Map, Satellite, Expand } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SimpleMapProps {
  center: { lat: number; lng: number };
  onLocationChange: (lat: number, lng: number) => void;
  initialMarker?: { lat: number; lng: number };
}

const mapContainerStyle = {
  width: '100%',
  height: '256px',
  borderTopLeftRadius: '0.5rem',
  borderTopRightRadius: '0.5rem'
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

const SimpleMap: React.FC<SimpleMapProps> = ({ center, onLocationChange, initialMarker }) => {
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    initialMarker || null
  );
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: ['places']
  });

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setMarkerPosition({ lat, lng });
      onLocationChange(lat, lng);
    }
  }, [onLocationChange]);

  const handleMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setMarkerPosition({ lat, lng });
      onLocationChange(lat, lng);
    }
  }, [onLocationChange]);

  useEffect(() => {
    if (initialMarker) {
      setMarkerPosition(initialMarker);
    }
  }, [initialMarker]);

  if (!isLoaded) {
    return (
      <div className="w-full h-64 rounded-t-lg bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  const MapView = ({ containerStyle }: { containerStyle: React.CSSProperties }) => (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={markerPosition || center}
      zoom={12}
      onClick={handleMapClick}
      options={{
        ...options,
        mapTypeId: mapType
      }}
    >
      {markerPosition && (
        <Marker
          position={markerPosition}
          draggable={true}
          onDragEnd={handleMarkerDragEnd}
          title="Rescue Location"
        />
      )}
    </GoogleMap>
  );

  return (
    <>
      <div className="relative">
        <MapView containerStyle={mapContainerStyle} />
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            onClick={() => setIsFullscreen(true)}
            size="sm"
            variant="secondary"
          >
            <Expand className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
            size="sm"
            variant="secondary"
          >
            {mapType === 'roadmap' ? (
              <><Satellite className="h-4 w-4 mr-1" /> Satellite</>
            ) : (
              <><Map className="h-4 w-4 mr-1" /> Street</>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle>Map View</DialogTitle>
          </DialogHeader>
          <div className="relative flex-1 p-4 pt-2">
            <MapView containerStyle={{ width: '100%', height: '100%', borderRadius: '0.5rem' }} />
            <Button
              onClick={() => setMapType(mapType === 'roadmap' ? 'satellite' : 'roadmap')}
              size="sm"
              variant="secondary"
              className="absolute top-4 right-6 z-10"
            >
              {mapType === 'roadmap' ? (
                <><Satellite className="h-4 w-4 mr-1" /> Satellite</>
              ) : (
                <><Map className="h-4 w-4 mr-1" /> Street</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SimpleMap;