export interface LocalSkipTime {
  introStart: number;
  introEnd: number;
  outroStart?: number;
  outroEnd?: number;
}

export const LOCAL_SKIP_TIMES: Record<string, LocalSkipTime> = {
  // Fullmetal Alchemist: Brotherhood (MAL: 5114) example overrides
  "5114": { introStart: 0, introEnd: 89, outroStart: 1350, outroEnd: 1440 },
  // Naruto (MAL: 20) example overrides
  "20": { introStart: 30, introEnd: 120, outroStart: 1250, outroEnd: 1380 },
};
