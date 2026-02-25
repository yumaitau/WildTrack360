"use client"

import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, AlertTriangle, Map, Satellite, Expand } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GoogleMap, Marker, useJsApiLoader, Polyline } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { getJurisdictionComplianceConfig } from '@/lib/compliance-rules';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LocationMapProps {
  rescueLocation?: { lat: number; lng: number; address: string };
  releaseLocation?: { lat: number; lng: number; address: string };
  animalName: string;
  jurisdiction?: string;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const mapContainerStyle = {
  width: '100%',
  height: '320px',
  borderBottomLeftRadius: '0.5rem',
  borderBottomRightRadius: '0.5rem'
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

const LocationMap: React.FC<LocationMapProps> = ({ rescueLocation, releaseLocation, animalName, jurisdiction }) => {
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: ['places']
  });

  const complianceConfig = useMemo(() => jurisdiction ? getJurisdictionComplianceConfig(jurisdiction) : null, [jurisdiction]);
  const distanceReq = complianceConfig?.distanceRequirements;

  const isNonCompliant = useMemo(() => {
    if (!distanceReq?.enforced || !rescueLocation || !releaseLocation) {
      return false;
    }
    const distance = calculateDistance(
      rescueLocation.lat,
      rescueLocation.lng,
      releaseLocation.lat,
      releaseLocation.lng
    );
    return distance < distanceReq.releaseDistance;
  }, [distanceReq, rescueLocation, releaseLocation]);

  const center = useMemo(() => {
    if (rescueLocation) {
      return { lat: rescueLocation.lat, lng: rescueLocation.lng };
    } else if (releaseLocation) {
      return { lat: releaseLocation.lat, lng: releaseLocation.lng };
    } else {
      return { lat: -35.2809, lng: 149.1300 };
    }
  }, [rescueLocation, releaseLocation]);


  const pathCoordinates = useMemo(() => {
    if (rescueLocation && releaseLocation) {
      return [
        { lat: rescueLocation.lat, lng: rescueLocation.lng },
        { lat: releaseLocation.lat, lng: releaseLocation.lng }
      ];
    }
    return [];
  }, [rescueLocation, releaseLocation]);

  const zoom = useMemo(() => {
    // Calculate appropriate zoom level based on whether we have both locations
    if (rescueLocation && releaseLocation) {
      const distance = calculateDistance(
        rescueLocation.lat, 
        rescueLocation.lng, 
        releaseLocation.lat, 
        releaseLocation.lng
      );
      // Adjust zoom based on distance
      if (distance < 5) return 14;
      if (distance < 10) return 13;
      if (distance < 20) return 12;
      if (distance < 50) return 11;
      return 10;
    }
    return 12;
  }, [rescueLocation, releaseLocation]);

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

  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full h-80 rounded-b-lg bg-muted flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const MapView = ({ containerStyle, showZoomControls = false }: { containerStyle: React.CSSProperties, showZoomControls?: boolean }) => (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={{
        ...options,
        mapTypeId: mapType,
        zoomControl: showZoomControls || options.zoomControl
      }}
    >
      {rescueLocation && (
        <Marker
          position={{ lat: rescueLocation.lat, lng: rescueLocation.lng }}
          title={`Rescue Location: ${animalName}`}
          label={{
            text: 'R',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          }}
        />
      )}
      
      {releaseLocation && (
        <Marker
          position={{ lat: releaseLocation.lat, lng: releaseLocation.lng }}
          title={`Release Location: ${animalName}`}
          label={{
            text: 'H',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          }}
        />
      )}
      
      {rescueLocation && releaseLocation && (
        <>
          <Polyline
            path={pathCoordinates}
            options={{
              strokeColor: '#ffffff',
              strokeOpacity: 1,
              strokeWeight: 5,
              geodesic: true,
            }}
          />
          <Polyline
            path={pathCoordinates}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 1,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        </>
      )}
    </GoogleMap>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative">
            <MapView
containerStyle={mapContainerStyle} />
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
        
        <div className="p-4 space-y-3">
          {isNonCompliant && distanceReq && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>{jurisdiction} Compliance Warning:</strong> Release location is within {distanceReq.releaseDistance}{distanceReq.unit} of rescue location.
                Release sites must be at least {distanceReq.releaseDistance}{distanceReq.unit} from the rescue location.
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

    <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle>Location Map - {animalName}</DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 p-4 pt-2">
          <MapView containerStyle={{ width: '100%', height: '100%', borderRadius: '0.5rem' }} showZoomControls={true} />
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
          {/* Location legend overlay */}
          <div className="absolute bottom-4 left-6 right-6 flex gap-4 flex-wrap">
            {rescueLocation && (
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium">Rescue</span>
              </div>
            )}
            {releaseLocation && (
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Release</span>
              </div>
            )}
            {rescueLocation && releaseLocation && (
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow-sm">
                <span className="text-sm font-medium">Distance: {calculateDistance(
                  rescueLocation.lat, 
                  rescueLocation.lng, 
                  releaseLocation.lat, 
                  releaseLocation.lng
                ).toFixed(2)} km</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default LocationMap;