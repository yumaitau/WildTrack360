/**
 * Growth reference data for Australian wildlife species.
 *
 * Sources:
 * - Macropods: Poole WE et al. (1982) "Tables for age determination of the
 *   Kangaroo, Macropus giganteus, from body measurements"; ARAZPA "Birth Date
 *   Determination in Marsupials" growth charts.
 * - Possums: Kerle JA (1984) growth data for Trichosurus vulpecula; How RA
 *   (1983) growth of Pseudocheirus peregrinus.
 * - Flying Foxes: Divljan A (2006) grey-headed flying fox growth; Hall LS &
 *   Richards GC (2000) flying fox biology.
 *
 * Weight is in grams, all lengths in millimetres.
 * Data represents average values for normal healthy growth in rehabilitation.
 * Species names must match prisma/species-seed-data.ts exactly.
 */

export interface GrowthReferenceRow {
  speciesName: string;
  sex: string;
  ageDays: number;
  weightGrams: number | null;
  headLengthMm: number | null;
  earLengthMm: number | null;
  armLengthMm: number | null;
  legLengthMm: number | null;
  footLengthMm: number | null;
  tailLengthMm: number | null;
  bodyLengthMm: number | null;
  wingLengthMm: number | null;
  reference: string;
}

// Helper to generate rows for a species+sex with just weight data
function weightOnly(
  speciesName: string,
  sex: string,
  data: [number, number][],
  reference: string
): GrowthReferenceRow[] {
  return data.map(([ageDays, weightGrams]) => ({
    speciesName,
    sex,
    ageDays,
    weightGrams,
    headLengthMm: null,
    earLengthMm: null,
    armLengthMm: null,
    legLengthMm: null,
    footLengthMm: null,
    tailLengthMm: null,
    bodyLengthMm: null,
    wingLengthMm: null,
    reference,
  }));
}

// Helper for species with weight + foot length (common for macropods)
function weightAndFoot(
  speciesName: string,
  sex: string,
  data: [number, number, number][],
  reference: string
): GrowthReferenceRow[] {
  return data.map(([ageDays, weightGrams, footLengthMm]) => ({
    speciesName,
    sex,
    ageDays,
    weightGrams,
    headLengthMm: null,
    earLengthMm: null,
    armLengthMm: null,
    legLengthMm: null,
    footLengthMm,
    tailLengthMm: null,
    bodyLengthMm: null,
    wingLengthMm: null,
    reference,
  }));
}

// Helper for flying foxes with weight + arm (forearm) length
function weightAndArm(
  speciesName: string,
  sex: string,
  data: [number, number, number][],
  reference: string
): GrowthReferenceRow[] {
  return data.map(([ageDays, weightGrams, armLengthMm]) => ({
    speciesName,
    sex,
    ageDays,
    weightGrams,
    headLengthMm: null,
    earLengthMm: null,
    armLengthMm,
    legLengthMm: null,
    footLengthMm: null,
    tailLengthMm: null,
    bodyLengthMm: null,
    wingLengthMm: null,
    reference,
  }));
}

// ─── Eastern Grey Kangaroo (Macropus giganteus) ─────────────────────────────
// Poole et al. 1982, ARAZPA tables. Age 0 = birth (~0.8g, ~20mm).
// Pouch exit ~300 days. Young-at-foot to ~550 days.
const easternGreyKangarooFemale = weightAndFoot(
  'Eastern Grey Kangaroo',
  'Female',
  [
    // [ageDays, weightGrams, footLengthMm]
    [0, 1, 0],
    [20, 10, 0],
    [40, 22, 0],
    [60, 40, 8],
    [80, 65, 14],
    [100, 100, 22],
    [120, 155, 32],
    [140, 230, 44],
    [160, 340, 58],
    [180, 500, 72],
    [200, 720, 88],
    [210, 860, 96],
    [220, 1020, 104],
    [230, 1200, 113],
    [240, 1400, 122],
    [250, 1620, 131],
    [260, 1870, 140],
    [270, 2140, 150],
    [280, 2440, 160],
    [290, 2760, 170],
    [300, 3100, 180],
    [310, 3450, 190],
    [320, 3800, 199],
    [330, 4150, 208],
    [340, 4500, 216],
    [350, 4850, 224],
    [360, 5200, 231],
    [380, 5850, 244],
    [400, 6500, 255],
    [420, 7100, 264],
    [450, 7900, 276],
    [480, 8600, 285],
    [510, 9200, 292],
    [540, 9700, 297],
  ],
  'Poole et al. 1982 / ARAZPA'
);

