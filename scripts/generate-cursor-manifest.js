const fs = require('fs');
const path = require('path');

const CURSORS_DIR = path.join(__dirname, '..', 'public', 'cursors');
const MANIFEST_PATH = path.join(CURSORS_DIR, 'manifest.json');

function humanizeName(id) {
  let name = id;
  
  // Custom prefix overrides
  name = name.replace(/^apothecary-diaries-/, 'Apothecary Diaries - ');
  name = name.replace(/^bungo-stray-dogs-/, 'Bungo Stray Dogs - ');
  name = name.replace(/^courage-cowardly-dog-/, 'Courage the Cowardly Dog - ');
  name = name.replace(/^delicious-dungeon-/, 'Delicious in Dungeon - ');
  name = name.replace(/^dr-stone-/, 'Dr. Stone - ');
  name = name.replace(/^el-tigre-/, 'El Tigre - ');
  name = name.replace(/^fosters-home-/, 'Foster\'s Home - ');
  name = name.replace(/^gameoverse-/, 'Gameoverse - ');
  name = name.replace(/^gregory-horror-show-/, 'Gregory Horror Show - ');
  name = name.replace(/^hi-fi-rush-/, 'Hi-Fi Rush - ');
  name = name.replace(/^indigo-park-/, 'Indigo Park - ');
  name = name.replace(/^made-in-abyss-/, 'Made in Abyss - ');
  name = name.replace(/^monster-prom-/, 'Monster Prom - ');
  name = name.replace(/^mucha-lucha-/, '¡Mucha Lucha! - ');
  name = name.replace(/^murder-drones-/, 'Murder Drones - ');
  name = name.replace(/^my-singing-monsters-/, 'My Singing Monsters - ');
  name = name.replace(/^plastic-memories-/, 'Plastic Memories - ');
  name = name.replace(/^sakamoto-days-/, 'Sakamoto Days - ');
  name = name.replace(/^solo-leveling-/, 'Solo Leveling - ');
  name = name.replace(/^veggietales-/, 'VeggieTales - ');
  name = name.replace(/^witch-hat-atelier-/, 'Witch Hat Atelier - ');
  name = name.replace(/^xiaolin-showdown-/, 'Xiaolin Showdown - ');
  name = name.replace(/^yu-gi-oh-/, 'Yu-Gi-Oh! - ');

  // Replace common prefixes
  name = name.replace(/^chibi-/, 'Chibi ');
  name = name.replace(/^fbje-/, 'Frieren - ');
  name = name.replace(/^ksliw-/, 'Love Is War - ');
  name = name.replace(/^kcc-/, 'Komi Can\'t Communicate - ');
  name = name.replace(/^tdlsk-/, 'Saiki K. - ');
  name = name.replace(/^ttigraas-/, 'Slime Isekai - ');

  // Split and capitalize
  return name
    .split(/[- ]+/)
    .map(word => {
      if (!word) return '';
      const lower = word.toLowerCase();
      if (lower === 'jjk') return 'JJK';
      if (lower === 'aot') return 'AoT';
      if (lower === 'hxh') return 'HxH';
      if (lower === 'mha') return 'MHA';
      if (lower === 'pkm' || lower === 'pkmn') return 'Pokémon';
      if (lower === 'dbz') return 'DBZ';
      if (lower === 'mal') return 'MAL';
      if (lower === 'r6') return 'R6';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .trim();
}

function getCategory(id) {
  const animePrefixes = [
    'chibi-', 'fbje-', 'bleach-', 'jjk-', 'solo-leveling-', 'dr-stone-', 'fire-force-', 
    'kcc-', 'ksliw-', 'lackadaisy-', 'lucky-star-', 'made-in-abyss-', 'mashle-', 'nanbaka-', 
    'plastic-memories-', 'sakamoto-days-', 'shugo-chara-', 'tdlsk-', 'toradora-', 'trigun-', 
    'ttigraas-', 'witch-hat-', 'yu-gi-oh-', 'delicious-dungeon-', 'apothecary-diaries-', 
    'blue-lock-', 'bungo-stray-dogs-', 'danganronpa-', 'deltora-quest-'
  ];
  
  const gamePrefixes = [
    'r6-siege-', 'valorant-', 'dead-cells-', 'grounded-', 'hi-fi-rush-', 'galaga-', 
    'monster-prom-', 'my-singing-monsters-', 'hytale-', 'katamari-', 'legends-idleon-', 
    'scribblenauts-', 'unravel-', 'winter-burrow-', 'indigo-park-', 'goat-', 'gameoverse-'
  ];
  
  const cuteMemesPrefixes = [
    'cute-', 'object-cringe-', 'cosmic-', 'care-bears-', 'miffy-'
  ];
  
  const cartoonMoviePrefixes = [
    'courage-cowardly-dog-', 'chowder-', 'danny-phantom-', 'fosters-home-', 'veggietales-', 
    'xiaolin-showdown-', 'el-tigre-', 'mucha-lucha-', 'murder-drones-', 'em-', 
    'gregory-horror-', 'swapped-', 'mouse-pi-', 'motorslice-', 'struggling-'
  ];

  if (animePrefixes.some(p => id.startsWith(p))) {
    return 'Anime / Manga';
  }
  if (gamePrefixes.some(p => id.startsWith(p))) {
    return 'Games';
  }
  if (cuteMemesPrefixes.some(p => id.startsWith(p))) {
    return 'Viral Memes';
  }
  if (cartoonMoviePrefixes.some(p => id.startsWith(p))) {
    return 'Cartoon & Movies';
  }
  
  return 'Others';
}

function generate() {
  console.log('Scanning cursors directory:', CURSORS_DIR);
  if (!fs.existsSync(CURSORS_DIR)) {
    console.error('Cursors directory does not exist!');
    process.exit(1);
  }

  const files = fs.readdirSync(CURSORS_DIR);
  const packsMap = {};

  files.forEach(file => {
    if (!file.endsWith('.png')) return;

    let id = '';
    let type = '';

    if (file.endsWith('-cursor.png')) {
      id = file.substring(0, file.length - '-cursor.png'.length);
      type = 'cursor';
    } else if (file.endsWith('-pointer.png')) {
      id = file.substring(0, file.length - '-pointer.png'.length);
      type = 'pointer';
    } else {
      return; // Ignore other pngs
    }

    if (!packsMap[id]) {
      packsMap[id] = { id };
    }
    
    packsMap[id][type] = `/cursors/${file}`;
  });

  const packs = [];
  Object.keys(packsMap).forEach(id => {
    const pack = packsMap[id];
    
    // Ensure we have at least one of them, fallback if the other is missing
    if (!pack.cursor && !pack.pointer) return;
    if (!pack.cursor) pack.cursor = pack.pointer;
    if (!pack.pointer) pack.pointer = pack.cursor;

    pack.name = humanizeName(id);
    pack.category = getCategory(id);
    
    // Configurable hotspot defaults
    pack.hotspotX = 0;
    pack.hotspotY = 0;
    
    // Customize pointer hotspot for a more natural click tip
    // Usually pointers (like hands) click around (16, 0) or (5, 0)
    // We default to (0,0) as requested, but we can store it in the JSON config
    pack.pointerHotspotX = 0;
    pack.pointerHotspotY = 0;

    packs.push(pack);
  });

  // Sort by name
  packs.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(packs, null, 2), 'utf-8');
  console.log(`Successfully generated manifest.json with ${packs.length} cursor packs!`);
}

generate();
