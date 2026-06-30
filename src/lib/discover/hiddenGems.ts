export const HIDDEN_GEM_RULE = {
  minScore: 8.0,
  maxPopularityRank: 500, // popularity rank >= 500 (meaning less popular than top 500)
  minMembers: 1000,       // filter out extremely obscure / unrated titles
};

export function isHiddenGem(anime: {
  score: number | null;
  popularity?: number | null;
  members?: number | null;
}): boolean {
  const scoreVal = anime.score ?? 0;
  const popRank = anime.popularity ?? 999999;
  const memberCount = anime.members ?? 0;

  return (
    scoreVal >= HIDDEN_GEM_RULE.minScore &&
    popRank >= HIDDEN_GEM_RULE.maxPopularityRank &&
    memberCount >= HIDDEN_GEM_RULE.minMembers
  );
}