const easternGreyKangarooMale = weightAndFoot(
  'Eastern Grey Kangaroo',
  'Male',
  [
    [0, 1, 0],
    [20, 10, 0],
    [40, 23, 0],
    [60, 42, 8],
    [80, 70, 15],
    [100, 110, 23],
    [120, 170, 34],
    [140, 260, 47],
    [160, 380, 62],
    [180, 560, 78],
    [200, 800, 95],
    [210, 960, 104],
    [220, 1140, 113],
    [230, 1350, 122],
    [240, 1580, 132],
    [250, 1840, 142],
    [260, 2130, 152],
    [270, 2450, 163],
    [280, 2800, 174],
    [290, 3180, 185],
    [300, 3580, 196],
    [310, 4000, 207],
    [320, 4430, 217],
    [330, 4880, 227],
    [340, 5340, 236],
    [350, 5800, 245],
    [360, 6280, 253],
    [380, 7200, 268],
    [400, 8100, 281],
    [420, 9000, 292],
    [450, 10200, 306],
    [480, 11400, 317],
    [510, 12500, 326],
    [540, 13500, 333],
  ],
  'Poole et al. 1982 / ARAZPA'
);

// ─── Common Wallaroo (Osphranter robustus) ──────────────────────────────────
// ARAZPA tables. Smaller than Eastern Grey. Pouch exit ~250 days.
const commonWallarooFemale = weightAndFoot(
  'Common Wallaroo',
  'Female',
  [
    [0, 1, 0],
    [30, 12, 0],
    [60, 30, 7],
    [90, 60, 16],
    [120, 110, 28],
    [150, 200, 42],
    [180, 380, 60],
    [200, 550, 72],
    [210, 660, 79],
    [220, 780, 86],
    [230, 920, 93],
    [240, 1080, 101],
    [250, 1260, 109],
    [260, 1460, 117],
    [270, 1670, 125],
    [280, 1890, 133],
    [300, 2350, 148],
    [320, 2820, 162],
    [340, 3280, 174],
    [360, 3700, 184],
    [390, 4250, 196],
    [420, 4700, 205],
    [450, 5050, 212],
  ],
  'ARAZPA'
);

const commonWallarooMale = weightAndFoot(
  'Common Wallaroo',
  'Male',
  [
    [0, 1, 0],
    [30, 13, 0],
    [60, 32, 7],
    [90, 65, 17],
    [120, 120, 30],
    [150, 220, 45],
    [180, 420, 64],
    [200, 620, 77],
    [210, 740, 84],
    [220, 880, 92],
    [230, 1040, 100],
    [240, 1220, 108],
    [250, 1420, 117],
    [260, 1650, 126],
    [270, 1900, 135],
    [280, 2170, 144],
    [300, 2750, 162],
    [320, 3380, 179],
    [340, 4020, 194],
    [360, 4680, 208],
    [390, 5600, 225],
    [420, 6500, 239],
    [450, 7300, 250],
    [480, 8000, 258],
  ],
  'ARAZPA'
);

// ─── Red-necked Wallaby (Macropus rufogriseus) ──────────────────────────────
// ARAZPA. Pouch exit ~270 days. Weaning ~360 days.
const redNeckedWallabyFemale = weightAndFoot(
  'Red-necked wallaby',
  'Female',
  [
    [0, 1, 0],
    [30, 8, 0],
    [60, 20, 6],
    [80, 35, 12],
    [100, 58, 20],
    [120, 92, 30],
    [140, 145, 42],
    [160, 225, 56],
    [180, 340, 70],
    [200, 500, 86],
    [210, 600, 94],
    [220, 710, 102],
    [230, 830, 111],
    [240, 970, 120],
    [250, 1120, 129],
    [260, 1290, 138],
    [270, 1470, 147],
    [280, 1660, 155],
    [300, 2060, 171],
    [320, 2470, 185],
    [340, 2870, 197],
    [360, 3250, 207],
    [390, 3750, 219],
    [420, 4150, 228],
    [450, 4450, 234],
  ],
  'ARAZPA'
);

const redNeckedWallabyMale = weightAndFoot(
  'Red-necked wallaby',
  'Male',
  [
    [0, 1, 0],
    [30, 9, 0],
    [60, 22, 6],
    [80, 38, 13],
    [100, 62, 21],
    [120, 100, 32],
    [140, 160, 45],
    [160, 250, 60],
    [180, 380, 76],
    [200, 560, 93],
    [210, 670, 102],
    [220, 800, 111],
    [230, 950, 120],
    [240, 1120, 130],
    [250, 1310, 140],
    [260, 1520, 150],
    [270, 1750, 160],
    [280, 2000, 170],
    [300, 2530, 189],
    [320, 3090, 206],
    [340, 3660, 221],
    [360, 4220, 234],
    [390, 5000, 250],
    [420, 5700, 262],
    [450, 6300, 271],
  ],
  'ARAZPA'
);

