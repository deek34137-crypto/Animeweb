export interface OverrideFranchiseEntry {
  malId: number;
  title: string;
  type: 'TV' | 'Movie' | 'OVA' | 'Special' | 'ONA';
  releaseYear: number;
  episodes: number;
  relation: string;
}

export interface FranchiseOverride {
  name: string;
  explanation: string;
  recommendedOrder: OverrideFranchiseEntry[];
  releaseOrder: OverrideFranchiseEntry[];
}

export const FRANCHISE_OVERRIDES: Record<string, FranchiseOverride> = {
  // Demon Slayer (Kimetsu no Yaiba) - MAL IDs: 38000, 40356, 47778, 49926, 55701
  '38000': {
    name: 'Demon Slayer (Kimetsu no Yaiba)',
    explanation: 'Demon Slayer is best watched in release order, which matches the chronological story line. Start with Season 1, watch the Mugen Train movie, then proceed with Seasons 2, 3, and 4.',
    recommendedOrder: [
      { malId: 38000, title: 'Demon Slayer: Kimetsu no Yaiba', type: 'TV', releaseYear: 2019, episodes: 26, relation: 'Parent Story' },
      { malId: 40356, title: 'Demon Slayer: Mugen Train Arc (Movie)', type: 'Movie', releaseYear: 2020, episodes: 1, relation: 'Sequel' },
      { malId: 47778, title: 'Demon Slayer: Entertainment District Arc (Season 2)', type: 'TV', releaseYear: 2021, episodes: 11, relation: 'Sequel' },
      { malId: 49926, title: 'Demon Slayer: Swordsmith Village Arc (Season 3)', type: 'TV', releaseYear: 2023, episodes: 11, relation: 'Sequel' },
      { malId: 55701, title: 'Demon Slayer: Hashira Training Arc (Season 4)', type: 'TV', releaseYear: 2024, episodes: 8, relation: 'Sequel' }
    ],
    releaseOrder: [
      { malId: 38000, title: 'Demon Slayer: Kimetsu no Yaiba', type: 'TV', releaseYear: 2019, episodes: 26, relation: 'Parent Story' },
      { malId: 40356, title: 'Demon Slayer: Mugen Train Arc (Movie)', type: 'Movie', releaseYear: 2020, episodes: 1, relation: 'Sequel' },
      { malId: 47778, title: 'Demon Slayer: Entertainment District Arc (Season 2)', type: 'TV', releaseYear: 2021, episodes: 11, relation: 'Sequel' },
      { malId: 49926, title: 'Demon Slayer: Swordsmith Village Arc (Season 3)', type: 'TV', releaseYear: 2023, episodes: 11, relation: 'Sequel' },
      { malId: 55701, title: 'Demon Slayer: Hashira Training Arc (Season 4)', type: 'TV', releaseYear: 2024, episodes: 8, relation: 'Sequel' }
    ]
  },
  // Jujutsu Kaisen - MAL IDs: 40748, 43884, 51009
  '40748': {
    name: 'Jujutsu Kaisen',
    explanation: 'For the best experience, start with the prequel movie JJK 0 to understand Yuta and Geto\'s background, then watch Season 1, and proceed with Season 2 (Hidden Inventory & Shibuya Incident).',
    recommendedOrder: [
      { malId: 43884, title: 'Jujutsu Kaisen 0 (Movie)', type: 'Movie', releaseYear: 2021, episodes: 1, relation: 'Prequel' },
      { malId: 40748, title: 'Jujutsu Kaisen (Season 1)', type: 'TV', releaseYear: 2020, episodes: 24, relation: 'Parent Story' },
      { malId: 51009, title: 'Jujutsu Kaisen (Season 2)', type: 'TV', releaseYear: 2023, episodes: 23, relation: 'Sequel' }
    ],
    releaseOrder: [
      { malId: 40748, title: 'Jujutsu Kaisen (Season 1)', type: 'TV', releaseYear: 2020, episodes: 24, relation: 'Parent Story' },
      { malId: 43884, title: 'Jujutsu Kaisen 0 (Movie)', type: 'Movie', releaseYear: 2021, episodes: 1, relation: 'Prequel' },
      { malId: 51009, title: 'Jujutsu Kaisen (Season 2)', type: 'TV', releaseYear: 2023, episodes: 23, relation: 'Sequel' }
    ]
  },
  // Attack on Titan (Shingeki no Kyojin) - MAL IDs: 16498, 25777, 35760, 38524, 40052, 42091, 48569, 51765
  '16498': {
    name: 'Attack on Titan',
    explanation: 'Watch in chronological release order to follow the dark mystery of Eren and the Titans from the beginning to the final battle.',
    recommendedOrder: [
      { malId: 16498, title: 'Attack on Titan (Season 1)', type: 'TV', releaseYear: 2013, episodes: 25, relation: 'Parent Story' },
      { malId: 25777, title: 'Attack on Titan (Season 2)', type: 'TV', releaseYear: 2017, episodes: 12, relation: 'Sequel' },
      { malId: 35760, title: 'Attack on Titan (Season 3 Part 1)', type: 'TV', releaseYear: 2018, episodes: 12, relation: 'Sequel' },
      { malId: 38524, title: 'Attack on Titan (Season 3 Part 2)', type: 'TV', releaseYear: 2019, episodes: 10, relation: 'Sequel' },
      { malId: 40052, title: 'Attack on Titan: The Final Season', type: 'TV', releaseYear: 2020, episodes: 16, relation: 'Sequel' },
      { malId: 42091, title: 'Attack on Titan: The Final Season Part 2', type: 'TV', releaseYear: 2022, episodes: 12, relation: 'Sequel' },
      { malId: 48569, title: 'Attack on Titan: The Final Season - Special 1', type: 'Special', releaseYear: 2023, episodes: 1, relation: 'Sequel' },
      { malId: 51765, title: 'Attack on Titan: The Final Season - Special 2', type: 'Special', releaseYear: 2023, episodes: 1, relation: 'Sequel' }
    ],
    releaseOrder: [
      { malId: 16498, title: 'Attack on Titan (Season 1)', type: 'TV', releaseYear: 2013, episodes: 25, relation: 'Parent Story' },
      { malId: 25777, title: 'Attack on Titan (Season 2)', type: 'TV', releaseYear: 2017, episodes: 12, relation: 'Sequel' },
      { malId: 35760, title: 'Attack on Titan (Season 3 Part 1)', type: 'TV', releaseYear: 2018, episodes: 12, relation: 'Sequel' },
      { malId: 38524, title: 'Attack on Titan (Season 3 Part 2)', type: 'TV', releaseYear: 2019, episodes: 10, relation: 'Sequel' },
      { malId: 40052, title: 'Attack on Titan: The Final Season', type: 'TV', releaseYear: 2020, episodes: 16, relation: 'Sequel' },
      { malId: 42091, title: 'Attack on Titan: The Final Season Part 2', type: 'TV', releaseYear: 2022, episodes: 12, relation: 'Sequel' },
      { malId: 48569, title: 'Attack on Titan: The Final Season - Special 1', type: 'Special', releaseYear: 2023, episodes: 1, relation: 'Sequel' },
      { malId: 51765, title: 'Attack on Titan: The Final Season - Special 2', type: 'Special', releaseYear: 2023, episodes: 1, relation: 'Sequel' }
    ]
  }
};

