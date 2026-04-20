-- Split the legacy mark_band_microchip column into two authoritative NSW
-- Datasheet columns: Tag/Band colour and number, and Microchip number.
--
-- The heuristic for splitting existing values is intentionally
-- conservative: only pure-numeric strings of 9 or more digits (matching
-- common microchip formats including ISO-11784/11785 15-digit IDs and
-- legacy 9-digit chips) migrate to microchip_number. Everything else
-- (colour-coded band IDs like "Blue-A12", leg-band codes, empty strings)
-- migrates to tag_band_colour_number.

ALTER TABLE "animals"
  ADD COLUMN IF NOT EXISTS "tag_band_colour_number" TEXT,
  ADD COLUMN IF NOT EXISTS "microchip_number" TEXT;

UPDATE "animals"
SET microchip_number = mark_band_microchip
WHERE mark_band_microchip IS NOT NULL
  AND mark_band_microchip ~ '^[0-9]{9,}$';

UPDATE "animals"
SET tag_band_colour_number = mark_band_microchip
WHERE mark_band_microchip IS NOT NULL
  AND tag_band_colour_number IS NULL
  AND microchip_number IS NULL;

ALTER TABLE "animals" DROP COLUMN IF EXISTS "mark_band_microchip";