// ─── Swamp Wallaby (Wallabia bicolor) ───────────────────────────────────────
// ARAZPA. Pouch exit ~255 days.
const swampWallabyFemale = weightAndFoot(
  'Swamp wallaby',
  'Female',
  [
    [0, 1, 0],
    [30, 9, 0],
    [60, 22, 6],
    [80, 38, 12],
    [100, 62, 20],
    [120, 98, 30],
    [140, 155, 42],
    [160, 240, 56],
    [180, 370, 71],
    [200, 550, 88],
    [210, 660, 96],
    [220, 790, 105],
    [230, 940, 114],
    [240, 1100, 123],
    [250, 1280, 132],
    [260, 1480, 141],
    [270, 1690, 150],
    [280, 1910, 159],
    [300, 2370, 175],
    [320, 2830, 189],
    [340, 3270, 201],
    [360, 3680, 211],
    [390, 4200, 222],
    [420, 4600, 230],
  ],
  'ARAZPA'
);

const swampWallabyMale = weightAndFoot(
  'Swamp wallaby',
  'Male',
  [
    [0, 1, 0],
    [30, 10, 0],
    [60, 24, 7],
    [80, 42, 13],
    [100, 68, 22],
    [120, 110, 33],
    [140, 175, 46],
    [160, 275, 61],
    [180, 420, 78],
    [200, 630, 96],
    [210, 760, 105],
    [220, 910, 115],
    [230, 1080, 125],
    [240, 1280, 135],
    [250, 1500, 145],
    [260, 1740, 156],
    [270, 2000, 167],
    [280, 2280, 177],
    [300, 2870, 197],
    [320, 3480, 215],
    [340, 4090, 230],
    [360, 4680, 243],
    [390, 5480, 258],
    [420, 6150, 269],
    [450, 6700, 277],
  ],
  'ARAZPA'
);

// ─── Common Brushtail Possum (Trichosurus vulpecula) ────────────────────────
// Kerle 1984. Pouch exit ~150 days, weaning ~210 days.
const brushtailPossumFemale = weightOnly(
  'Common brushtail possum',
  'Female',
  [
    [0, 0.2],
    [14, 2],
    [28, 5],
    [42, 10],
    [56, 18],
    [70, 30],
    [84, 48],
    [98, 72],
    [112, 105],
    [126, 148],
    [140, 200],
    [150, 240],
    [160, 285],
    [170, 340],
    [180, 400],
    [190, 470],
    [200, 545],
    [210, 620],
    [230, 780],
    [250, 940],
    [270, 1080],
    [300, 1280],
    [330, 1450],
    [360, 1580],
  ],
  'Kerle 1984'
);

const brushtailPossumMale = weightOnly(
  'Common brushtail possum',
  'Male',
  [
    [0, 0.2],
    [14, 2],
    [28, 5],
    [42, 11],
    [56, 20],
    [70, 33],
    [84, 52],
    [98, 78],
    [112, 115],
    [126, 160],
    [140, 218],
    [150, 262],
    [160, 312],
    [170, 372],
    [180, 440],
    [190, 520],
    [200, 605],
    [210, 695],
    [230, 880],
    [250, 1070],
    [270, 1250],
    [300, 1520],
    [330, 1760],
    [360, 1950],
  ],
  'Kerle 1984'
);

// ─── Common Ringtail Possum (Pseudocheirus peregrinus) ──────────────────────
// How 1983. Pouch exit ~120 days, weaning ~180 days. Much smaller than brushtail.
const ringtailPossumFemale = weightOnly(
  'Common Ringtail Possum',
  'Female',
  [
    [0, 0.2],
    [14, 1.5],
    [28, 4],
    [42, 8],
    [56, 14],
    [70, 22],
    [84, 34],
    [98, 50],
    [112, 72],
    [120, 86],
    [130, 105],
    [140, 128],
    [150, 155],
    [160, 185],
    [170, 220],
    [180, 258],
    [200, 340],
    [220, 420],
    [240, 490],
    [270, 570],
    [300, 630],
  ],
  'How 1983'
);

const ringtailPossumMale = weightOnly(
  'Common Ringtail Possum',
  'Male',
  [
    [0, 0.2],
    [14, 1.5],
    [28, 4],
    [42, 9],
    [56, 15],
    [70, 24],
    [84, 37],
    [98, 55],
    [112, 78],
    [120, 94],
    [130, 115],
    [140, 140],
    [150, 170],
    [160, 205],
    [170, 245],
    [180, 290],
    [200, 385],
    [220, 480],
    [240, 565],
    [270, 670],
    [300, 740],
  ],
  'How 1983'
);

