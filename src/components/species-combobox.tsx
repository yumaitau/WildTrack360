"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { speciesSeedData } from "../../prisma/species-seed-data";

interface SpeciesOption {
  value: string;
  label: string;
  type?: string;
  scientificName?: string;
}

interface SpeciesComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSpeciesSelect?: (species: { name: string; scientificName?: string; type?: string }) => void;
  placeholder?: string;
}

export function SpeciesCombobox({
  value,
  onValueChange,
  onSpeciesSelect,
  placeholder = "Select species...",
}: SpeciesComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Convert species seed data to options, sorted alphabetically
  const speciesOptions: SpeciesOption[] = React.useMemo(() => {
    return speciesSeedData
      .map((species) => ({
        value: species.name,
        label: species.name,
        type: species.type,
        scientificName: species.scientificName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when opening
  React.useEffect(() => {
    if (open) {
      setSearchValue("");
      // Small delay to ensure the input is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return speciesOptions;

    const searchLower = searchValue.toLowerCase();
    return speciesOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(searchLower) ||
        option.scientificName?.toLowerCase().includes(searchLower)
    );
  }, [searchValue, speciesOptions]);

  const handleSelect = (selectedOption: SpeciesOption) => {
    if (onSpeciesSelect) {
      onSpeciesSelect({
        name: selectedOption.label,
        scientificName: selectedOption.scientificName,
        type: selectedOption.type,
      });
    }
    onValueChange(selectedOption.value);
    setOpen(false);
    setSearchValue("");
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between text-left font-normal"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          <div className="flex items-center border-b pb-2 mb-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search species..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") setOpen(false);
              }}
              className="flex-1 h-8 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground text-foreground"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <div className="space-y-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Available species ({filteredOptions.length})
                </p>
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-primary/10 hover:text-foreground"
                    onClick={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 flex-shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="font-medium text-sm">{option.label}</span>
                      {option.scientificName && (
                        <span className="text-xs opacity-70 italic truncate">
                          {option.scientificName}
                        </span>
                      )}
                      {option.type && (
                        <span className="text-xs opacity-60 capitalize">
                          {option.type}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm">
                <p className="font-medium text-foreground">No species found</p>
                <p className="mt-1 text-foreground/70">
                  Try adjusting your search
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
