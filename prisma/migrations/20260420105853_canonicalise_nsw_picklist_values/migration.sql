-- Canonicalise legacy NSW picklist values on existing Animal records.
-- Generated from src/lib/compliance-rules.ts (legacy) → src/lib/nsw-picklists.ts
-- (authoritative, sourced from the NSW DCCEEW Detailed Report template).
--
-- This migration is idempotent: each UPDATE targets only rows still holding
-- a legacy value. Rows that already hold the canonical NSW value are
-- unaffected.

-- Canonicalise encounterType: 34 legacy value(s) rewritten
UPDATE "animals"
SET encounter_type = CASE
    WHEN encounter_type = 'Attack – bird' THEN 'Attack - Bird'
    WHEN encounter_type = 'Attack – cat' THEN 'Attack - Cat'
    WHEN encounter_type = 'Attack – dog' THEN 'Attack - Dog'
    WHEN encounter_type = 'Attack – fox' THEN 'Attack - Fox'
    WHEN encounter_type = 'Attack – same species' THEN 'Attack - Same species'
    WHEN encounter_type = 'Attack – suspected-other' THEN 'Attack - Suspected/Other'
    WHEN encounter_type = 'Collision – building' THEN 'Collision - Building'
    WHEN encounter_type = 'Collision – motor vehicle' THEN 'Collision - Motor vehicle'
    WHEN encounter_type = 'Collision – other' THEN 'Collision - Other'
    WHEN encounter_type = 'Collision – vessel strike' THEN 'Collision - Vessel strike'
    WHEN encounter_type = 'Abandoned/orphaned' THEN 'Abandoned/Orphaned'
    WHEN encounter_type = 'Disease – botulism' THEN 'Disease - Botulism'
    WHEN encounter_type = 'Disease – chlamydia' THEN 'Disease - Chlamydia'
    WHEN encounter_type = 'Disease – external parasite' THEN 'Disease - External parasite'
    WHEN encounter_type = 'Disease – internal parasite' THEN 'Disease - Internal parasite'
    WHEN encounter_type = 'Disease – mange' THEN 'Disease - Mange'
    WHEN encounter_type = 'Disease – other' THEN 'Disease - Other'
    WHEN encounter_type = 'Disease – PBFD' THEN 'Disease - PBFD'
    WHEN encounter_type = 'Domestic pet – escaped' THEN 'Domestic Pet - Escaped'
    WHEN encounter_type = 'Domestic pet – seized' THEN 'Domestic Pet - Seized'
    WHEN encounter_type = 'Domestic pet – surrendered' THEN 'Domestic Pet - Surrendered'
    WHEN encounter_type = 'Entanglement – marine debris' THEN 'Entanglement - Marine debris'
    WHEN encounter_type = 'Entanglement – netting' THEN 'Entanglement - Netting'
    WHEN encounter_type = 'Entanglement – other' THEN 'Entanglement - Other'
    WHEN encounter_type = 'Entanglement – wire' THEN 'Entanglement - Wire'
    WHEN encounter_type = 'Event – drought' THEN 'Event - Drought'
    WHEN encounter_type = 'Event – extreme heat' THEN 'Event - Extreme heat'
    WHEN encounter_type = 'Event – fire' THEN 'Event - Fire'
    WHEN encounter_type = 'Event – flood' THEN 'Event - Flood'
    WHEN encounter_type = 'Event – storm' THEN 'Event - Storm'
    WHEN encounter_type = 'Human impact – habitat alteration/tree felling' THEN 'Human Impact - Habitat alteration / Tree felling'
    WHEN encounter_type = 'Human impact – intentional harm' THEN 'Human impact - Intentional harm'
    WHEN encounter_type = 'Human impact – interference' THEN 'Human Impact - Interference'
    WHEN encounter_type = 'Stranded/haul-out' THEN 'Stranded / Haul out'
    ELSE encounter_type
END
WHERE encounter_type IN ('Attack – bird', 'Attack – cat', 'Attack – dog', 'Attack – fox', 'Attack – same species', 'Attack – suspected-other', 'Collision – building', 'Collision – motor vehicle', 'Collision – other', 'Collision – vessel strike', 'Abandoned/orphaned', 'Disease – botulism', 'Disease – chlamydia', 'Disease – external parasite', 'Disease – internal parasite', 'Disease – mange', 'Disease – other', 'Disease – PBFD', 'Domestic pet – escaped', 'Domestic pet – seized', 'Domestic pet – surrendered', 'Entanglement – marine debris', 'Entanglement – netting', 'Entanglement – other', 'Entanglement – wire', 'Event – drought', 'Event – extreme heat', 'Event – fire', 'Event – flood', 'Event – storm', 'Human impact – habitat alteration/tree felling', 'Human impact – intentional harm', 'Human impact – interference', 'Stranded/haul-out');

-- Canonicalise fate: 5 legacy value(s) rewritten
UPDATE "animals"
SET fate = CASE
    WHEN fate = 'Permanent care – companion (approved)' THEN 'Permanent care - Companion (approved)'
    WHEN fate = 'Permanent care – external/community education (approved)' THEN 'Permanent care - External/Community education (approved)'
    WHEN fate = 'Permanent care – internal training (approved)' THEN 'Permanent care - Internal training (approved)'
    WHEN fate = 'Permanent care – research (approved)' THEN 'Permanent care - Research (approved)'
    WHEN fate = 'Transferred to an authorised animal park/zoo' THEN 'Transferred to an authorised fauna park or zoo'
    ELSE fate
END
WHERE fate IN ('Permanent care – companion (approved)', 'Permanent care – external/community education (approved)', 'Permanent care – internal training (approved)', 'Permanent care – research (approved)', 'Transferred to an authorised animal park/zoo');

-- Canonicalise pouchCondition: 5 legacy value(s) rewritten
UPDATE "animals"
SET pouch_condition = CASE
    WHEN pouch_condition = 'Non-lactating' THEN 'Non-Lactating'
    WHEN pouch_condition = 'Pinkie attached' THEN 'Pinkie Attached'
    WHEN pouch_condition = 'Pouch young' THEN 'Pouch Young'
    WHEN pouch_condition = 'Back young' THEN 'Back Young'
    WHEN pouch_condition = 'NA' THEN 'N/A'
    ELSE pouch_condition
END
WHERE pouch_condition IN ('Non-lactating', 'Pinkie attached', 'Pouch young', 'Back young', 'NA');

-- Canonicalise animalCondition: 2 legacy value(s) rewritten
UPDATE "animals"
SET animal_condition = CASE
    WHEN animal_condition = 'Emaciated' THEN 'Malnourished'
    WHEN animal_condition = 'Good' THEN 'No apparent distress'
    ELSE animal_condition
END
WHERE animal_condition IN ('Emaciated', 'Good');