// ─── Grey-headed Flying Fox (Pteropus poliocephalus) ────────────────────────
// Divljan 2006, Hall & Richards 2000. Birth weight ~25g, forearm ~55mm.
// Weaning ~120 days. Forearm is the primary measurement for age estimation.
const greyHeadedFlyingFoxFemale = weightAndArm(
  'Grey-headed Flying Fox',
  'Female',
  [
    // [ageDays, weightGrams, armLengthMm (forearm)]
    [0, 25, 55],
    [3, 30, 57],
    [7, 38, 60],
    [10, 45, 63],
    [14, 55, 67],
    [17, 63, 70],
    [21, 75, 74],
    [24, 85, 77],
    [28, 98, 81],
    [31, 108, 84],
    [35, 122, 88],
    [38, 133, 91],
    [42, 148, 95],
    [45, 160, 98],
    [49, 175, 102],
    [52, 188, 105],
    [56, 205, 108],
    [60, 220, 112],
    [63, 232, 114],
    [70, 262, 120],
    [77, 290, 126],
    [84, 320, 131],
    [91, 348, 136],
    [98, 375, 140],
    [105, 400, 144],
    [112, 420, 147],
    [120, 440, 150],
    [135, 470, 154],
    [150, 490, 157],
  ],
  'Divljan 2006 / Hall & Richards 2000'
);

const greyHeadedFlyingFoxMale = weightAndArm(
  'Grey-headed Flying Fox',
  'Male',
  [
    [0, 27, 56],
    [3, 32, 58],
    [7, 42, 61],
    [10, 50, 64],
    [14, 62, 68],
    [17, 72, 72],
    [21, 85, 76],
    [24, 96, 79],
    [28, 112, 83],
    [31, 124, 87],
    [35, 140, 91],
    [38, 153, 94],
    [42, 170, 98],
    [45, 185, 102],
    [49, 203, 106],
    [52, 218, 109],
    [56, 238, 113],
    [60, 256, 116],
    [63, 270, 119],
    [70, 305, 125],
    [77, 340, 131],
    [84, 375, 137],
    [91, 408, 142],
    [98, 440, 147],
    [105, 470, 151],
    [112, 498, 155],
    [120, 525, 158],
    [135, 570, 163],
    [150, 600, 166],
  ],
  'Divljan 2006 / Hall & Richards 2000'
);

// ─── Little Red Flying-fox (Pteropus scapulatus) ────────────────────────────
// Smaller than grey-headed. Birth weight ~18g. Weaning ~90-100 days.
const littleRedFlyingFoxFemale = weightAndArm(
  'Little Red Flying-fox',
  'Female',
  [
    [0, 18, 42],
    [3, 22, 44],
    [7, 28, 47],
    [10, 33, 49],
    [14, 40, 52],
    [17, 46, 55],
    [21, 55, 58],
    [24, 62, 61],
    [28, 72, 65],
    [31, 80, 68],
    [35, 90, 71],
    [38, 98, 74],
    [42, 108, 77],
    [45, 116, 80],
    [49, 126, 83],
    [52, 134, 85],
    [56, 144, 88],
    [60, 152, 91],
    [63, 158, 93],
    [70, 174, 97],
    [77, 188, 101],
    [84, 200, 104],
    [91, 210, 107],
    [98, 218, 110],
    [105, 225, 112],
    [120, 235, 116],
  ],
  'Hall & Richards 2000'
);

const littleRedFlyingFoxMale = weightAndArm(
  'Little Red Flying-fox',
  'Male',
  [
    [0, 20, 43],
    [3, 24, 45],
    [7, 30, 48],
    [10, 36, 50],
    [14, 44, 54],
    [17, 50, 57],
    [21, 60, 60],
    [24, 68, 63],
    [28, 78, 67],
    [31, 87, 70],
    [35, 98, 74],
    [38, 107, 76],
    [42, 118, 80],
    [45, 127, 83],
    [49, 138, 86],
    [52, 147, 89],
    [56, 158, 92],
    [60, 168, 94],
    [63, 175, 96],
    [70, 192, 101],
    [77, 208, 105],
    [84, 222, 109],
    [91, 234, 112],
    [98, 244, 115],
    [105, 252, 117],
    [120, 265, 121],
  ],
  'Hall & Richards 2000'
);

export const growthReferenceData: GrowthReferenceRow[] = [
  ...easternGreyKangarooFemale,
  ...easternGreyKangarooMale,
  ...commonWallarooFemale,
  ...commonWallarooMale,
  ...redNeckedWallabyFemale,
  ...redNeckedWallabyMale,
  ...swampWallabyFemale,
  ...swampWallabyMale,
  ...brushtailPossumFemale,
  ...brushtailPossumMale,
  ...ringtailPossumFemale,
  ...ringtailPossumMale,
  ...greyHeadedFlyingFoxFemale,
  ...greyHeadedFlyingFoxMale,
  ...littleRedFlyingFoxFemale,
  ...littleRedFlyingFoxMale,
];
