import { db } from './db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Mapping local statuses to AniList's MediaListStatus enum
const mapStatusToAnilist = (status: string): string => {
  const map: Record<string, string> = {
    watching: 'CURRENT',
    completed: 'COMPLETED',
    paused: 'PAUSED',
    dropped: 'DROPPED',
    planning: 'PLANNING',
    rewatching: 'REWATCHING',
  };
  return map[status] || 'CURRENT';
};

// Mapping local statuses to MyAnimeList's status parameter values
const mapStatusToMal = (status: string): string => {
  const map: Record<string, string> = {
    watching: 'watching',
    completed: 'completed',
    paused: 'on_hold',
    dropped: 'dropped',
    planning: 'plan_to_watch',
    rewatching: 'watching',
  };
  return map[status] || 'watching';
};

/**
 * Refreshes the MyAnimeList OAuth2 token.
 */
export async function refreshMalToken(userId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.MAL_CLIENT_ID;
  const clientSecret = process.env.MAL_CLIENT_SECRET;

  if (!clientId) {
    console.error('[MAL Sync] MAL_CLIENT_ID is not configured.');
    return null;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }

    const res = await fetch('https://myanimelist.net/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Token refresh failed: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await db.user.update({
      where: { id: userId },
      data: {
        malAccessToken: data.access_token,
        malRefreshToken: data.refresh_token,
        malExpiresAt: expiresAt,
      },
    });

    console.log(`[MAL Sync] Successfully refreshed MAL access token for user ${userId}`);
    return data.access_token;
  } catch (error) {
    console.error(`[MAL Sync] Failed to refresh MAL token for user ${userId}:`, error);
    return null;
  }
}

/**
 * Retrieves a valid MyAnimeList access token, auto-refreshing if it is expired or close to expiring.
 */
export async function getMalAccessToken(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      malAccessToken: true,
      malRefreshToken: true,
      malExpiresAt: true,
    },
  });

  if (!user || !user.malAccessToken) return null;

  // Refresh token if it is expired or within 5 minutes of expiring
  const isExpired = user.malExpiresAt ? user.malExpiresAt.getTime() - Date.now() < 300000 : true;

  if (isExpired && user.malRefreshToken) {
    return refreshMalToken(userId, user.malRefreshToken);
  }

  return user.malAccessToken;
}

/**
 * Synchronizes progress and scores to MyAnimeList.
 */
export async function syncToMyAnimeList(
  userId: string,
  animeId: string,
  status: string,
  episodesWatched: number,
  score?: number | null
): Promise<boolean> {
  try {
    const accessToken = await getMalAccessToken(userId);
    if (!accessToken) {
      console.log(`[MAL Sync] User ${userId} is not connected to MyAnimeList. Skipping sync.`);
      return false;
    }

    const malStatus = mapStatusToMal(status);
    const params = new URLSearchParams();
    params.append('status', malStatus);
    params.append('num_watched_episodes', String(episodesWatched));
    if (score !== undefined && score !== null && score > 0) {
      // MyAnimeList expects score as integer 1-10
      params.append('score', String(Math.round(score)));
    }

    console.log(`[MAL Sync] Syncing anime ${animeId} to MAL (status: ${malStatus}, progress: ${episodesWatched}, score: ${score})`);

    const res = await fetch(`https://api.myanimelist.net/v2/anime/${animeId}/my_list_status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[MAL Sync] Failed to update MAL list: ${res.status} - ${errText}`);
      return false;
    }

    console.log(`[MAL Sync] Successfully synced anime ${animeId} to MAL for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`[MAL Sync] Error syncing to MyAnimeList for user ${userId}:`, error);
    return false;
  }
}

/**
 * Queries AniList for their internal Media ID using the MAL ID.
 */
export async function fetchAnilistMediaId(animeIdMal: string): Promise<number | null> {
  const query = `
    query ($idMal: Int) {
      Media (idMal: $idMal, type: ANIME) {
        id
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { idMal: parseInt(animeIdMal, 10) },
      }),
    });

    if (!res.ok) {
      throw new Error(`GraphQL lookup failed with status: ${res.status}`);
    }

    const json = await res.json();
    return json.data?.Media?.id || null;
  } catch (error) {
    console.error(`[AniList Sync] Failed to fetch AniList ID for MAL ID ${animeIdMal}:`, error);
    return null;
  }
}

/**
 * Synchronizes progress and scores to AniList.
 */
export async function syncToAniList(
  userId: string,
  animeIdMal: string,
  status: string,
  episodesWatched: number,
  score?: number | null
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { anilistAccessToken: true },
    });

    if (!user || !user.anilistAccessToken) {
      console.log(`[AniList Sync] User ${userId} is not connected to AniList. Skipping sync.`);
      return false;
    }

    // Resolve MAL ID to AniList Media ID
    const anilistMediaId = await fetchAnilistMediaId(animeIdMal);
    if (!anilistMediaId) {
      console.warn(`[AniList Sync] Could not resolve MAL ID ${animeIdMal} to an AniList Media ID.`);
      return false;
    }

    const anilistStatus = mapStatusToAnilist(status);
    const variables: Record<string, any> = {
      mediaId: anilistMediaId,
      status: anilistStatus,
      progress: episodesWatched,
    };

    if (score !== undefined && score !== null && score > 0) {
      // AniList expects raw score (standard 10-point scale: 1 to 10)
      variables.score = score;
    }

    const mutation = `
      mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
        SaveMediaListEntry (mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
          id
          status
          progress
          score
        }
      }
    `;

    console.log(`[AniList Sync] Syncing anime ${animeIdMal} (AniList ID: ${anilistMediaId}) to AniList (status: ${anilistStatus}, progress: ${episodesWatched}, score: ${score})`);

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.anilistAccessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AniList Sync] Failed to update AniList list: ${res.status} - ${errText}`);
      return false;
    }

    const json = await res.json();
    if (json.errors) {
      console.error(`[AniList Sync] GraphQL returned errors:`, json.errors);
      return false;
    }

    console.log(`[AniList Sync] Successfully synced anime ${animeIdMal} to AniList for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`[AniList Sync] Error syncing to AniList for user ${userId}:`, error);
    return false;
  }
}

/**
 * Master sync function to propagate anime list updates in the background.
 */
export async function syncWatchProgress(
  userId: string,
  animeId: string,
  status: string,
  episodesWatched: number,
  score?: number | null
): Promise<{ malSynced: boolean; anilistSynced: boolean }> {
  const userPrefs = await db.user.findUnique({
    where: { id: userId },
    select: {
      syncToMal: true,
      syncToAnilist: true,
      malAccessToken: true,
      anilistAccessToken: true,
    },
  });

  if (!userPrefs) {
    return { malSynced: false, anilistSynced: false };
  }

  const syncPromises: Promise<boolean>[] = [];

  const malIndex = userPrefs.syncToMal && userPrefs.malAccessToken ? 0 : -1;
  const anilistIndex = userPrefs.syncToAnilist && userPrefs.anilistAccessToken ? (malIndex !== -1 ? 1 : 0) : -1;

  if (malIndex !== -1) {
    syncPromises.push(syncToMyAnimeList(userId, animeId, status, episodesWatched, score));
  }
  if (anilistIndex !== -1) {
    syncPromises.push(syncToAniList(userId, animeId, status, episodesWatched, score));
  }

  const results = await Promise.all(syncPromises);

  return {
    malSynced: malIndex !== -1 ? results[malIndex] : false,
    anilistSynced: anilistIndex !== -1 ? results[anilistIndex] : false,
  };
}