// Add cross-referencing keys for overrides
FRANCHISE_OVERRIDES['40356'] = FRANCHISE_OVERRIDES['38000'];
FRANCHISE_OVERRIDES['47778'] = FRANCHISE_OVERRIDES['38000'];
FRANCHISE_OVERRIDES['49926'] = FRANCHISE_OVERRIDES['38000'];
FRANCHISE_OVERRIDES['55701'] = FRANCHISE_OVERRIDES['38000'];

FRANCHISE_OVERRIDES['43884'] = FRANCHISE_OVERRIDES['40748'];
FRANCHISE_OVERRIDES['51009'] = FRANCHISE_OVERRIDES['40748'];

FRANCHISE_OVERRIDES['25777'] = FRANCHISE_OVERRIDES['16498'];
FRANCHISE_OVERRIDES['35760'] = FRANCHISE_OVERRIDES['16498'];
FRANCHISE_OVERRIDES['38524'] = FRANCHISE_OVERRIDES['16498'];
FRANCHISE_OVERRIDES['40052'] = FRANCHISE_OVERRIDES['16498'];
FRANCHISE_OVERRIDES['42091'] = FRANCHISE_OVERRIDES['16498'];
FRANCHISE_OVERRIDES['48569'] = FRANCHISE_OVERRIDES['16498'];
FRANCHISE_OVERRIDES['51765'] = FRANCHISE_OVERRIDES['16498'];
