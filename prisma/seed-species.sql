-- Seed script for default species data
-- This script inserts native Australian species for all organizations
-- It should be run after organizations are created

-- Create a function to seed species for a given organization
CREATE OR REPLACE FUNCTION seed_species_for_organization(
    p_clerk_user_id TEXT,
    p_clerk_organization_id TEXT
) RETURNS void AS $$
BEGIN
    -- Mammals - Dunnart
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-fat-tailed-dunnart', 'Fat-tailed dunnart', 'Sminthopsis crassicaudata', 'Mammal - Dunnart. Category: Basic. Species Code: A01072', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Mammals - Dingo
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-wild-dog', 'Wild dog', 'Canis familiaris', 'Mammal - Dingo. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Mammals - Gliders
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-squirrel-glider', 'Squirrel glider', 'Petaurus norfolcensis', 'Mammal - Gliders. Category: Basic. Species Code: E04226', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-sugar-glider', 'Sugar glider', 'Petaurus breviceps', 'Mammal - Gliders. Category: Basic. Species Code: E01138', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Mammals - Possum
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-common-brushtail-possum', 'Common brushtail possum', 'Trichosurus vulpecula', 'Mammal - Possum. Category: Basic. Species Code: K01113', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Mammals - Potoroo and bettongs
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-brush-tailed-bettong-woylie', 'Brush-tailed bettong (Woylie)', 'Bettongia penicillata ogilbyi', 'Mammal - Potoroo and bettongs. Category: Basic. Species Code: M21002', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-long-nosed-potoroo', 'Long-nosed potoroo', 'Potorous tridactylus', 'Mammal - Potoroo and bettongs. Category: Basic. Species Code: Z01175', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-rufous-bettong', 'Rufous bettong', 'Aepyprymnus rufescens', 'Mammal - Potoroo and bettongs. Category: Basic. Species Code: W01187', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Mammals - Rodents
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-mitchell-s-hopping-mouse', 'Mitchell''s hopping-mouse', 'Notomys mitchellii', 'Mammal - Rodents. Category: Basic. Species Code: Y01480', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-plains-mouse-rat', 'Plains mouse (Rat)', 'Pseudomys australis', 'Mammal - Rodents. Category: Basic. Species Code: S01469', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-spinifex-hopping-mouse', 'Spinifex hopping-mouse', 'Notomys alexis', 'Mammal - Rodents. Category: Exempt. Species Code: K01481', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Mammals - Wallabies
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-parma-wallaby', 'Parma wallaby', 'Macropus parma', 'Mammal - Wallabies. Category: Basic. Species Code: K01245', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-red-necked-pademelon', 'Red-necked pademelon', 'Thylogale thetis', 'Mammal - Wallabies. Category: Basic. Species Code: Y01236', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-red-necked-wallaby', 'Red-necked wallaby', 'Macropus rufogriseus', 'Mammal - Wallabies. Category: Basic. Species Code: K01261', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-swamp-wallaby', 'Swamp wallaby', 'Wallabia bicolor', 'Mammal - Wallabies. Category: Basic. Species Code: E01242', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-tammar-wallaby', 'Tammar wallaby', 'Macropus eugenii eugenii', 'Mammal - Wallabies. Category: Basic. Species Code: C05889', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-tasmanian-pademelon', 'Tasmanian pademelon', 'Thylogale billardierii', 'Mammal - Wallabies. Category: Basic. Species Code: G01235', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Amphibians
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-southern-bell-frog', 'Southern bell frog', 'Litoria raniformis', 'Amphibian. Category: Basic. Species Code: G03207', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-smooth-frog', 'Smooth frog', 'Geocrinia laevis', 'Amphibian. Category: Basic. Species Code: C03029', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Reptiles - Dragon lizards
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-black-collared-dragon', 'Black-collared dragon', 'Ctenophorus clayi', 'Reptile - Dragon lizards. Category: Basic. Species Code: Z02179', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-central-bearded-dragon', 'Central bearded dragon', 'Pogona vitticeps', 'Reptile - Dragon lizards. Category: Exempt. Species Code: Y02204', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-central-netted-dragon', 'Central netted dragon', 'Ctenophorus nuchalis', 'Reptile - Dragon lizards. Category: Basic. Species Code: Q02196', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-crested-dragon', 'Crested dragon', 'Ctenophorus cristatus', 'Reptile - Dragon lizards. Category: Basic. Species Code: A02180', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-downs-bearded-dragon', 'Downs bearded dragon', 'Pogona henrylawsoni', 'Reptile - Dragon lizards. Category: Basic. Species Code: U05586', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-dwarf-bearded-dragon', 'Dwarf bearded dragon', 'Pogona minor minor', 'Reptile - Dragon lizards. Category: Basic. Species Code: G21035', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-eastern-bearded-dragon', 'Eastern bearded dragon', 'Pogona barbata', 'Reptile - Dragon lizards. Category: Basic. Species Code: K02177', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-eyrean-earless-dragon', 'Eyrean earless dragon', 'Tympanocryptis tetraporophora', 'Reptile - Dragon lizards. Category: Basic. Species Code: K02257', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-eyre-peninsula-dragon', 'Eyre Peninsula dragon', 'Ctenophorus fionni', 'Reptile - Dragon lizards. Category: Basic. Species Code: Y02184', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-gilbert-s-dragon', 'Gilbert''s dragon', 'Lophognathus gilberti', 'Reptile - Dragon lizards. Category: Basic. Species Code: E02246', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-jacky-lizard', 'Jacky lizard', 'Amphibolurus muricatus', 'Reptile - Dragon lizards. Category: Basic. Species Code: M02194', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-kimberley-bearded-dragon', 'Kimberley bearded dragon', 'Pogona microlepidota', 'Reptile - Dragon lizards. Category: Basic. Species Code: W05587', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-lined-earless-dragon', 'Lined earless dragon', 'Tympanocryptis lineata', 'Reptile - Dragon lizards. Category: Basic. Species Code: G02255', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-long-nosed-dragon', 'Long-nosed dragon', 'Gowidon longirostris', 'Reptile - Dragon lizards. Category: Basic. Species Code: G02247', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-mallee-dragon', 'Mallee dragon', 'Ctenophorus fordi', 'Reptile - Dragon lizards. Category: Basic. Species Code: K02185', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-military-dragon', 'Military dragon', 'Ctenophorus isolepis', 'Reptile - Dragon lizards. Category: Basic. Species Code: Z02187', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-mountain-dragon', 'Mountain dragon', 'Rankinia diemensis', 'Reptile - Dragon lizards. Category: Basic. Species Code: E02182', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-nobbi-dragon', 'Nobbi dragon', 'Diporiphora nobbi', 'Reptile - Dragon lizards. Category: Basic. Species Code: Z02195', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-north-west-bearded-dragon', 'North-west bearded dragon', 'Pogona minor mitchelli', 'Reptile - Dragon lizards. Category: Basic. Species Code: C04313', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-ornate-dragon', 'Ornate dragon', 'Ctenophorus ornatus', 'Reptile - Dragon lizards. Category: Basic. Species Code: U02198', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-painted-dragon', 'Painted dragon', 'Ctenophorus pictus', 'Reptile - Dragon lizards. Category: Basic. Species Code: W02199', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-red-barred-dragon', 'Red-barred dragon', 'Ctenophorus vadnappa', 'Reptile - Dragon lizards. Category: Basic. Species Code: G02203', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-ring-tailed-dragon', 'Ring-tailed dragon', 'Ctenophorus caudicinctus', 'Reptile - Dragon lizards. Category: Basic. Species Code: M02178', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-southern-angle-headed-dragon', 'Southern angle-headed dragon', 'Lophosaurus spinipes', 'Reptile - Dragon lizards. Category: Basic. Species Code: C02245', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-tawny-dragon', 'Tawny dragon', 'Ctenophorus decresii', 'Reptile - Dragon lizards. Category: Basic. Species Code: C02181', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-water-dragon', 'Water dragon', 'Intellagama lesueurii', 'Reptile - Dragon lizards. Category: Basic. Species Code: A02252', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-western-bearded-dragon', 'Western bearded dragon', 'Pogona minor minima', 'Reptile - Dragon lizards. Category: Basic. Species Code: G02191', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-western-netted-dragon', 'Western netted dragon', 'Ctenophorus reticulatus', 'Reptile - Dragon lizards. Category: Basic. Species Code: A02200', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Reptiles - Geckos (continued with more species...)
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-banded-knob-tail', 'Banded knob-tail', 'Nephrurus wheeleri', 'Reptile - Geckos. Category: Basic. Species Code: M05590', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-banded-velvet-gecko', 'Banded velvet gecko', 'Oedura cincta', 'Reptile - Geckos. Category: Basic. Species Code: Z02119', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-beaded-gecko', 'Beaded gecko', 'Lucasium damaeum', 'Reptile - Geckos. Category: Basic. Species Code: K02109', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-bynoe-s-gecko', 'Bynoe''s gecko', 'Heteronotia binoei', 'Reptile - Geckos. Category: Exempt. Species Code: C02105', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-centralian-knob-tailed-gecko', 'Centralian knob-tailed gecko', 'Nephrurus amyae', 'Reptile - Geckos. Category: Basic. Species Code: A04312', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-common-barking-gecko', 'Common barking gecko', 'Underwoodisaurus milii', 'Reptile - Geckos. Category: Exempt. Species Code: U02138', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-common-knob-tailed-gecko', 'Common knob-tailed gecko', 'Nephrurus levis', 'Reptile - Geckos. Category: Basic. Species Code: A02112', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-marbled-gecko', 'Marbled gecko', 'Christinus marmoratus', 'Reptile - Geckos. Category: Exempt. Species Code: M02126', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-western-tree-dtella', 'Western tree dtella', 'Gehyra variegata', 'Reptile - Geckos. Category: Exempt. Species Code: Z05371', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Reptiles - Legless lizards
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-common-scaly-foot', 'Common scaly-foot', 'Pygopus lepidopodus', 'Reptile - Legless lizards. Category: Basic. Species Code: E02174', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-eastern-hooded-scaly-foot', 'Eastern hooded scaly-foot', 'Pygopus schraderi', 'Reptile - Legless lizards. Category: Basic. Species Code: Q04044', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-excitable-delma', 'Excitable delma', 'Delma tincta', 'Reptile - Legless lizards. Category: Basic. Species Code: C02165', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Reptiles - Monitors and goannas
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-black-headed-monitor', 'Black-headed monitor', 'Varanus tristis', 'Reptile - Monitors and goannas. Category: Basic. Species Code: M02282', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-gould-s-goanna', 'Gould''s goanna', 'Varanus gouldii gouldii', 'Reptile - Monitors and goannas. Category: Basic. Species Code: U21022', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-sand-monitor-arid-subspecies', 'Sand monitor (arid subspecies)', 'Varanus gouldii flavirufus', 'Reptile - Monitors and goannas. Category: Basic. Species Code: W21023', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-ridge-tailed-monitor', 'Ridge-tailed monitor', 'Varanus acanthurus', 'Reptile - Monitors and goannas. Category: Basic. Species Code: G02263', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Reptiles - Common Skinks
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-eastern-bluetongue', 'Eastern bluetongue', 'Tiliqua scincoides', 'Reptile - Skinks. Category: Exempt. Species Code: Y02580', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-blotched-bluetongue', 'Blotched bluetongue', 'Tiliqua nigrolutea', 'Reptile - Skinks. Category: Basic. Species Code: U02578', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-western-bluetongue', 'Western bluetongue', 'Tiliqua occipitalis', 'Reptile - Skinks. Category: Basic. Species Code: W02579', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-centralian-bluetongue', 'Centralian bluetongue', 'Tiliqua multifasciata', 'Reptile - Skinks. Category: Basic. Species Code: S02577', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-sleepy-lizard', 'Sleepy lizard', 'Tiliqua rugosa', 'Reptile - Skinks. Category: Exempt. Species Code: Z02583', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-cunningham-s-skink', 'Cunningham''s skink', 'Egernia cunninghami', 'Reptile - Skinks. Category: Basic. Species Code: Y02408', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-king-s-skink', 'King''s skink', 'Egernia kingii', 'Reptile - Skinks. Category: Basic. Species Code: E02414', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-gidgee-skink', 'Gidgee skink', 'Egernia stokesii', 'Reptile - Skinks. Category: Basic. Species Code: Z02427', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-garden-skink', 'Garden skink', 'Lampropholis guichenoti', 'Reptile - Skinks. Category: Exempt. Species Code: Z02451', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-delicate-skink', 'Delicate skink', 'Lampropholis delicata', 'Reptile - Skinks. Category: Exempt. Species Code: M02450', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-eastern-water-skink', 'Eastern water skink', 'Eulamprus quoyii', 'Reptile - Skinks. Category: Exempt. Species Code: K02557', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-pink-tongued-lizard', 'Pink-tongued lizard', 'Cyclodomorphus gerrardii', 'Reptile - Skinks. Category: Basic. Species Code: Y05492', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Reptiles - Snakes
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-black-headed-python', 'Black-headed python', 'Aspidites melanocephalus', 'Reptile - Snakes. Category: Basic. Species Code: Q02612', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-carpet-python', 'Carpet python', 'Morelia spilota', 'Reptile - Snakes. Category: Basic. Species Code: C02625', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-centralian-carpet-python', 'Centralian carpet python', 'Morelia bredli', 'Reptile - Snakes. Category: Basic. Species Code: W05607', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-childrens-python', 'Childrens python', 'Antaresia childreni', 'Reptile - Snakes. Category: Basic. Species Code: M05582', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-spotted-python', 'Spotted python', 'Antaresia maculosa', 'Reptile - Snakes. Category: Basic. Species Code: C05609', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-stimson-s-python', 'Stimson''s python', 'Antaresia stimsoni', 'Reptile - Snakes. Category: Basic. Species Code: G02619', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-olive-python', 'Olive python', 'Liasis olivaceus', 'Reptile - Snakes. Category: Basic. Species Code: S02621', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-water-python', 'Water python', 'Liasis fuscus', 'Reptile - Snakes. Category: Basic. Species Code: Q02620', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-woma', 'Woma', 'Aspidites ramsayi', 'Reptile - Snakes. Category: Basic. Species Code: S02613', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-common-green-tree-snake', 'Common (green) tree snake', 'Dendrelaphis punctulatus', 'Reptile - Snakes. Category: Basic. Species Code: C02633', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-brown-tree-snake', 'Brown tree snake', 'Boiga irregularis', 'Reptile - Snakes. Category: Basic. Species Code: U02630', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-keelback-snake', 'Keelback snake', 'Tropidonophis mairii', 'Reptile - Snakes. Category: Basic. Species Code: K02629', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Reptiles - Turtles and tortoises
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-eastern-long-necked-tortoise', 'Eastern long-necked tortoise', 'Chelodina longicollis', 'Reptile - Turtles and tortoises. Category: Exempt. Species Code: C02017', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-broadshelled-tortoise', 'Broadshelled tortoise', 'Chelodina expansa', 'Reptile - Turtles and tortoises. Category: Basic. Species Code: A02016', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-macquarie-river-turtle', 'Macquarie River turtle', 'Emydura macquarii macquarii', 'Reptile - Turtles and tortoises. Category: Exempt. Species Code: W05579', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-saw-shelled-turtle', 'Saw-shelled turtle', 'Wollumbinia latisternum', 'Reptile - Turtles and tortoises. Category: Basic. Species Code: K02029', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - Common Cockatoos and parrots
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-sulphur-crested-cockatoo', 'Sulphur-crested cockatoo', 'Cacatua galerita', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: Q04176', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-galah', 'Galah', 'Cacatua roseicapilla', 'Bird - Cockatoos and parrots. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-little-corella', 'Little corella', 'Cacatua sanguinea', 'Bird - Cockatoos and parrots. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-long-billed-corella', 'Long-billed corella', 'Cacatua tenuirostris', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: A00272', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-major-mitchell-s-cockatoo', 'Major Mitchell''s cockatoo', 'Lophochroa leadbeateri', 'Bird - Cockatoos and parrots. Category: Basic. Species Code: U00270', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-cockatiel', 'Cockatiel', 'Nymphicus hollandicus', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: E00274', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-budgerygah', 'Budgerygah', 'Melopsittacus undulatus', 'Bird - Cockatoos and parrots. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - Rosellas
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-eastern-rosella', 'Eastern rosella', 'Platycercus eximius', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: S04177', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-crimson-rosella', 'Crimson rosella', 'Platycercus elegans (elegans & melanopterus)', 'Bird - Cockatoos and parrots. Category: Basic. Species Code: A15072', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-pale-headed-rosella', 'Pale-headed rosella', 'Platycercus adscitus', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: M00286', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-western-rosella', 'Western rosella', 'Platycercus icterotis', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: S00289', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-green-rosella', 'Green rosella', 'Platycercus caledonicus', 'Bird - Cockatoos and parrots. Category: Basic. Species Code: K00285', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - Lorikeets
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-rainbow-lorikeet', 'Rainbow lorikeet', 'Trichoglossus haematodus', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: U00254', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-scaly-breasted-lorikeet', 'Scaly-breasted lorikeet', 'Trichoglossus chlorolepidotus', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: A00256', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-musk-lorikeet', 'Musk lorikeet', 'Glossopsitta concinna', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: E00258', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-little-lorikeet', 'Little lorikeet', 'Parvipsitta pusilla', 'Bird - Cockatoos and parrots. Category: Basic. Species Code: Q00260', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - King parrots and others
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-australian-king-parrot', 'Australian king-parrot', 'Alisterus scapularis', 'Bird - Cockatoos and parrots. Category: Basic. Species Code: C00281', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-red-winged-parrot', 'Red-winged parrot', 'Aprosmictus erythropterus', 'Bird - Cockatoos and parrots. Category: Basic. Species Code: M04246', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-superb-parrot', 'Superb parrot', 'Polytelis swainsonii', 'Bird - Cockatoos and parrots. Category: Basic. Species Code: K00277', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-red-rumped-parrot', 'Red-rumped parrot', 'Psephotus haematonotus', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: Z00295', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-turquoise-parrot', 'Turquoise parrot', 'Neophema pulchella', 'Bird - Cockatoos and parrots. Category: Exempt. Species Code: E00302', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - Water birds
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-black-swan', 'Black swan', 'Cygnus atratus', 'Bird - Ducks, geese and swans. Category: Basic. Species Code: W00203', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-cape-barren-goose', 'Cape Barren goose', 'Cereopsis novaehollandiae novaehollandiae', 'Bird - Ducks, geese and swans. Category: Basic. Species Code: M00198', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-australian-shelduck', 'Australian shelduck', 'Tadorna tadornoides', 'Bird - Ducks, geese and swans. Category: Basic. Species Code: G00207', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-pacific-black-duck', 'Pacific black duck', 'Anas superciliosa', 'Bird - Ducks, geese and swans. Category: Exempt. Species Code: E04146', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-maned-duck-australian-wood-duck', 'Maned duck (Australian wood duck)', 'Chenonetta jubata', 'Bird - Ducks, geese and swans. Category: Exempt. Species Code: U00202', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-grey-teal-australasian-teal', 'Grey teal (Australasian teal)', 'Anas gracilis', 'Bird - Ducks, geese and swans. Category: Basic. Species Code: Y04148', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-chestnut-teal', 'Chestnut teal', 'Anas castanea', 'Bird - Ducks, geese and swans. Category: Exempt. Species Code: U00210', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-dusky-moorhen', 'Dusky moorhen', 'Gallinula tenebrosa', 'Bird - Nativehens. Category: Basic. Species Code: C04145', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - Common native birds
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-australian-magpie', 'Australian Magpie', 'Gymnorhina tibicen', 'Bird - Magpie. Category: Exempt. Species Code: S00705', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-magpielark', 'Magpielark', 'Grallina cyanoleuca', 'Bird - Magpielark. Category: Exempt. Species Code: W00415', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-laughing-kookaburra', 'Laughing kookaburra', 'Dacelo novaeguineae', 'Bird - Kookaburras. Category: Basic. Species Code: S04169', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-blue-winged-kookaburra', 'Blue-winged kookaburra', 'Dacelo leachii', 'Bird - Kookaburras. Category: Basic. Species Code: Z00323', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-tawny-frogmouth', 'Tawny frogmouth', 'Podargus strigoides', 'Bird - Frogmouth. Category: Basic. Species Code: K00313', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-southern-boobook', 'Southern boobook', 'Ninox boobook', 'Bird - Owl. Category: Basic. Species Code: M00242', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - Pigeons and doves
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-crested-pigeon', 'Crested pigeon', 'Ocyphaps lophotes', 'Bird - Pigeons and doves. Category: Exempt. Species Code: W00043', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-peaceful-dove', 'Peaceful dove', 'Geopelia placida', 'Bird - Pigeons and doves. Category: Exempt. Species Code: Q04168', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-diamond-dove', 'Diamond dove', 'Geopelia cuneata', 'Bird - Pigeons and doves. Category: Exempt. Species Code: Z00031', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-bar-shouldered-dove', 'Bar-shouldered dove', 'Geopelia humeralis', 'Bird - Pigeons and doves. Category: Exempt. Species Code: Q00032', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-common-bronzewing', 'Common bronzewing', 'Phaps chalcoptera', 'Bird - Pigeons and doves. Category: Exempt. Species Code: U00034', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-wonga-pigeon', 'Wonga pigeon', 'Leucosarcia melanoleuca', 'Bird - Pigeons and doves. Category: Exempt. Species Code: A00044', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - Finches
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-zebra-finch', 'Zebra finch', 'Poephila guttata', 'Bird - Finches. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-gouldian-finch', 'Gouldian finch', 'Erythrura gouldiae', 'Bird - Finches. Category: Exempt. Species Code: E00670', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-red-browed-finch', 'Red-browed finch', 'Neochmia temporalis', 'Bird - Finches. Category: Basic. Species Code: G04075', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-diamond-firetail', 'Diamond Firetail', 'Stagonopleura guttata', 'Bird - Finches. Category: Basic. Species Code: A00652', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-double-barred-finch-white-rump', 'Double-barred finch (White rump)', 'Stizoptera bichenovii bichenovii', 'Bird - Finches. Category: Exempt. Species Code: Y21028', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - Honeyeaters
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-noisy-miner', 'Noisy miner', 'Manorina melanocephala', 'Bird - Honeyeaters and chats. Category: Exempt. Species Code: U00634', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-red-wattlebird', 'Red wattlebird', 'Anthochaera carunculata', 'Bird - Honeyeaters and chats. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-little-wattlebird', 'Little wattlebird', 'Anthochaera chrysoptera', 'Bird - Honeyeaters and chats. Category: Exempt. Species Code: G04163', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-new-holland-honeyeater', 'New Holland honeyeater', 'Phylidonyris novaehollandiae', 'Bird - Honeyeaters and chats. Category: Exempt. Species Code: U04126', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-white-plumed-honeyeater', 'White-plumed honeyeater', 'Ptilotula penicillata', 'Bird - Honeyeaters and chats. Category: Exempt. Species Code: S00625', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-blue-faced-honeyeater', 'Blue-faced honeyeater', 'Entomyzon cyanotis', 'Bird - Honeyeaters and chats. Category: Basic. Species Code: Y04200', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Birds - Other common species
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-emu', 'Emu', 'Dromaius novaehollandiae', 'Bird - Emu. Category: Basic. Species Code: C00001', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-australian-raven', 'Australian raven', 'Corvus coronoides', 'Bird - Crows. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-australian-crow', 'Australian crow', 'Corvus orru cecilae', 'Bird - Crows. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-little-crow', 'Little crow', 'Corvus bennetti', 'Bird - Crows. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-little-raven', 'Little raven', 'Corvus mellori', 'Bird - Crows. Category: Unprotected', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-silver-gull', 'Silver gull', 'Chroicocephalus novaehollandiae', 'Bird - Plovers and gulls. Category: Exempt. Species Code: C04065', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-masked-lapwing-northern-subspecies', 'Masked lapwing (northern subspecies)', 'Vanellus miles miles', 'Bird - Plovers and gulls. Category: Basic. Species Code: C00133', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-bush-stonecurlew', 'Bush stonecurlew', 'Burhinus grallarius', 'Bird - Stonecurlew. Category: Basic. Species Code: U00174', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Add some commonly rescued species at the top for easy access
    INSERT INTO species (id, name, scientific_name, description, clerk_user_id, clerk_organization_id, created_at, updated_at)
    VALUES 
    (p_clerk_organization_id || '-species-koala', 'Koala', 'Phascolarctos cinereus', 'Mammal - Commonly rescued marsupial. Protected native species requiring specialist care.', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-eastern-grey-kangaroo', 'Eastern Grey Kangaroo', 'Macropus giganteus', 'Mammal - Large macropod. Commonly rescued from vehicle strikes.', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-common-wombat', 'Common Wombat', 'Vombatus ursinus', 'Mammal - Large burrowing marsupial. Commonly affected by sarcoptic mange.', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-echidna', 'Short-beaked Echidna', 'Tachyglossus aculeatus', 'Mammal - Monotreme (egg-laying mammal). Protected species.', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-platypus', 'Platypus', 'Ornithorhynchus anatinus', 'Mammal - Monotreme. Highly specialized care requirements.', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-flying-fox-grey-headed', 'Grey-headed Flying-fox', 'Pteropus poliocephalus', 'Mammal - Large fruit bat. Vulnerable species. Requires vaccinated handlers.', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-flying-fox-black', 'Black Flying-fox', 'Pteropus alecto', 'Mammal - Large fruit bat. Requires vaccinated handlers.', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW()),
    (p_clerk_organization_id || '-species-microbat-various', 'Microbat (various species)', 'Various genera', 'Mammal - Small insectivorous bats. Multiple species requiring identification.', p_clerk_user_id, p_clerk_organization_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Example: Call this function for each organization
-- This would typically be called when a new organization is created
-- SELECT seed_species_for_organization('user_id', 'org_id');

-- To seed for all existing organizations, you can use:
-- DO $$
-- DECLARE
--     org RECORD;
-- BEGIN
--     FOR org IN SELECT DISTINCT clerk_organization_id, clerk_user_id FROM animals
--     LOOP
--         PERFORM seed_species_for_organization(org.clerk_user_id, org.clerk_organization_id);
--     END LOOP;
-- END $$;