-- Create a table to store the default species template
-- This table holds the master list of species that every organization should have
CREATE TABLE IF NOT EXISTS default_species_template (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    scientific_name TEXT,
    description TEXT,
    care_requirements TEXT,
    species_code TEXT,
    category TEXT,
    species_type TEXT,
    subtype TEXT,
    UNIQUE(name, scientific_name)
);

-- Insert all default species into the template table
INSERT INTO default_species_template (name, scientific_name, description, species_code, category, species_type, subtype)
VALUES 
    -- Commonly rescued species (at top for easy access)
    ('Koala', 'Phascolarctos cinereus', 'Mammal - Commonly rescued marsupial. Protected native species requiring specialist care.', NULL, 'Protected', 'Mammal', 'Marsupial'),
    ('Eastern Grey Kangaroo', 'Macropus giganteus', 'Mammal - Large macropod. Commonly rescued from vehicle strikes.', NULL, 'Protected', 'Mammal', 'Macropod'),
    ('Common Wombat', 'Vombatus ursinus', 'Mammal - Large burrowing marsupial. Commonly affected by sarcoptic mange.', NULL, 'Protected', 'Mammal', 'Marsupial'),
    ('Short-beaked Echidna', 'Tachyglossus aculeatus', 'Mammal - Monotreme (egg-laying mammal). Protected species.', NULL, 'Protected', 'Mammal', 'Monotreme'),
    ('Platypus', 'Ornithorhynchus anatinus', 'Mammal - Monotreme. Highly specialized care requirements.', NULL, 'Protected', 'Mammal', 'Monotreme'),
    ('Grey-headed Flying-fox', 'Pteropus poliocephalus', 'Mammal - Large fruit bat. Vulnerable species. Requires vaccinated handlers.', NULL, 'Vulnerable', 'Mammal', 'Bat'),
    ('Black Flying-fox', 'Pteropus alecto', 'Mammal - Large fruit bat. Requires vaccinated handlers.', NULL, 'Protected', 'Mammal', 'Bat'),
    ('Microbat (various species)', 'Various genera', 'Mammal - Small insectivorous bats. Multiple species requiring identification.', NULL, 'Protected', 'Mammal', 'Bat'),
    
    -- Mammals - Dunnart
    ('Fat-tailed dunnart', 'Sminthopsis crassicaudata', 'Mammal - Dunnart. Category: Basic', 'A01072', 'Basic', 'Mammal', 'Dunnart'),
    
    -- Mammals - Dingo
    ('Wild dog', 'Canis familiaris', 'Mammal - Dingo. Category: Unprotected', NULL, 'Unprotected', 'Mammal', 'Dingo'),
    
    -- Mammals - Gliders
    ('Squirrel glider', 'Petaurus norfolcensis', 'Mammal - Gliders. Category: Basic', 'E04226', 'Basic', 'Mammal', 'Gliders'),
    ('Sugar glider', 'Petaurus breviceps', 'Mammal - Gliders. Category: Basic', 'E01138', 'Basic', 'Mammal', 'Gliders'),
    
    -- Mammals - Possum
    ('Common brushtail possum', 'Trichosurus vulpecula', 'Mammal - Possum. Category: Basic', 'K01113', 'Basic', 'Mammal', 'Possum'),
    
    -- Mammals - Wallabies
    ('Parma wallaby', 'Macropus parma', 'Mammal - Wallabies. Category: Basic', 'K01245', 'Basic', 'Mammal', 'Wallabies'),
    ('Red-necked pademelon', 'Thylogale thetis', 'Mammal - Wallabies. Category: Basic', 'Y01236', 'Basic', 'Mammal', 'Wallabies'),
    ('Red-necked wallaby', 'Macropus rufogriseus', 'Mammal - Wallabies. Category: Basic', 'K01261', 'Basic', 'Mammal', 'Wallabies'),
    ('Swamp wallaby', 'Wallabia bicolor', 'Mammal - Wallabies. Category: Basic', 'E01242', 'Basic', 'Mammal', 'Wallabies'),
    
    -- Amphibians
    ('Southern bell frog', 'Litoria raniformis', 'Amphibian. Category: Basic', 'G03207', 'Basic', 'Amphibian', NULL),
    ('Smooth frog', 'Geocrinia laevis', 'Amphibian. Category: Basic', 'C03029', 'Basic', 'Amphibian', NULL),
    
    -- Reptiles - Common species
    ('Eastern bearded dragon', 'Pogona barbata', 'Reptile - Dragon lizards. Category: Basic', 'K02177', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Central bearded dragon', 'Pogona vitticeps', 'Reptile - Dragon lizards. Category: Exempt', 'Y02204', 'Exempt', 'Reptile', 'Dragon lizards'),
    ('Water dragon', 'Intellagama lesueurii', 'Reptile - Dragon lizards. Category: Basic', 'A02252', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Eastern bluetongue', 'Tiliqua scincoides', 'Reptile - Skinks. Category: Exempt', 'Y02580', 'Exempt', 'Reptile', 'Skinks'),
    ('Sleepy lizard', 'Tiliqua rugosa', 'Reptile - Skinks. Category: Exempt', 'Z02583', 'Exempt', 'Reptile', 'Skinks'),
    ('Carpet python', 'Morelia spilota', 'Reptile - Snakes. Category: Basic', 'C02625', 'Basic', 'Reptile', 'Snakes'),
    ('Diamond python', 'Morelia spilota spilota', 'Reptile - Snakes. Category: Basic', NULL, 'Basic', 'Reptile', 'Snakes'),
    ('Eastern long-necked turtle', 'Chelodina longicollis', 'Reptile - Turtles. Category: Exempt', 'C02017', 'Exempt', 'Reptile', 'Turtles'),
    
    -- Birds - Common species
    ('Sulphur-crested cockatoo', 'Cacatua galerita', 'Bird - Cockatoos and parrots. Category: Exempt', 'Q04176', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Galah', 'Cacatua roseicapilla', 'Bird - Cockatoos and parrots. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Cockatoos and parrots'),
    ('Rainbow lorikeet', 'Trichoglossus haematodus', 'Bird - Cockatoos and parrots. Category: Exempt', 'U00254', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Australian magpie', 'Gymnorhina tibicen', 'Bird - Magpie. Category: Exempt', 'S00705', 'Exempt', 'Bird', 'Magpie'),
    ('Laughing kookaburra', 'Dacelo novaeguineae', 'Bird - Kookaburras. Category: Basic', 'S04169', 'Basic', 'Bird', 'Kookaburras'),
    ('Tawny frogmouth', 'Podargus strigoides', 'Bird - Frogmouth. Category: Basic', 'K00313', 'Basic', 'Bird', 'Frogmouth'),
    ('Pacific black duck', 'Anas superciliosa', 'Bird - Ducks. Category: Exempt', 'E04146', 'Exempt', 'Bird', 'Ducks'),
    ('Australian wood duck', 'Chenonetta jubata', 'Bird - Ducks. Category: Exempt', 'U00202', 'Exempt', 'Bird', 'Ducks'),
    ('Noisy miner', 'Manorina melanocephala', 'Bird - Honeyeaters. Category: Exempt', 'U00634', 'Exempt', 'Bird', 'Honeyeaters'),
    ('Crested pigeon', 'Ocyphaps lophotes', 'Bird - Pigeons and doves. Category: Exempt', 'W00043', 'Exempt', 'Bird', 'Pigeons and doves')
ON CONFLICT (name, scientific_name) DO NOTHING;

-- Create a function to seed species for a new organization
CREATE OR REPLACE FUNCTION seed_organization_species() RETURNS TRIGGER AS $$
DECLARE
    template_species RECORD;
    new_species_id TEXT;
    first_user_id TEXT;
BEGIN
    -- Get the first user in the organization to use as creator
    -- In a real scenario, you might want to use a system user or the actual user who created the org
    SELECT clerk_user_id INTO first_user_id 
    FROM carers 
    WHERE clerk_organization_id = NEW.id 
    LIMIT 1;
    
    -- If no user found in carers, check animals table
    IF first_user_id IS NULL THEN
        SELECT clerk_user_id INTO first_user_id 
        FROM animals 
        WHERE clerk_organization_id = NEW.id 
        LIMIT 1;
    END IF;
    
    -- If still no user, use a default system user ID
    IF first_user_id IS NULL THEN
        first_user_id := 'system';
    END IF;
    
    -- Loop through all template species and create them for the new organization
    FOR template_species IN 
        SELECT * FROM default_species_template 
        ORDER BY 
            CASE 
                WHEN name IN ('Koala', 'Eastern Grey Kangaroo', 'Common Wombat', 'Short-beaked Echidna') THEN 0
                ELSE 1
            END,
            species_type,
            name
    LOOP
        -- Generate a unique ID for this species in this organization
        new_species_id := NEW.id || '-species-' || LOWER(REGEXP_REPLACE(template_species.name, '[^a-zA-Z0-9]', '-', 'g'));
        
        -- Insert the species for this organization
        INSERT INTO species (
            id, 
            name, 
            scientific_name, 
            description,
            care_requirements,
            clerk_user_id, 
            clerk_organization_id,
            created_at,
            updated_at
        )
        VALUES (
            new_species_id,
            template_species.name,
            template_species.scientific_name,
            template_species.description,
            template_species.care_requirements,
            first_user_id,
            NEW.id,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires when a new organization is created
-- Note: This assumes you have a table that tracks organizations
-- If using Clerk, organizations might be tracked differently
DROP TRIGGER IF EXISTS seed_species_on_org_create ON clerk_organizations;
CREATE TRIGGER seed_species_on_org_create
    AFTER INSERT ON clerk_organizations
    FOR EACH ROW
    EXECUTE FUNCTION seed_organization_species();

-- Alternative: If organizations are not in a table but you want to seed on first animal/carer creation
CREATE OR REPLACE FUNCTION seed_species_on_first_record() RETURNS TRIGGER AS $$
DECLARE
    species_count INTEGER;
    template_species RECORD;
    new_species_id TEXT;
BEGIN
    -- Check if this organization already has species
    SELECT COUNT(*) INTO species_count 
    FROM species 
    WHERE clerk_organization_id = NEW.clerk_organization_id;
    
    -- If no species exist for this org, seed them
    IF species_count = 0 THEN
        -- Loop through all template species
        FOR template_species IN 
            SELECT * FROM default_species_template 
            ORDER BY 
                CASE 
                    WHEN name IN ('Koala', 'Eastern Grey Kangaroo', 'Common Wombat', 'Short-beaked Echidna') THEN 0
                    ELSE 1
                END,
                species_type,
                name
        LOOP
            -- Generate a unique ID
            new_species_id := NEW.clerk_organization_id || '-species-' || LOWER(REGEXP_REPLACE(template_species.name, '[^a-zA-Z0-9]', '-', 'g'));
            
            -- Insert the species
            INSERT INTO species (
                id, 
                name, 
                scientific_name, 
                description,
                care_requirements,
                clerk_user_id, 
                clerk_organization_id,
                created_at,
                updated_at
            )
            VALUES (
                new_species_id,
                template_species.name,
                template_species.scientific_name,
                template_species.description,
                template_species.care_requirements,
                NEW.clerk_user_id,
                NEW.clerk_organization_id,
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on animals and carers tables to seed species on first record
DROP TRIGGER IF EXISTS seed_species_on_first_animal ON animals;
CREATE TRIGGER seed_species_on_first_animal
    AFTER INSERT ON animals
    FOR EACH ROW
    EXECUTE FUNCTION seed_species_on_first_record();

DROP TRIGGER IF EXISTS seed_species_on_first_carer ON carers;
CREATE TRIGGER seed_species_on_first_carer
    AFTER INSERT ON carers
    FOR EACH ROW
    EXECUTE FUNCTION seed_species_on_first_record();

-- Function to manually seed species for existing organizations
CREATE OR REPLACE FUNCTION seed_existing_organizations() RETURNS void AS $$
DECLARE
    org RECORD;
    template_species RECORD;
    new_species_id TEXT;
    species_count INTEGER;
BEGIN
    -- Get all unique organizations
    FOR org IN 
        SELECT DISTINCT clerk_organization_id, clerk_user_id 
        FROM (
            SELECT clerk_organization_id, clerk_user_id FROM animals
            UNION
            SELECT clerk_organization_id, clerk_user_id FROM carers
        ) AS orgs
    LOOP
        -- Check if this org already has species
        SELECT COUNT(*) INTO species_count 
        FROM species 
        WHERE clerk_organization_id = org.clerk_organization_id;
        
        -- Only seed if no species exist
        IF species_count = 0 THEN
            -- Seed all template species for this organization
            FOR template_species IN 
                SELECT * FROM default_species_template
            LOOP
                new_species_id := org.clerk_organization_id || '-species-' || LOWER(REGEXP_REPLACE(template_species.name, '[^a-zA-Z0-9]', '-', 'g'));
                
                INSERT INTO species (
                    id, 
                    name, 
                    scientific_name, 
                    description,
                    care_requirements,
                    clerk_user_id, 
                    clerk_organization_id,
                    created_at,
                    updated_at
                )
                VALUES (
                    new_species_id,
                    template_species.name,
                    template_species.scientific_name,
                    template_species.description,
                    template_species.care_requirements,
                    org.clerk_user_id,
                    org.clerk_organization_id,
                    NOW(),
                    NOW()
                )
                ON CONFLICT (id) DO NOTHING;
            END LOOP;
            
            RAISE NOTICE 'Seeded species for organization: %', org.clerk_organization_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- To seed existing organizations, run:
-- SELECT seed_existing_organizations();

-- To add more species to the template in the future:
/*
INSERT INTO default_species_template (name, scientific_name, description, species_code, category, species_type, subtype)
VALUES 
    ('New Species Name', 'Scientific name', 'Description', 'Code', 'Category', 'Type', 'Subtype');
*/