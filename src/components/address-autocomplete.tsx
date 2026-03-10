"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from "@/components/google-maps-provider";

export interface AddressDetails {
  formattedAddress: string;
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  coordinates?: { lat: number; lng: number };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (details: AddressDetails) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  disabled = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const placesDiv = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    if (isLoaded && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      if (placesDiv.current) {
        placesService.current = new google.maps.places.PlacesService(placesDiv.current);
      }
    }
  }, [isLoaded]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddress = useCallback((input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    autocompleteService.current.getPlacePredictions(
      { input, componentRestrictions: { country: "au" }, types: ["address"] },
      (predictions) => {
        const results = predictions || [];
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      }
    );
  }, []);

  const selectAddress = useCallback(
    (placeId: string) => {
      if (!placesService.current) return;
      placesService.current.getDetails(
        { placeId, fields: ["address_components", "formatted_address", "geometry"] },
        (place) => {
          if (!place) return;
          const components = place.address_components || [];

          const streetNumber = components.find((c) => c.types.includes("street_number"))?.long_name || "";
          const route = components.find((c) => c.types.includes("route"))?.long_name || "";
          const suburb = components.find((c) => c.types.includes("locality"))?.long_name || "";
          const state = components.find((c) => c.types.includes("administrative_area_level_1"))?.short_name || "";
          const postcode = components.find((c) => c.types.includes("postal_code"))?.long_name || "";

          const streetAddress = [streetNumber, route].filter(Boolean).join(" ");
          const formattedAddress = place.formatted_address || "";

          const details: AddressDetails = {
            formattedAddress,
            streetAddress,
            suburb,
            state,
            postcode,
          };

          if (place.geometry?.location) {
            details.coordinates = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
          }

          setShowDropdown(false);
          setSuggestions([]);
          onSelect(details);
        }
      );
    },
    [onSelect]
  );

  return (
    <div ref={wrapperRef} className="relative">
      <div ref={placesDiv} className="hidden" />
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          searchAddress(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-form-type="other"
        data-lpignore="true"
        name="address-lookup-field"
        disabled={disabled}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-[9999] mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="max-h-60 overflow-y-auto">
            {suggestions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors border-b last:border-b-0"
                onClick={() => selectAddress(prediction.place_id)}
              >
                {prediction.description}
              </button>
            ))}
          </div>
          <div className="px-3 py-1 text-[10px] text-muted-foreground text-right border-t">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
