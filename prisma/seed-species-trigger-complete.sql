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

-- Clear existing template data to ensure clean insert
TRUNCATE TABLE default_species_template RESTART IDENTITY CASCADE;

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
    
    -- MAMMALS
    -- Dunnart
    ('Fat-tailed dunnart', 'Sminthopsis crassicaudata', 'Mammal - Dunnart. Category: Basic', 'A01072', 'Basic', 'Mammal', 'Dunnart'),
    
    -- Dingo
    ('Wild dog', 'Canis familiaris', 'Mammal - Dingo. Category: Unprotected', NULL, 'Unprotected', 'Mammal', 'Dingo'),
    
    -- Gliders
    ('Squirrel glider', 'Petaurus norfolcensis', 'Mammal - Gliders. Category: Basic', 'E04226', 'Basic', 'Mammal', 'Gliders'),
    ('Sugar glider', 'Petaurus breviceps', 'Mammal - Gliders. Category: Basic', 'E01138', 'Basic', 'Mammal', 'Gliders'),
    
    -- Possum
    ('Common brushtail possum', 'Trichosurus vulpecula', 'Mammal - Possum. Category: Basic', 'K01113', 'Basic', 'Mammal', 'Possum'),
    
    -- Potoroo and bettongs
    ('Brush-tailed bettong (Woylie)', 'Bettongia penicillata ogilbyi', 'Mammal - Potoroo and bettongs. Category: Basic', 'M21002', 'Basic', 'Mammal', 'Potoroo and bettongs'),
    ('Long-nosed potoroo', 'Potorous tridactylus', 'Mammal - Potoroo and bettongs. Category: Basic', 'Z01175', 'Basic', 'Mammal', 'Potoroo and bettongs'),
    ('Rufous bettong', 'Aepyprymnus rufescens', 'Mammal - Potoroo and bettongs. Category: Basic', 'W01187', 'Basic', 'Mammal', 'Potoroo and bettongs'),
    
    -- Rodents
    ('Mitchell''s hopping-mouse', 'Notomys mitchellii', 'Mammal - Rodents. Category: Basic', 'Y01480', 'Basic', 'Mammal', 'Rodents'),
    ('Plains mouse (Rat)', 'Pseudomys australis', 'Mammal - Rodents. Category: Basic', 'S01469', 'Basic', 'Mammal', 'Rodents'),
    ('Spinifex hopping-mouse', 'Notomys alexis', 'Mammal - Rodents. Category: Exempt', 'K01481', 'Exempt', 'Mammal', 'Rodents'),
    
    -- Wallabies
    ('Parma wallaby', 'Macropus parma', 'Mammal - Wallabies. Category: Basic', 'K01245', 'Basic', 'Mammal', 'Wallabies'),
    ('Red-necked pademelon', 'Thylogale thetis', 'Mammal - Wallabies. Category: Basic', 'Y01236', 'Basic', 'Mammal', 'Wallabies'),
    ('Red-necked wallaby', 'Macropus rufogriseus', 'Mammal - Wallabies. Category: Basic', 'K01261', 'Basic', 'Mammal', 'Wallabies'),
    ('Swamp wallaby', 'Wallabia bicolor', 'Mammal - Wallabies. Category: Basic', 'E01242', 'Basic', 'Mammal', 'Wallabies'),
    ('Tammar wallaby', 'Macropus eugenii eugenii', 'Mammal - Wallabies. Category: Basic', 'C05889', 'Basic', 'Mammal', 'Wallabies'),
    ('Tasmanian pademelon', 'Thylogale billardierii', 'Mammal - Wallabies. Category: Basic', 'G01235', 'Basic', 'Mammal', 'Wallabies'),
    
    -- AMPHIBIANS
    ('Southern bell frog', 'Litoria raniformis', 'Amphibian. Category: Basic', 'G03207', 'Basic', 'Amphibian', NULL),
    ('Smooth frog', 'Geocrinia laevis', 'Amphibian. Category: Basic', 'C03029', 'Basic', 'Amphibian', NULL),
    
    -- REPTILES
    -- Dragon lizards
    ('Black-collared dragon', 'Ctenophorus clayi', 'Reptile - Dragon lizards. Category: Basic', 'Z02179', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Central bearded dragon', 'Pogona vitticeps', 'Reptile - Dragon lizards. Category: Exempt', 'Y02204', 'Exempt', 'Reptile', 'Dragon lizards'),
    ('Central netted dragon', 'Ctenophorus nuchalis', 'Reptile - Dragon lizards. Category: Basic', 'Q02196', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Crested dragon', 'Ctenophorus cristatus', 'Reptile - Dragon lizards. Category: Basic', 'A02180', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Downs bearded dragon', 'Pogona henrylawsoni', 'Reptile - Dragon lizards. Category: Basic', 'U05586', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Dwarf bearded dragon', 'Pogona minor minor', 'Reptile - Dragon lizards. Category: Basic', 'G21035', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Eastern bearded dragon', 'Pogona barbata', 'Reptile - Dragon lizards. Category: Basic', 'K02177', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Eyrean earless dragon', 'Tympanocryptis tetraporophora', 'Reptile - Dragon lizards. Category: Basic', 'K02257', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Eyre Peninsula dragon', 'Ctenophorus fionni', 'Reptile - Dragon lizards. Category: Basic', 'Y02184', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Gilbert''s dragon', 'Lophognathus gilberti', 'Reptile - Dragon lizards. Category: Basic', 'E02246', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Jacky lizard', 'Amphibolurus muricatus', 'Reptile - Dragon lizards. Category: Basic', 'M02194', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Kimberley bearded dragon', 'Pogona microlepidota', 'Reptile - Dragon lizards. Category: Basic', 'W05587', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Lined earless dragon', 'Tympanocryptis lineata', 'Reptile - Dragon lizards. Category: Basic', 'G02255', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Long-nosed dragon', 'Gowidon longirostris', 'Reptile - Dragon lizards. Category: Basic', 'G02247', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Mallee dragon', 'Ctenophorus fordi', 'Reptile - Dragon lizards. Category: Basic', 'K02185', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Military dragon', 'Ctenophorus isolepis', 'Reptile - Dragon lizards. Category: Basic', 'Z02187', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Mountain dragon', 'Rankinia diemensis', 'Reptile - Dragon lizards. Category: Basic', 'E02182', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Nobbi dragon', 'Diporiphora nobbi', 'Reptile - Dragon lizards. Category: Basic', 'Z02195', 'Basic', 'Reptile', 'Dragon lizards'),
    ('North-west bearded dragon', 'Pogona minor mitchelli', 'Reptile - Dragon lizards. Category: Basic', 'C04313', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Ornate dragon', 'Ctenophorus ornatus', 'Reptile - Dragon lizards. Category: Basic', 'U02198', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Painted dragon', 'Ctenophorus pictus', 'Reptile - Dragon lizards. Category: Basic', 'W02199', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Red-barred dragon', 'Ctenophorus vadnappa', 'Reptile - Dragon lizards. Category: Basic', 'G02203', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Ring-tailed dragon', 'Ctenophorus caudicinctus', 'Reptile - Dragon lizards. Category: Basic', 'M02178', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Southern angle-headed dragon', 'Lophosaurus spinipes', 'Reptile - Dragon lizards. Category: Basic', 'C02245', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Tawny dragon', 'Ctenophorus decresii', 'Reptile - Dragon lizards. Category: Basic', 'C02181', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Water dragon', 'Intellagama lesueurii', 'Reptile - Dragon lizards. Category: Basic', 'A02252', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Western bearded dragon', 'Pogona minor minima', 'Reptile - Dragon lizards. Category: Basic', 'G02191', 'Basic', 'Reptile', 'Dragon lizards'),
    ('Western netted dragon', 'Ctenophorus reticulatus', 'Reptile - Dragon lizards. Category: Basic', 'A02200', 'Basic', 'Reptile', 'Dragon lizards'),
    
    -- Geckos
    ('Banded knob-tail', 'Nephrurus wheeleri', 'Reptile - Geckos. Category: Basic', 'M05590', 'Basic', 'Reptile', 'Geckos'),
    ('Banded velvet gecko', 'Oedura cincta', 'Reptile - Geckos. Category: Basic', 'Z02119', 'Basic', 'Reptile', 'Geckos'),
    ('Beaded gecko', 'Lucasium damaeum', 'Reptile - Geckos. Category: Basic', 'K02109', 'Basic', 'Reptile', 'Geckos'),
    ('Bynoe''s gecko', 'Heteronotia binoei', 'Reptile - Geckos. Category: Exempt', 'C02105', 'Exempt', 'Reptile', 'Geckos'),
    ('Centralian knob-tailed gecko', 'Nephrurus amyae', 'Reptile - Geckos. Category: Basic', 'A04312', 'Basic', 'Reptile', 'Geckos'),
    ('Common barking gecko', 'Underwoodisaurus milii', 'Reptile - Geckos. Category: Exempt', 'U02138', 'Exempt', 'Reptile', 'Geckos'),
    ('Common knob-tailed gecko', 'Nephrurus levis', 'Reptile - Geckos. Category: Basic', 'A02112', 'Basic', 'Reptile', 'Geckos'),
    ('Dotted velvet gecko', 'Oedura gemmata', 'Reptile - Geckos. Category: Basic', 'C05589', 'Basic', 'Reptile', 'Geckos'),
    ('Eastern stone gecko', 'Diplodactylus vittatus (revised)', 'Reptile - Geckos. Category: Basic', 'Q04492', 'Basic', 'Reptile', 'Geckos'),
    ('Fringe-toed velvet gecko', 'Oedura filicipoda', 'Reptile - Geckos. Category: Basic', 'A05588', 'Basic', 'Reptile', 'Geckos'),
    ('Gibber gecko', 'Lucasium byrnei', 'Reptile - Geckos. Category: Basic', 'Y02052', 'Basic', 'Reptile', 'Geckos'),
    ('Golden-tailed gecko', 'Strophurus taenicauda', 'Reptile - Geckos. Category: Basic', 'W02075', 'Basic', 'Reptile', 'Geckos'),
    ('Helmeted gecko', 'Diplodactylus galeatus', 'Reptile - Geckos. Category: Basic', 'S02057', 'Basic', 'Reptile', 'Geckos'),
    ('Jewelled gecko', 'Strophurus elderi', 'Reptile - Geckos. Category: Basic', 'Z02055', 'Basic', 'Reptile', 'Geckos'),
    ('Lesueur''s velvet gecko', 'Amalosia lesueurii', 'Reptile - Geckos. Category: Basic', 'M02118', 'Basic', 'Reptile', 'Geckos'),
    ('Map gecko', 'Lucasium steindachneri', 'Reptile - Geckos. Category: Basic', 'K04261', 'Basic', 'Reptile', 'Geckos'),
    ('Marbled gecko', 'Christinus marmoratus', 'Reptile - Geckos. Category: Exempt', 'M02126', 'Exempt', 'Reptile', 'Geckos'),
    ('Northern giant cave gecko', 'Pseudothecadactylus lindneri', 'Reptile - Geckos. Category: Basic', 'Z02135', 'Basic', 'Reptile', 'Geckos'),
    ('Northern knob-tailed gecko', 'Nephrurus sheai', 'Reptile - Geckos. Category: Basic', 'Z05583', 'Basic', 'Reptile', 'Geckos'),
    ('Northern spiny-tailed gecko', 'Strophurus ciliaris', 'Reptile - Geckos. Category: Basic', 'K02053', 'Basic', 'Reptile', 'Geckos'),
    ('Northern spotted velvet gecko', 'Oedura coggeri', 'Reptile - Geckos. Category: Basic', 'K02117', 'Basic', 'Reptile', 'Geckos'),
    ('Northern velvet gecko', 'Oedura castelnaui', 'Reptile - Geckos. Category: Basic', 'Y02116', 'Basic', 'Reptile', 'Geckos'),
    ('Ocellated velvet gecko', 'Oedura monilis', 'Reptile - Geckos. Category: Basic', 'A02120', 'Basic', 'Reptile', 'Geckos'),
    ('Pale knob-tailed gecko', 'Nephrurus laevissimus', 'Reptile - Geckos. Category: Basic', 'W02111', 'Basic', 'Reptile', 'Geckos'),
    ('Phasmid striped gecko', 'Strophurus taeniatus', 'Reptile - Geckos. Category: Basic', 'A05596', 'Basic', 'Reptile', 'Geckos'),
    ('Ring-tailed gecko', 'Cyrtodactylus tuberculatus', 'Reptile - Geckos. Category: Basic', 'S02049', 'Basic', 'Reptile', 'Geckos'),
    ('Robust tree dtella', 'Gehyra purpurascens', 'Reptile - Geckos. Category: Basic', 'K02089', 'Basic', 'Reptile', 'Geckos'),
    ('Robust velvet gecko', 'Nebulifera robusta', 'Reptile - Geckos. Category: Basic', 'G02123', 'Basic', 'Reptile', 'Geckos'),
    ('Rough knob-tail', 'Nephrurus asper', 'Reptile - Geckos. Category: Basic', 'U02110', 'Basic', 'Reptile', 'Geckos'),
    ('Rough-throated leaf-tailed gecko', 'Saltuarius salebrosus', 'Reptile - Geckos. Category: Basic', 'C05597', 'Basic', 'Reptile', 'Geckos'),
    ('Sandplain gecko', 'Lucasium stenodactylum', 'Reptile - Geckos. Category: Basic', 'Q04424', 'Basic', 'Reptile', 'Geckos'),
    ('Short-tailed dtella', 'Gehyra baliola', 'Reptile - Geckos. Category: Basic', 'G05599', 'Basic', 'Reptile', 'Geckos'),
    ('Southern spiny-tailed gecko', 'Strophurus intermedius', 'Reptile - Geckos. Category: Basic', 'W02059', 'Basic', 'Reptile', 'Geckos'),
    ('Southern spotted velvet gecko', 'Oedura tryoni', 'Reptile - Geckos. Category: Basic', 'Y02124', 'Basic', 'Reptile', 'Geckos'),
    ('Starred knob-tailed gecko', 'Nephrurus stellatus', 'Reptile - Geckos. Category: Basic', 'C02113', 'Basic', 'Reptile', 'Geckos'),
    ('Western spiny-tailed gecko', 'Strophurus strophurus', 'Reptile - Geckos. Category: Basic', 'Y05600', 'Basic', 'Reptile', 'Geckos'),
    ('Wheat-belt stone gecko', 'Diplodactylus granariensis (revised)', 'Reptile - Geckos. Category: Basic', 'U05622', 'Basic', 'Reptile', 'Geckos'),
    ('Western tree dtella', 'Gehyra variegata', 'Reptile - Geckos. Category: Exempt', 'Z05371', 'Exempt', 'Reptile', 'Geckos'),
    
    -- Legless lizards
    ('Common scaly-foot', 'Pygopus lepidopodus', 'Reptile - Legless lizards. Category: Basic', 'E02174', 'Basic', 'Reptile', 'Legless lizards'),
    ('Eastern hooded scaly-foot', 'Pygopus schraderi', 'Reptile - Legless lizards. Category: Basic', 'Q04044', 'Basic', 'Reptile', 'Legless lizards'),
    ('Excitable delma', 'Delma tincta', 'Reptile - Legless lizards. Category: Basic', 'C02165', 'Basic', 'Reptile', 'Legless lizards'),
    ('Gulfs delma', 'Delma molleri', 'Reptile - Legless lizards. Category: Basic', 'S02161', 'Basic', 'Reptile', 'Legless lizards'),
    ('Patternless delma', 'Delma inornata', 'Reptile - Legless lizards. Category: Basic', 'Q02160', 'Basic', 'Reptile', 'Legless lizards'),
    ('Western hooded scaly-foot', 'Pygopus nigriceps', 'Reptile - Legless lizards. Category: Basic', 'G02175', 'Basic', 'Reptile', 'Legless lizards'),
    
    -- Monitors and goannas
    ('Black-headed monitor', 'Varanus tristis', 'Reptile - Monitors and goannas. Category: Basic', 'M02282', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Black-palmed monitor', 'Varanus glebopalma', 'Reptile - Monitors and goannas. Category: Basic', 'K05601', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Black-spotted spiny-tailed monitor', 'Varanus baritji', 'Reptile - Monitors and goannas. Category: Basic', 'G04315', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Desert pygmy goanna', 'Varanus eremius', 'Reptile - Monitors and goannas. Category: Basic', 'M02266', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Gould''s goanna', 'Varanus gouldii gouldii', 'Reptile - Monitors and goannas. Category: Basic', 'U21022', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Kimberley rock monitor', 'Varanus glauerti', 'Reptile - Monitors and goannas. Category: Basic', 'S02269', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Long-tailed rock monitor', 'Varanus kingorum', 'Reptile - Monitors and goannas. Category: Basic', 'M05602', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Mangrove monitor', 'Varanus indicus', 'Reptile - Monitors and goannas. Category: Basic', 'Y02272', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Mertens'' water monitor', 'Varanus mertensi', 'Reptile - Monitors and goannas. Category: Basic', 'K02273', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Mitchell''s water monitor', 'Varanus mitchelli', 'Reptile - Monitors and goannas. Category: Basic', 'M02274', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Northern ridge-tailed monitor', 'Varanus primordius', 'Reptile - Monitors and goannas. Category: Basic', 'Z05603', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Pilbara Mulga monitor', 'Varanus bushi', 'Reptile - Monitors and goannas. Category: Basic', 'K05581', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Pilbara rock monitor', 'Varanus pilbarensis', 'Reptile - Monitors and goannas. Category: Basic', 'Q05604', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Pygmy Mulga goanna', 'Varanus gilleni', 'Reptile - Monitors and goannas. Category: Basic', 'Q02268', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Ridge-tailed monitor', 'Varanus acanthurus', 'Reptile - Monitors and goannas. Category: Basic', 'G02263', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Rusty monitor', 'Varanus semiremex', 'Reptile - Monitors and goannas. Category: Basic', 'U02278', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Sand monitor (arid subspecies)', 'Varanus gouldii flavirufus', 'Reptile - Monitors and goannas. Category: Basic', 'W21023', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Short-tailed pygmy goanna', 'Varanus brevicauda', 'Reptile - Monitors and goannas. Category: Basic', 'Y04112', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Spencer''s monitor', 'Varanus spenceri', 'Reptile - Monitors and goannas. Category: Basic', 'W02279', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Spotted tree monitor', 'Varanus scalaris', 'Reptile - Monitors and goannas. Category: Basic', 'K05493', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Storr''s monitor', 'Varanus storri', 'Reptile - Monitors and goannas. Category: Basic', 'S05605', 'Basic', 'Reptile', 'Monitors and goannas'),
    ('Stripe-tailed monitor', 'Varanus caudolineatus', 'Reptile - Monitors and goannas. Category: Basic', 'U05606', 'Basic', 'Reptile', 'Monitors and goannas'),
    
    -- Skinks
    ('Adelaide snake-eye', 'Morethia adelaidensis', 'Reptile - Skinks. Category: Exempt', 'S02525', 'Exempt', 'Reptile', 'Skinks'),
    ('Black rock skink', 'Egernia saxatilis', 'Reptile - Skinks. Category: Basic', 'K02425', 'Basic', 'Reptile', 'Skinks'),
    ('Blacksoil skink', 'Proablepharus kinghorni', 'Reptile - Skinks. Category: Basic', 'Q04192', 'Basic', 'Reptile', 'Skinks'),
    ('Blotched bluetongue', 'Tiliqua nigrolutea', 'Reptile - Skinks. Category: Basic', 'U02578', 'Basic', 'Reptile', 'Skinks'),
    ('Bougainville''s skink', 'Lerista bougainvillii', 'Reptile - Skinks. Category: Exempt', 'G02475', 'Exempt', 'Reptile', 'Skinks'),
    ('Broad-banded sandswimmer', 'Eremiascincus richardsonii', 'Reptile - Skinks. Category: Basic', 'U02438', 'Basic', 'Reptile', 'Skinks'),
    ('Bull skink', 'Liopholis multiscutata', 'Reptile - Skinks. Category: Basic', 'A02420', 'Basic', 'Reptile', 'Skinks'),
    ('Centralian bluetongue', 'Tiliqua multifasciata', 'Reptile - Skinks. Category: Basic', 'S02577', 'Basic', 'Reptile', 'Skinks'),
    ('Centralian Ranges rock-skink', 'Liopholis margaretae', 'Reptile - Skinks. Category: Basic', 'M02418', 'Basic', 'Reptile', 'Skinks'),
    ('Common desert ctenotus', 'Ctenotus leonhardii', 'Reptile - Skinks. Category: Basic', 'S02365', 'Basic', 'Reptile', 'Skinks'),
    ('Common snake-eye', 'Morethia boulengeri', 'Reptile - Skinks. Category: Exempt', 'U02526', 'Exempt', 'Reptile', 'Skinks'),
    ('Copper-tailed skink', 'Ctenotus taeniolatus', 'Reptile - Skinks. Category: Basic', 'E02386', 'Basic', 'Reptile', 'Skinks'),
    ('Cunningham''s skink', 'Egernia cunninghami', 'Reptile - Skinks. Category: Basic', 'Y02408', 'Basic', 'Reptile', 'Skinks'),
    ('Dampier Land limbless slider', 'Lerista apoda', 'Reptile - Skinks. Category: Basic', 'Q05620', 'Basic', 'Reptile', 'Skinks'),
    ('Dark barsided skink', 'Concinnia martini', 'Reptile - Skinks. Category: Basic', 'W04507', 'Basic', 'Reptile', 'Skinks'),
    ('Delicate skink', 'Lampropholis delicata', 'Reptile - Skinks. Category: Exempt', 'M02450', 'Exempt', 'Reptile', 'Skinks'),
    ('Desert skink', 'Liopholis inornata', 'Reptile - Skinks. Category: Basic', 'C02413', 'Basic', 'Reptile', 'Skinks'),
    ('Dwarf skink', 'Menetia greyii', 'Reptile - Skinks. Category: Exempt', 'W02519', 'Exempt', 'Reptile', 'Skinks'),
    ('Eastern bluetongue', 'Tiliqua scincoides', 'Reptile - Skinks. Category: Exempt', 'Y02580', 'Exempt', 'Reptile', 'Skinks'),
    ('Eastern crevice skink', 'Egernia mcpheei', 'Reptile - Skinks. Category: Basic', 'S04505', 'Basic', 'Reptile', 'Skinks'),
    ('Eastern desert ctenotus', 'Ctenotus regius', 'Reptile - Skinks. Category: Basic', 'U02374', 'Basic', 'Reptile', 'Skinks'),
    ('Eastern striped skink', 'Ctenotus spaldingi', 'Reptile - Skinks. Category: Basic', 'W02375', 'Basic', 'Reptile', 'Skinks'),
    ('Eastern three-lined skink', 'Acritoscincus duperreyi', 'Reptile - Skinks. Category: Basic', 'U02682', 'Basic', 'Reptile', 'Skinks'),
    ('Eastern tree skink', 'Egernia striolata', 'Reptile - Skinks. Category: Exempt', 'S02429', 'Exempt', 'Reptile', 'Skinks'),
    ('Eastern water skink', 'Eulamprus quoyii', 'Reptile - Skinks. Category: Exempt', 'K02557', 'Exempt', 'Reptile', 'Skinks'),
    ('Four-toed earless skink', 'Hemiergis peronii', 'Reptile - Skinks. Category: Exempt', 'U02446', 'Exempt', 'Reptile', 'Skinks'),
    ('Garden skink', 'Lampropholis guichenoti', 'Reptile - Skinks. Category: Exempt', 'Z02451', 'Exempt', 'Reptile', 'Skinks'),
    ('Gidgee skink', 'Egernia stokesii', 'Reptile - Skinks. Category: Basic', 'Z02427', 'Basic', 'Reptile', 'Skinks'),
    ('Goldfields crevice-skink', 'Egernia formosa', 'Reptile - Skinks. Category: Basic', 'M05610', 'Basic', 'Reptile', 'Skinks'),
    ('Hosmer''s skink', 'Egernia hosmeri', 'Reptile - Skinks. Category: Basic', 'A02412', 'Basic', 'Reptile', 'Skinks'),
    ('King''s skink', 'Egernia kingii', 'Reptile - Skinks. Category: Basic', 'E02414', 'Basic', 'Reptile', 'Skinks'),
    ('Land mullet', 'Bellatorias major', 'Reptile - Skinks. Category: Basic', 'K02417', 'Basic', 'Reptile', 'Skinks'),
    ('Lined soil-crevice skink', 'Notoscincus butleri', 'Reptile - Skinks. Category: Basic', 'Z05611', 'Basic', 'Reptile', 'Skinks'),
    ('Mainland she-oak skink', 'Cyclodomorphus michaeli', 'Reptile - Skinks. Category: Basic', 'U04506', 'Basic', 'Reptile', 'Skinks'),
    ('Major skink', 'Bellatorias frerei', 'Reptile - Skinks. Category: Basic', 'W02411', 'Basic', 'Reptile', 'Skinks'),
    ('Mallee snake-eye', 'Morethia obscura', 'Reptile - Skinks. Category: Exempt', 'C02529', 'Exempt', 'Reptile', 'Skinks'),
    ('Murray''s skink', 'Silvascincus murrayi', 'Reptile - Skinks. Category: Basic', 'Q05612', 'Basic', 'Reptile', 'Skinks'),
    ('Myall slider', 'Lerista edwardsae', 'Reptile - Skinks. Category: Exempt', 'G04023', 'Exempt', 'Reptile', 'Skinks'),
    ('Narrow-banded sandswimmer', 'Eremiascincus fasciolatus (revised)', 'Reptile - Skinks. Category: Basic', 'S05621', 'Basic', 'Reptile', 'Skinks'),
    ('Night skink', 'Liopholis striata', 'Reptile - Skinks. Category: Basic', 'Q02428', 'Basic', 'Reptile', 'Skinks'),
    ('Northern bar-lipped skink', 'Eremiascincus isolepis', 'Reptile - Skinks. Category: Basic', 'S05613', 'Basic', 'Reptile', 'Skinks'),
    ('Pink-tongued lizard', 'Cyclodomorphus gerrardii', 'Reptile - Skinks. Category: Basic', 'Y05492', 'Basic', 'Reptile', 'Skinks'),
    ('Pin-striped ctenotus', 'Ctenotus ariadnae', 'Reptile - Skinks. Category: Basic', 'Z02339', 'Basic', 'Reptile', 'Skinks'),
    ('Pygmy spiny-tailed skink', 'Egernia depressa', 'Reptile - Skinks. Category: Basic', 'K02409', 'Basic', 'Reptile', 'Skinks'),
    ('Robust rainbow-skink', 'Carlia schmeltzii', 'Reptile - Skinks. Category: Basic', 'U05614', 'Basic', 'Reptile', 'Skinks'),
    ('Sandhill ctenotus', 'Ctenotus brooksi', 'Reptile - Skinks. Category: Basic', 'G02343', 'Basic', 'Reptile', 'Skinks'),
    ('Sandplain ctenotus', 'Ctenotus schomburgkii', 'Reptile - Skinks. Category: Exempt', 'G02379', 'Exempt', 'Reptile', 'Skinks'),
    ('Sleepy lizard', 'Tiliqua rugosa', 'Reptile - Skinks. Category: Exempt', 'Z02583', 'Exempt', 'Reptile', 'Skinks'),
    ('Southern four-toed slider', 'Lerista dorsalis', 'Reptile - Skinks. Category: Basic', 'E02482', 'Basic', 'Reptile', 'Skinks'),
    ('Southern robust slider', 'Lerista picturata', 'Reptile - Skinks. Category: Exempt', 'Q02496', 'Exempt', 'Reptile', 'Skinks'),
    ('Southern three-toed slider', 'Lerista terdigitata', 'Reptile - Skinks. Category: Basic', 'E02502', 'Basic', 'Reptile', 'Skinks'),
    ('Southern water skink', 'Eulamprus tympanum', 'Reptile - Skinks. Category: Basic', 'C02561', 'Basic', 'Reptile', 'Skinks'),
    ('Speckled wall skink', 'Cryptoblepharus pannosus', 'Reptile - Skinks. Category: Basic', 'Q04328', 'Basic', 'Reptile', 'Skinks'),
    ('Spotted slider', 'Lerista punctatovittata', 'Reptile - Skinks. Category: Exempt', 'W02499', 'Exempt', 'Reptile', 'Skinks'),
    ('Striped wall skink', 'Cryptoblepharus pulcher', 'Reptile - Skinks. Category: Basic', 'W02331', 'Basic', 'Reptile', 'Skinks'),
    ('Taper-tailed west-coast slider', 'Lerista humphriesi', 'Reptile - Skinks. Category: Basic', 'E05618', 'Basic', 'Reptile', 'Skinks'),
    ('Three-toed earless skink', 'Hemiergis decresiensis', 'Reptile - Skinks. Category: Exempt', 'K02441', 'Exempt', 'Reptile', 'Skinks'),
    ('Three-toed skink', 'Saiphos equalis', 'Reptile - Skinks. Category: Basic', 'G05619', 'Basic', 'Reptile', 'Skinks'),
    ('Western bluetongue', 'Tiliqua occipitalis', 'Reptile - Skinks. Category: Basic', 'W02579', 'Basic', 'Reptile', 'Skinks'),
    ('Western earless skink', 'Hemiergis initialis', 'Reptile - Skinks. Category: Basic', 'Z02443', 'Basic', 'Reptile', 'Skinks'),
    ('White''s skink', 'Liopholis whitii', 'Reptile - Skinks. Category: Exempt', 'E02430', 'Exempt', 'Reptile', 'Skinks'),
    
    -- Snakes
    ('Black-headed python', 'Aspidites melanocephalus', 'Reptile - Snakes. Category: Basic', 'Q02612', 'Basic', 'Reptile', 'Snakes'),
    ('Brown tree snake', 'Boiga irregularis', 'Reptile - Snakes. Category: Basic', 'U02630', 'Basic', 'Reptile', 'Snakes'),
    ('Carpet python', 'Morelia spilota', 'Reptile - Snakes. Category: Basic', 'C02625', 'Basic', 'Reptile', 'Snakes'),
    ('Centralian carpet python', 'Morelia bredli', 'Reptile - Snakes. Category: Basic', 'W05607', 'Basic', 'Reptile', 'Snakes'),
    ('Childrens python', 'Antaresia childreni', 'Reptile - Snakes. Category: Basic', 'M05582', 'Basic', 'Reptile', 'Snakes'),
    ('Common (green) tree snake', 'Dendrelaphis punctulatus', 'Reptile - Snakes. Category: Basic', 'C02633', 'Basic', 'Reptile', 'Snakes'),
    ('Keelback snake', 'Tropidonophis mairii', 'Reptile - Snakes. Category: Basic', 'K02629', 'Basic', 'Reptile', 'Snakes'),
    ('Northern tree snake', 'Dendrelaphis calligastra', 'Reptile - Snakes. Category: Basic', 'A02632', 'Basic', 'Reptile', 'Snakes'),
    ('Olive python', 'Liasis olivaceus', 'Reptile - Snakes. Category: Basic', 'S02621', 'Basic', 'Reptile', 'Snakes'),
    ('Rough-scaled python', 'Morelia carinata', 'Reptile - Snakes. Category: Basic', 'A05608', 'Basic', 'Reptile', 'Snakes'),
    ('Slaty-grey snake', 'Stegonotus cucullatus', 'Reptile - Snakes. Category: Basic', 'M02638', 'Basic', 'Reptile', 'Snakes'),
    ('Spotted python', 'Antaresia maculosa', 'Reptile - Snakes. Category: Basic', 'C05609', 'Basic', 'Reptile', 'Snakes'),
    ('Stimson''s python', 'Antaresia stimsoni', 'Reptile - Snakes. Category: Basic', 'G02619', 'Basic', 'Reptile', 'Snakes'),
    ('Water python', 'Liasis fuscus', 'Reptile - Snakes. Category: Basic', 'Q02620', 'Basic', 'Reptile', 'Snakes'),
    ('Woma', 'Aspidites ramsayi', 'Reptile - Snakes. Category: Basic', 'S02613', 'Basic', 'Reptile', 'Snakes'),
    
    -- Turtles and tortoises
    ('Broadshelled tortoise', 'Chelodina expansa', 'Reptile - Turtles and tortoises. Category: Basic', 'A02016', 'Basic', 'Reptile', 'Turtles and tortoises'),
    ('Eastern long-necked tortoise', 'Chelodina longicollis', 'Reptile - Turtles and tortoises. Category: Exempt', 'C02017', 'Exempt', 'Reptile', 'Turtles and tortoises'),
    ('Jardine River turtle', 'Emydura subglobosa', 'Reptile - Turtles and tortoises. Category: Basic', 'S05585', 'Basic', 'Reptile', 'Turtles and tortoises'),
    ('Krefft''s River turtle', 'Emydura macquarii krefftii', 'Reptile - Turtles and tortoises. Category: Basic', 'C02033', 'Basic', 'Reptile', 'Turtles and tortoises'),
    ('Macquarie River turtle', 'Emydura macquarii macquarii', 'Reptile - Turtles and tortoises. Category: Exempt', 'W05579', 'Exempt', 'Reptile', 'Turtles and tortoises'),
    ('Northern snake-necked turtle', 'Chelodina oblonga', 'Reptile - Turtles and tortoises. Category: Basic', 'Q02020', 'Basic', 'Reptile', 'Turtles and tortoises'),
    ('Northern snapping turtle', 'Elseya dentata', 'Reptile - Turtles and tortoises. Category: Basic', 'Y02028', 'Basic', 'Reptile', 'Turtles and tortoises'),
    ('Northern yellow-faced turtle', 'Emydura tanybaraga', 'Reptile - Turtles and tortoises. Category: Basic', 'Q05584', 'Basic', 'Reptile', 'Turtles and tortoises'),
    ('North-west red-faced turtle', 'Emydura victoriae', 'Reptile - Turtles and tortoises. Category: Basic', 'Y05580', 'Basic', 'Reptile', 'Turtles and tortoises'),
    ('Oblong turtle', 'Chelodina colliei', 'Reptile - Turtles and tortoises. Category: Basic', 'G02019', 'Basic', 'Reptile', 'Turtles and tortoises'),
    ('Saw-shelled turtle', 'Wollumbinia latisternum', 'Reptile - Turtles and tortoises. Category: Basic', 'K02029', 'Basic', 'Reptile', 'Turtles and tortoises'),
    
    -- BIRDS
    -- Cockatoos and parrots
    ('Adelaide rosellas', 'Platycercus elegans (fleurieuensis & subadelaidae)', 'Bird - Cockatoos and parrots. Category: Basic', 'G00283', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Australian king-parrot', 'Alisterus scapularis', 'Bird - Cockatoos and parrots. Category: Basic', 'C00281', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Blue-cheeked rosella', 'Platycercus adscitus adscitus', 'Bird - Cockatoos and parrots. Category: Exempt', 'A21024', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Blue-winged parrot', 'Neophema chrysostoma', 'Bird - Cockatoos and parrots. Category: Exempt', 'M00306', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Bourke''s parrot', 'Neopsephotus bourkii', 'Bird - Cockatoos and parrots. Category: Exempt', 'Y00304', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Budgerygah', 'Melopsittacus undulatus', 'Bird - Cockatoos and parrots. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Cockatoos and parrots'),
    ('Cloncurry', 'Barnardius zonarius macgillivrayi', 'Bird - Cockatoos and parrots. Category: Basic', 'W21031', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Cockatiel', 'Nymphicus hollandicus', 'Bird - Cockatoos and parrots. Category: Exempt', 'E00274', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Crimson rosella', 'Platycercus elegans (elegans & melanopterus)', 'Bird - Cockatoos and parrots. Category: Basic', 'A15072', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Eastern rosella', 'Platycercus eximius', 'Bird - Cockatoos and parrots. Category: Exempt', 'S04177', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Eclectus parrot', 'Eclectus roratus macgillivrayi', 'Bird - Cockatoos and parrots. Category: Basic', 'C21033', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Elegant parrot', 'Neophema elegans', 'Bird - Cockatoos and parrots. Category: Exempt', 'Z00307', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Galah', 'Cacatua roseicapilla', 'Bird - Cockatoos and parrots. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Cockatoos and parrots'),
    ('Golden-shouldered parrot', 'Psephotus chrysopterygius', 'Bird - Cockatoos and parrots. Category: Basic', 'A00300', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Green rosella', 'Platycercus caledonicus', 'Bird - Cockatoos and parrots. Category: Basic', 'K00285', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Hooded parrot', 'Psephotus dissimilis', 'Bird - Cockatoos and parrots. Category: Exempt', 'C00301', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Kimberley northern rosella', 'Platycercus venustus hilli', 'Bird - Cockatoos and parrots. Category: Exempt', 'Q05488', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Little corella', 'Cacatua sanguinea', 'Bird - Cockatoos and parrots. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Cockatoos and parrots'),
    ('Little lorikeet', 'Parvipsitta pusilla', 'Bird - Cockatoos and parrots. Category: Basic', 'Q00260', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Long-billed corella', 'Cacatua tenuirostris', 'Bird - Cockatoos and parrots. Category: Exempt', 'A00272', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Major Mitchell''s cockatoo', 'Lophochroa leadbeateri', 'Bird - Cockatoos and parrots. Category: Basic', 'U00270', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Mallee ringneck', 'Barnardius zonarius barnardi', 'Bird - Cockatoos and parrots. Category: Basic', 'U21030', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Mulga parrot', 'Psephotellus varius', 'Bird - Cockatoos and parrots. Category: Basic', 'Q00296', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Musk lorikeet', 'Glossopsitta concinna', 'Bird - Cockatoos and parrots. Category: Exempt', 'E00258', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Northern rosella (Brown''s rosella)', 'Platycercus venustus', 'Bird - Cockatoos and parrots. Category: Exempt', 'Z00287', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Pale-headed rosella', 'Platycercus adscitus', 'Bird - Cockatoos and parrots. Category: Exempt', 'M00286', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Port Lincoln parrot', 'Barnardius zonarius zonarius', 'Bird - Cockatoos and parrots. Category: Basic', 'S05489', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Princess parrot', 'Polytelis alexandrae', 'Bird - Cockatoos and parrots. Category: Exempt', 'Z00279', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Purple-crowned lorikeet', 'Parvipsitta porphyrocephala', 'Bird - Cockatoos and parrots. Category: Basic', 'G00259', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Rainbow lorikeet', 'Trichoglossus haematodus', 'Bird - Cockatoos and parrots. Category: Exempt', 'U00254', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Red-capped parrot', 'Purpureicephalus spurius', 'Bird - Cockatoos and parrots. Category: Basic', 'E00290', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Red-collared lorikeet', 'Trichoglossus haematodus rubritorquis', 'Bird - Cockatoos and parrots. Category: Exempt', 'W00255', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Red-rumped parrot', 'Psephotus haematonotus', 'Bird - Cockatoos and parrots. Category: Exempt', 'Z00295', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Red-vented blue bonnet', 'Northiella haematogaster haematorrhous', 'Bird - Cockatoos and parrots. Category: Basic', 'M08002', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Red-winged parrot', 'Aprosmictus erythropterus', 'Bird - Cockatoos and parrots. Category: Basic', 'M04246', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Regent parrot (eastern subspecies)', 'Polytelis anthopeplus monarchoides', 'Bird - Cockatoos and parrots. Category: Basic', 'C04381', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Regent parrot (WA subspecies)', 'Polytelis anthopeplus anthopeplus', 'Bird - Cockatoos and parrots. Category: Basic', 'E05490', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Rock parrot', 'Neophema petrophila', 'Bird - Cockatoos and parrots. Category: Basic', 'Q00308', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Scaly-breasted lorikeet', 'Trichoglossus chlorolepidotus', 'Bird - Cockatoos and parrots. Category: Exempt', 'A00256', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Scarlet-chested parrot', 'Neophema splendida', 'Bird - Cockatoos and parrots. Category: Exempt', 'G00303', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Sulphur-crested cockatoo', 'Cacatua galerita', 'Bird - Cockatoos and parrots. Category: Exempt', 'Q04176', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Superb parrot', 'Polytelis swainsonii', 'Bird - Cockatoos and parrots. Category: Basic', 'K00277', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Turquoise parrot', 'Neophema pulchella', 'Bird - Cockatoos and parrots. Category: Exempt', 'E00302', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Twenty-eight parrot', 'Barnardius zonarius semitorquatus', 'Bird - Cockatoos and parrots. Category: Exempt', 'K00293', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Varied lorikeet', 'Psitteuteles versicolor', 'Bird - Cockatoos and parrots. Category: Basic', 'C00257', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Western corella', 'Cacatua pastinator', 'Bird - Cockatoos and parrots. Category: Exempt', 'G05503', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Western rosella', 'Platycercus icterotis', 'Bird - Cockatoos and parrots. Category: Exempt', 'S00289', 'Exempt', 'Bird', 'Cockatoos and parrots'),
    ('Yellow rosella', 'Platycercus elegans flaveolus', 'Bird - Cockatoos and parrots. Category: Basic', 'Y00284', 'Basic', 'Bird', 'Cockatoos and parrots'),
    ('Yellow-vented blue bonnet', 'Northiella haematogaster haematogaster', 'Bird - Cockatoos and parrots. Category: Basic', 'A21032', 'Basic', 'Bird', 'Cockatoos and parrots'),
    
    -- Crows
    ('Australian crow', 'Corvus orru cecilae', 'Bird - Crows. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Crows'),
    ('Australian raven', 'Corvus coronoides', 'Bird - Crows. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Crows'),
    ('Little crow', 'Corvus bennetti', 'Bird - Crows. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Crows'),
    ('Little raven', 'Corvus mellori', 'Bird - Crows. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Crows'),
    
    -- Cuckooshrike
    ('Black-faced cuckooshrike', 'Coracina novaehollandiae', 'Bird - Cuckooshrike. Category: Basic', 'Y04120', 'Basic', 'Bird', 'Cuckooshrike'),
    
    -- Ducks, geese and swans
    ('Australasian shoveler (Blue-winged)', 'Anas rhynchotis', 'Bird - Ducks, geese and swans. Category: Basic', 'M04182', 'Basic', 'Bird', 'Ducks, geese and swans'),
    ('Australian shelduck', 'Tadorna tadornoides', 'Bird - Ducks, geese and swans. Category: Basic', 'G00207', 'Basic', 'Bird', 'Ducks, geese and swans'),
    ('Black swan', 'Cygnus atratus', 'Bird - Ducks, geese and swans. Category: Basic', 'W00203', 'Basic', 'Bird', 'Ducks, geese and swans'),
    ('Cape Barren goose', 'Cereopsis novaehollandiae novaehollandiae', 'Bird - Ducks, geese and swans. Category: Basic', 'M00198', 'Basic', 'Bird', 'Ducks, geese and swans'),
    ('Chestnut teal', 'Anas castanea', 'Bird - Ducks, geese and swans. Category: Exempt', 'U00210', 'Exempt', 'Bird', 'Ducks, geese and swans'),
    ('Grey teal (Australasian teal)', 'Anas gracilis', 'Bird - Ducks, geese and swans. Category: Basic', 'Y04148', 'Basic', 'Bird', 'Ducks, geese and swans'),
    ('Hardhead (White-eyed duck)', 'Aythya australis', 'Bird - Ducks, geese and swans. Category: Basic', 'G00215', 'Basic', 'Bird', 'Ducks, geese and swans'),
    ('Magpie goose', 'Anseranas semipalmata', 'Bird - Ducks, geese and swans. Category: Basic', 'Z00199', 'Basic', 'Bird', 'Ducks, geese and swans'),
    ('Maned duck (Australian wood duck)', 'Chenonetta jubata', 'Bird - Ducks, geese and swans. Category: Exempt', 'U00202', 'Exempt', 'Bird', 'Ducks, geese and swans'),
    ('Pacific black duck', 'Anas superciliosa', 'Bird - Ducks, geese and swans. Category: Exempt', 'E04146', 'Exempt', 'Bird', 'Ducks, geese and swans'),
    ('Plumed whistling duck', 'Dendrocygna eytoni', 'Bird - Ducks, geese and swans. Category: Exempt', 'C00205', 'Exempt', 'Bird', 'Ducks, geese and swans'),
    ('Raja shelduck', 'Tadorna radjah', 'Bird - Ducks, geese and swans. Category: Basic', 'E00206', 'Basic', 'Bird', 'Ducks, geese and swans'),
    ('Wandering whistling duck', 'Dendrocygna arcuata', 'Bird - Ducks, geese and swans. Category: Basic', 'A00204', 'Basic', 'Bird', 'Ducks, geese and swans'),
    
    -- Dotterel and stilt
    ('Inland dotterel', 'Peltohyas australis', 'Bird - Dotterel and stilt. Category: Basic', 'K00145', 'Basic', 'Bird', 'Dotterel and stilt'),
    ('White-headed (black-winged) stilt', 'Himantopus leucocephalus', 'Bird - Dotterel and stilt. Category: Basic', 'M00146', 'Basic', 'Bird', 'Dotterel and stilt'),
    
    -- Emu
    ('Emu', 'Dromaius novaehollandiae', 'Bird - Emu. Category: Basic', 'C00001', 'Basic', 'Bird', 'Emu'),
    
    -- Fairywrens
    ('Black-backed fairywren', 'Malurus splendens melanotis', 'Bird - Fairywrens. Category: Basic', 'E00530', 'Basic', 'Bird', 'Fairywrens'),
    ('Red-backed fairywren', 'Malurus melanocephalus', 'Bird - Fairywrens. Category: Basic', 'K00541', 'Basic', 'Bird', 'Fairywrens'),
    ('Splendid fairywren', 'Malurus splendens splendens', 'Bird - Fairywrens. Category: Basic', 'E21034', 'Basic', 'Bird', 'Fairywrens'),
    ('Superb fairywren', 'Malurus cyaneus', 'Bird - Fairywrens. Category: Basic', 'S00529', 'Basic', 'Bird', 'Fairywrens'),
    ('Turquoise fairywren', 'Malurus splendens callainus', 'Bird - Fairywrens. Category: Basic', 'G05491', 'Basic', 'Bird', 'Fairywrens'),
    ('Variegated fairywren', 'Malurus lamberti', 'Bird - Fairywrens. Category: Basic', 'Q00536', 'Basic', 'Bird', 'Fairywrens'),
    ('White-winged fairywren', 'Malurus leucopterus', 'Bird - Fairywrens. Category: Basic', 'Z00535', 'Basic', 'Bird', 'Fairywrens'),
    
    -- Frogmouth
    ('Tawny frogmouth', 'Podargus strigoides', 'Bird - Frogmouth. Category: Basic', 'K00313', 'Basic', 'Bird', 'Frogmouth'),
    
    -- Finches
    ('Black-throated finch (Diggles)', 'Poephila cincta atropygialis', 'Bird - Finches. Category: Exempt', 'Y05504', 'Exempt', 'Bird', 'Finches'),
    ('Black-throated finch (Parson)', 'Poephila cincta cincta', 'Bird - Finches. Category: Exempt', 'C21025', 'Exempt', 'Bird', 'Finches'),
    ('Chestnut-breasted mannikin', 'Lonchura castaneothorax', 'Bird - Finches. Category: Exempt', 'K00657', 'Exempt', 'Bird', 'Finches'),
    ('Crimson finch (Common)', 'Neochmia phaeton phaeton', 'Bird - Finches. Category: Exempt', 'E21018', 'Exempt', 'Bird', 'Finches'),
    ('Crimson finch (white-bellied subspecies)', 'Neochmia phaeton evangelinae', 'Bird - Finches. Category: Basic', 'G21019', 'Basic', 'Bird', 'Finches'),
    ('Diamond Firetail', 'Stagonopleura guttata', 'Bird - Finches. Category: Basic', 'A00652', 'Basic', 'Bird', 'Finches'),
    ('Double-barred finch (Black rump)', 'Stizoptera bichenovii annulosa', 'Bird - Finches. Category: Exempt', 'G21027', 'Exempt', 'Bird', 'Finches'),
    ('Double-barred finch (White rump)', 'Stizoptera bichenovii bichenovii', 'Bird - Finches. Category: Exempt', 'Y21028', 'Exempt', 'Bird', 'Finches'),
    ('Gouldian finch', 'Erythrura gouldiae', 'Bird - Finches. Category: Exempt', 'E00670', 'Exempt', 'Bird', 'Finches'),
    ('Long-tailed finch (Hecks)', 'Poephila acuticauda hecki', 'Bird - Finches. Category: Exempt', 'K05505', 'Exempt', 'Bird', 'Finches'),
    ('Long-tailed finch (Longtail)', 'Poephila acuticauda acuticauda', 'Bird - Finches. Category: Exempt', 'E21026', 'Exempt', 'Bird', 'Finches'),
    ('Masked finch (Masked)', 'Poephila personata personata', 'Bird - Finches. Category: Exempt', 'A21016', 'Exempt', 'Bird', 'Finches'),
    ('Masked finch (White-eared)', 'Poephila personata leucotis', 'Bird - Finches. Category: Exempt', 'C21017', 'Exempt', 'Bird', 'Finches'),
    ('Painted finch', 'Emblema pictum', 'Bird - Finches. Category: Exempt', 'E00654', 'Exempt', 'Bird', 'Finches'),
    ('Pictorella mannikin', 'Heteromunia pectoralis', 'Bird - Finches. Category: Exempt', 'Z00659', 'Exempt', 'Bird', 'Finches'),
    ('Plum-headed finch', 'Neochmia modesta', 'Bird - Finches. Category: Exempt', 'Q04512', 'Exempt', 'Bird', 'Finches'),
    ('Red-browed finch', 'Neochmia temporalis', 'Bird - Finches. Category: Basic', 'G04075', 'Basic', 'Bird', 'Finches'),
    ('Red-eared firetail', 'Stagonopleura oculata', 'Bird - Finches. Category: Basic', 'W00651', 'Basic', 'Bird', 'Finches'),
    ('Star finch', 'Neochmia ruficauda', 'Bird - Finches. Category: Exempt', 'G00663', 'Exempt', 'Bird', 'Finches'),
    ('Yellow-rumped mannikin', 'Lonchura flaviprymna', 'Bird - Finches. Category: Exempt', 'M00658', 'Exempt', 'Bird', 'Finches'),
    ('Zebra finch', 'Poephila guttata', 'Bird - Finches. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Finches'),
    
    -- Honeyeaters and chats
    ('Blue-faced honeyeater', 'Entomyzon cyanotis', 'Bird - Honeyeaters and chats. Category: Basic', 'Y04200', 'Basic', 'Bird', 'Honeyeaters and chats'),
    ('Crescent honeyeater', 'Phylidonyris pyrrhopterus', 'Bird - Honeyeaters and chats. Category: Basic', 'M00630', 'Basic', 'Bird', 'Honeyeaters and chats'),
    ('Crimson chat', 'Epthianura tricolor', 'Bird - Honeyeaters and chats. Category: Basic', 'S00449', 'Basic', 'Bird', 'Honeyeaters and chats'),
    ('Little wattlebird', 'Anthochaera chrysoptera', 'Bird - Honeyeaters and chats. Category: Exempt', 'G04163', 'Exempt', 'Bird', 'Honeyeaters and chats'),
    ('New Holland honeyeater', 'Phylidonyris novaehollandiae', 'Bird - Honeyeaters and chats. Category: Exempt', 'U04126', 'Exempt', 'Bird', 'Honeyeaters and chats'),
    ('Noisy miner', 'Manorina melanocephala', 'Bird - Honeyeaters and chats. Category: Exempt', 'U00634', 'Exempt', 'Bird', 'Honeyeaters and chats'),
    ('Orange chat', 'Epthianura aurifrons', 'Bird - Honeyeaters and chats. Category: Basic', 'E00450', 'Basic', 'Bird', 'Honeyeaters and chats'),
    ('Pied honeyeater', 'Certhionyx variegatus', 'Bird - Honeyeaters and chats. Category: Basic', 'E00602', 'Basic', 'Bird', 'Honeyeaters and chats'),
    ('Red wattlebird', 'Anthochaera carunculata', 'Bird - Honeyeaters and chats. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'Honeyeaters and chats'),
    ('Scarlet honeyeater', 'Myzomela sanguinolenta', 'Bird - Honeyeaters and chats. Category: Basic', 'M00586', 'Basic', 'Bird', 'Honeyeaters and chats'),
    ('White-fronted chat', 'Epthianura albifrons', 'Bird - Honeyeaters and chats. Category: Basic', 'Z04131', 'Basic', 'Bird', 'Honeyeaters and chats'),
    ('White-fronted honeyeater', 'Purnella albifrons', 'Bird - Honeyeaters and chats. Category: Basic', 'M00594', 'Basic', 'Bird', 'Honeyeaters and chats'),
    ('White-plumed honeyeater', 'Ptilotula penicillata', 'Bird - Honeyeaters and chats. Category: Exempt', 'S00625', 'Exempt', 'Bird', 'Honeyeaters and chats'),
    
    -- Kookaburras
    ('Blue-winged kookaburra', 'Dacelo leachii', 'Bird - Kookaburras. Category: Basic', 'Z00323', 'Basic', 'Bird', 'Kookaburras'),
    ('Laughing kookaburra', 'Dacelo novaeguineae', 'Bird - Kookaburras. Category: Basic', 'S04169', 'Basic', 'Bird', 'Kookaburras'),
    
    -- Magpie
    ('Australian Magpie', 'Gymnorhina tibicen', 'Bird - Magpie. Category: Exempt', 'S00705', 'Exempt', 'Bird', 'Magpie'),
    
    -- Magpielark
    ('Magpielark', 'Grallina cyanoleuca', 'Bird - Magpielark. Category: Exempt', 'W00415', 'Exempt', 'Bird', 'Magpielark'),
    
    -- Nativehens
    ('Black-tailed nativehen', 'Tribonyx ventralis', 'Bird - Nativehens. Category: Basic', 'G00055', 'Basic', 'Bird', 'Nativehens'),
    ('Dusky moorhen', 'Gallinula tenebrosa', 'Bird - Nativehens. Category: Basic', 'C04145', 'Basic', 'Bird', 'Nativehens'),
    ('Tasmanian nativehen', 'Tribonyx mortierii', 'Bird - Nativehens. Category: Basic', 'E04250', 'Basic', 'Bird', 'Nativehens'),
    
    -- Owl
    ('Southern boobook', 'Ninox boobook', 'Bird - Owl. Category: Basic', 'M00242', 'Basic', 'Bird', 'Owl'),
    
    -- Pigeons and doves
    ('Bar-shouldered dove', 'Geopelia humeralis', 'Bird - Pigeons and doves. Category: Exempt', 'Q00032', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Brown cuckoo-dove', 'Macropygia amboinensis', 'Bird - Pigeons and doves. Category: Basic', 'C00029', 'Basic', 'Bird', 'Pigeons and doves'),
    ('Brush bronzewing', 'Phaps elegans', 'Bird - Pigeons and doves. Category: Exempt', 'U04142', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Common bronzewing', 'Phaps chalcoptera', 'Bird - Pigeons and doves. Category: Exempt', 'U00034', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Crested pigeon', 'Ocyphaps lophotes', 'Bird - Pigeons and doves. Category: Exempt', 'W00043', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Diamond dove', 'Geopelia cuneata', 'Bird - Pigeons and doves. Category: Exempt', 'Z00031', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Emerald dove', 'Chalcophaps indica', 'Bird - Pigeons and doves. Category: Exempt', 'S00033', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Flock bronzewing', 'Phaps histrionica', 'Bird - Pigeons and doves. Category: Exempt', 'A00036', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Partridge pigeon', 'Geophaps smithii', 'Bird - Pigeons and doves. Category: Basic', 'Q00040', 'Basic', 'Bird', 'Pigeons and doves'),
    ('Peaceful dove', 'Geopelia placida', 'Bird - Pigeons and doves. Category: Exempt', 'Q04168', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Rose-crowned fruit-dove', 'Ptilinopus regina', 'Bird - Pigeons and doves. Category: Basic', 'K00021', 'Basic', 'Bird', 'Pigeons and doves'),
    ('Spinifex pigeon', 'Geophaps plumifera', 'Bird - Pigeons and doves. Category: Exempt', 'U00042', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Spinifex pigeon (red fronted)', 'Geophaps plumifera ferruginea', 'Bird - Pigeons and doves. Category: Exempt', 'K21029', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Squatter pigeon', 'Geophaps scripta', 'Bird - Pigeons and doves. Category: Exempt', 'G00039', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Superb fruit-dove', 'Ptilinopus superbus', 'Bird - Pigeons and doves. Category: Basic', 'Z00023', 'Basic', 'Bird', 'Pigeons and doves'),
    ('Torresian imperial-pigeon', 'Ducula bicolor spilorrhoa', 'Bird - Pigeons and doves. Category: Exempt', 'U00026', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('White-headed pigeon', 'Columba leucomela', 'Bird - Pigeons and doves. Category: Exempt', 'A00028', 'Exempt', 'Bird', 'Pigeons and doves'),
    ('Wonga pigeon', 'Leucosarcia melanoleuca', 'Bird - Pigeons and doves. Category: Exempt', 'A00044', 'Exempt', 'Bird', 'Pigeons and doves'),
    
    -- Plovers and gulls
    ('Banded lapwing', 'Vanellus tricolor', 'Bird - Plovers and gulls. Category: Basic', 'G00135', 'Basic', 'Bird', 'Plovers and gulls'),
    ('Masked lapwing (northern subspecies)', 'Vanellus miles miles', 'Bird - Plovers and gulls. Category: Basic', 'C00133', 'Basic', 'Bird', 'Plovers and gulls'),
    ('Silver gull', 'Chroicocephalus novaehollandiae', 'Bird - Plovers and gulls. Category: Exempt', 'C04065', 'Exempt', 'Bird', 'Plovers and gulls'),
    ('Spur-winged plover', 'Vanellus miles novaehollandiae', 'Bird - Plovers and gulls. Category: Basic', 'W09343', 'Basic', 'Bird', 'Plovers and gulls'),
    
    -- Quails
    ('Black-breasted buttonquail', 'Turnix melanogaster', 'Bird - Quails. Category: Exempt', 'S00017', 'Exempt', 'Bird', 'Quails'),
    ('Brown quail (Swamp partridge)', 'Coturnix ypsilophora ypsilophora', 'Bird - Quails. Category: Exempt', 'W21015', 'Exempt', 'Bird', 'Quails'),
    ('Brown quail (Swamp quail)', 'Coturnix ypsilophora australis', 'Bird - Quails. Category: Exempt', 'Y09304', 'Exempt', 'Bird', 'Quails'),
    ('King quail', 'Excalfactoria chinensis', 'Bird - Quails. Category: Exempt', 'Y00012', 'Exempt', 'Bird', 'Quails'),
    ('Little buttonquail', 'Turnix velox', 'Bird - Quails. Category: Exempt', 'U00018', 'Exempt', 'Bird', 'Quails'),
    ('Painted buttonquail', 'Turnix varius', 'Bird - Quails. Category: Exempt', 'U04178', 'Exempt', 'Bird', 'Quails'),
    ('Red-backed buttonquail', 'Turnix maculosus', 'Bird - Quails. Category: Basic', 'K00013', 'Basic', 'Bird', 'Quails'),
    ('Red-chested buttonquail', 'Turnix pyrrhothorax', 'Bird - Quails. Category: Basic', 'W00019', 'Basic', 'Bird', 'Quails'),
    ('Stubble quail', 'Coturnix pectoralis', 'Bird - Quails. Category: Exempt', 'A04240', 'Exempt', 'Bird', 'Quails'),
    
    -- Robins
    ('Eastern yellow robin', 'Eopsaltria australis', 'Bird - Robins. Category: Basic', 'Q00392', 'Basic', 'Bird', 'Robins'),
    ('Hooded robin', 'Melanodryas cucullata', 'Bird - Robins. Category: Basic', 'S00385', 'Basic', 'Bird', 'Robins'),
    ('Red-capped robin', 'Petroica goodenovii', 'Bird - Robins. Category: Basic', 'K00381', 'Basic', 'Bird', 'Robins'),
    
    -- Stonecurlew
    ('Bush stonecurlew', 'Burhinus grallarius', 'Bird - Stonecurlew. Category: Basic', 'U00174', 'Basic', 'Bird', 'Stonecurlew'),
    
    -- White-eye
    ('Grey-backed silvereye', 'Zosterops lateralis halmaturina', 'Bird - White-eye. Category: Unprotected', NULL, 'Unprotected', 'Bird', 'White-eye'),
    
    -- Woodswallows
    ('Dusky woodswallow', 'Artamus cyanopterus', 'Bird - Woodswallows. Category: Basic', 'W00547', 'Basic', 'Bird', 'Woodswallows'),
    ('Masked woodswallow', 'Artamus personatus', 'Bird - Woodswallows. Category: Basic', 'Q00544', 'Basic', 'Bird', 'Woodswallows'),
    ('White-breasted woodswallow', 'Artamus leucorhynchus', 'Bird - Woodswallows. Category: Basic', 'Z00543', 'Basic', 'Bird', 'Woodswallows'),
    ('White-browed woodswallow', 'Artamus superciliosus', 'Bird - Woodswallows. Category: Basic', 'S00545', 'Basic', 'Bird', 'Woodswallows')
ON CONFLICT (name, scientific_name) DO NOTHING;

-- The rest of the file contains the same trigger functions and procedures as before
-- Create a function to seed species for a new organization
CREATE OR REPLACE FUNCTION seed_organization_species() RETURNS TRIGGER AS $$
DECLARE
    template_species RECORD;
    new_species_id TEXT;
    first_user_id TEXT;
BEGIN
    -- Get the first user in the organization to use as creator
    SELECT "clerkUserId" INTO first_user_id 
    FROM carers 
    WHERE "clerkOrganizationId" = NEW.id 
    LIMIT 1;
    
    IF first_user_id IS NULL THEN
        SELECT "clerkUserId" INTO first_user_id 
        FROM animals 
        WHERE "clerkOrganizationId" = NEW.id 
        LIMIT 1;
    END IF;
    
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
            "scientificName", 
            description,
            "careRequirements",
            "clerkUserId", 
            "clerkOrganizationId",
            "createdAt",
            "updatedAt"
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

-- Create triggers on animals and carers tables to seed species on first record
CREATE OR REPLACE FUNCTION seed_species_on_first_record() RETURNS TRIGGER AS $$
DECLARE
    species_count INTEGER;
    template_species RECORD;
    new_species_id TEXT;
BEGIN
    -- Check if this organization already has species
    SELECT COUNT(*) INTO species_count 
    FROM species 
    WHERE "clerkOrganizationId" = NEW."clerkOrganizationId";
    
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
            new_species_id := NEW."clerkOrganizationId" || '-species-' || LOWER(REGEXP_REPLACE(template_species.name, '[^a-zA-Z0-9]', '-', 'g'));
            
            -- Insert the species
            INSERT INTO species (
                id, 
                name, 
                "scientificName", 
                description,
                "careRequirements",
                "clerkUserId", 
                "clerkOrganizationId",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                new_species_id,
                template_species.name,
                template_species.scientific_name,
                template_species.description,
                template_species.care_requirements,
                NEW."clerkUserId",
                NEW."clerkOrganizationId",
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
        SELECT DISTINCT "clerkOrganizationId", "clerkUserId" 
        FROM (
            SELECT "clerkOrganizationId", "clerkUserId" FROM animals
            UNION
            SELECT "clerkOrganizationId", "clerkUserId" FROM carers
        ) AS orgs
    LOOP
        -- Check if this org already has species
        SELECT COUNT(*) INTO species_count 
        FROM species 
        WHERE "clerkOrganizationId" = org."clerkOrganizationId";
        
        -- Only seed if no species exist
        IF species_count = 0 THEN
            -- Seed all template species for this organization
            FOR template_species IN 
                SELECT * FROM default_species_template
            LOOP
                new_species_id := org."clerkOrganizationId" || '-species-' || LOWER(REGEXP_REPLACE(template_species.name, '[^a-zA-Z0-9]', '-', 'g'));
                
                INSERT INTO species (
                    id, 
                    name, 
                    "scientificName", 
                    description,
                    "careRequirements",
                    "clerkUserId", 
                    "clerkOrganizationId",
                    "createdAt",
                    "updatedAt"
                )
                VALUES (
                    new_species_id,
                    template_species.name,
                    template_species.scientific_name,
                    template_species.description,
                    template_species.care_requirements,
                    org."clerkUserId",
                    org."clerkOrganizationId",
                    NOW(),
                    NOW()
                )
                ON CONFLICT (id) DO NOTHING;
            END LOOP;
            
            RAISE NOTICE 'Seeded species for organization: %', org."clerkOrganizationId";
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- To seed existing organizations, run:
-- SELECT seed_existing_organizations();