/**
 * Determines whether an anime is a specific season or an entire long-running series
 * and returns a formatted episode count string consistently.
 */
export interface GetEpisodeDisplayParams {
  title: string;
  episodes: number | null;
  seasonNumber?: number | null;
  isSeason?: boolean | null;
  malId?: number | string | null;
}

export const getEpisodeDisplay = ({
  title,
  episodes,
  seasonNumber,
  isSeason,
  malId,
}: GetEpisodeDisplayParams) => {
  if (episodes === null || episodes === undefined) {
    return 'Ongoing';
  }

  const cleanTitle = title.toLowerCase();
  const numericId = malId ? (typeof malId === 'string' ? parseInt(malId, 10) : malId) : null;

  // Identify typical long-running continuous series
  const isLongSeries = episodes > 99 ||
                       (numericId !== null && [21, 20, 1735, 235, 1604, 220, 172, 9969, 17074].includes(numericId)) ||
                       cleanTitle.includes('one piece') ||
                       cleanTitle.includes('naruto') ||
                       cleanTitle.includes('detective conan') ||
                       cleanTitle.includes('dragon ball') ||
                       cleanTitle.includes('bleach') ||
                       cleanTitle.includes('doraemon') ||
                       cleanTitle.includes('shin-chan') ||
                       cleanTitle.includes('gintama');

  if (isLongSeries) {
    return `${episodes} EP`;
  }

  // If isSeason is explicitly false, do not show season prefix
  if (isSeason === false) {
    return `${episodes} EP`;
  }

  // Use seasonNumber if available
  if (seasonNumber !== undefined && seasonNumber !== null && seasonNumber > 0) {
    return `S${seasonNumber} • ${episodes} EP`;
  }

  // Detect season from title
  let seasonNum = 1;
  const seasonRegex = /season\s+(\d+)|(\d+)(?:st|nd|rd|th)\s+season|\bs(\d+)\b/i;
  const match = title.match(seasonRegex);
  
  if (match) {
    seasonNum = parseInt(match[1] || match[2] || match[3], 10);
  } else if (cleanTitle.includes('part 2') || cleanTitle.includes('cour 2') || cleanTitle.includes('ii') || cleanTitle.includes('second season')) {
    seasonNum = 2;
  } else if (cleanTitle.includes('part 3') || cleanTitle.includes('cour 3') || cleanTitle.includes('iii') || cleanTitle.includes('third season')) {
    seasonNum = 3;
  } else if (cleanTitle.includes('part 4') || cleanTitle.includes('four') || cleanTitle.includes('iv') || cleanTitle.includes('fourth season')) {
    seasonNum = 4;
  }

  return `S${seasonNum} • ${episodes} EP`;
};
