export interface AnimeEditReel {
  id: string;
  src: string;
  title: string;
  anime: string;
  width?: number;
  height?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1' | 'custom';
}

export const ANIME_EDITS: AnimeEditReel[] = [
  // 16:9 landscape desktop native edits (starting from Demon Slayer)
  { id: 'edit_5', src: '/edits/edit_5.mp4', title: 'Sun Breathing', anime: 'Demon Slayer', width: 1280, height: 720, aspectRatio: '16:9' },
  { id: 'edit_6', src: '/edits/edit_6.mp4', title: 'Thunderclap & Flash', anime: 'Demon Slayer', width: 1276, height: 718, aspectRatio: '16:9' },
  { id: 'edit_7', src: '/edits/edit_7.mp4', title: 'Bankai Unleashed', anime: 'Bleach: TYBW', width: 1276, height: 720, aspectRatio: '16:9' },
  { id: 'edit_8', src: '/edits/edit_8.mp4', title: 'Rumbling Titan', anime: 'Attack on Titan', width: 1280, height: 720, aspectRatio: '16:9' },
  { id: 'edit_9', src: '/edits/edit_9.mp4', title: 'Honored One', anime: 'Jujutsu Kaisen', width: 1280, height: 720, aspectRatio: '16:9' },
  { id: 'edit_10', src: '/edits/edit_10.mp4', title: 'Chainsaw Devil', anime: 'Chainsaw Man', width: 930, height: 718, aspectRatio: 'custom' },
  { id: 'edit_11', src: '/edits/edit_11.mp4', title: 'Hollow Purple', anime: 'Jujutsu Kaisen', width: 1276, height: 718, aspectRatio: '16:9' },
  { id: 'edit_12', src: '/edits/edit_12.mp4', title: 'Ultra Instinct', anime: 'Dragon Ball Super', width: 1063, height: 718, aspectRatio: 'custom' },
  { id: 'edit_13', src: '/edits/edit_13.mp4', title: 'Sorcerer Supreme', anime: 'Jujutsu Kaisen', width: 576, height: 576, aspectRatio: '1:1' },
  { id: 'edit_14', src: '/edits/edit_14.mp4', title: 'Akatsuki Gathering', anime: 'Naruto Shippuden', width: 1280, height: 720, aspectRatio: '16:9' },

  // Remaining available edits
  { id: 'edit_2', src: '/edits/edit_2.mp4', title: 'Limitless Domain', anime: 'Jujutsu Kaisen', width: 981, height: 720, aspectRatio: 'custom' },
  { id: 'edit_4', src: '/edits/edit_4.mp4', title: 'Shadow Monarch', anime: 'Solo Leveling', width: 1280, height: 720, aspectRatio: '16:9' },
];
