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
  // 16:9 landscape desktop native edits
  { id: 'edit_5', src: '/edits/edit_5.mp4', title: 'Sun Breathing', anime: 'Demon Slayer', width: 1280, height: 720, aspectRatio: '16:9' },
  { id: 'edit_6', src: '/edits/edit_6.mp4', title: 'Thunderclap & Flash', anime: 'Demon Slayer', width: 1276, height: 718, aspectRatio: '16:9' },
  { id: 'edit_7', src: '/edits/edit_7.mp4', title: 'Bankai Unleashed', anime: 'Bleach: TYBW', width: 1276, height: 720, aspectRatio: '16:9' },
  { id: 'edit_8', src: '/edits/edit_8.mp4', title: 'Rumbling Titan', anime: 'Attack on Titan', width: 1280, height: 720, aspectRatio: '16:9' },
  { id: 'edit_10', src: '/edits/edit_10.mp4', title: 'Chainsaw Devil', anime: 'Chainsaw Man', width: 930, height: 718, aspectRatio: 'custom' },
  { id: 'edit_13', src: '/edits/edit_13.mp4', title: 'Sorcerer Supreme', anime: 'Jujutsu Kaisen', width: 576, height: 576, aspectRatio: '1:1' },
  { id: 'edit_15', src: '/edits/edit_15.mp4', title: 'Berserk Eclipse', anime: 'Berserk', width: 720, height: 1280, aspectRatio: '9:16' },

  // Remaining edits at the end
  { id: 'edit_1', src: '/edits/edit_1.mp4', title: 'Epic Awakening', anime: 'Jujutsu Kaisen', width: 720, height: 720, aspectRatio: '1:1' },
  { id: 'edit_2', src: '/edits/edit_2.mp4', title: 'Limitless Domain', anime: 'Jujutsu Kaisen', width: 981, height: 720, aspectRatio: 'custom' },
  { id: 'edit_3', src: '/edits/edit_3.mp4', title: 'Gear 5 Sunrise', anime: 'One Piece', width: 960, height: 720, aspectRatio: 'custom' },
  { id: 'edit_4', src: '/edits/edit_4.mp4', title: 'Shadow Monarch', anime: 'Solo Leveling', width: 1280, height: 720, aspectRatio: '16:9' },
];
