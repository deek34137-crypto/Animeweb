import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { syncWatchProgress } from '@/lib/trackers';


export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { animeId, animeTitle, animeImage, episode, watched, totalEpisodes } = body;

    if (!animeId || episode === undefined || watched === undefined) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const epNum = Number(episode);
    const totalEps = totalEpisodes ? Number(totalEpisodes) : null;

    if (watched) {
      // 1. Mark as watched: Upsert WatchHistory
      await db.watchHistory.upsert({
        where: {
          userId_animeId_episode: {
            userId,
            animeId: String(animeId),
            episode: epNum,
          },
        },
        update: {
          completedAt: new Date(),
        },
        create: {
          userId,
          animeId: String(animeId),
          animeTitle: animeTitle || 'Unknown Anime',
          animeImage: animeImage || '',
          episode: epNum,
        },
      });

      // Also upsert WatchProgress as completed to prevent "Continue Watching" from pointing back to it
      await db.watchProgress.upsert({
        where: {
          userId_animeId_episode: {
            userId,
            animeId: String(animeId),
            episode: epNum,
          },
        },
        update: {
          position: 1440, // Mock ended position
          duration: 1440,
          lastWatchedAt: new Date(),
        },
        create: {
          userId,
          animeId: String(animeId),
          episode: epNum,
          position: 1440,
          duration: 1440,
        },
      });

      // 2. Update ListEntry episodesWatched
      const listEntry = await db.listEntry.findUnique({
        where: {
          userId_animeId: {
            userId,
            animeId: String(animeId),
          },
        },
      });

      let finalStatus = 'watching';
      let finalEpsWatched = epNum;

      if (listEntry) {
        if (epNum > listEntry.episodesWatched) {
          finalEpsWatched = epNum;
          finalStatus = listEntry.status;
          let completedDate = listEntry.completedAt;

          if (totalEps && finalEpsWatched >= totalEps) {
            finalStatus = 'completed';
            completedDate = new Date();
          } else if (listEntry.status === 'planning') {
            finalStatus = 'watching';
          }

          await db.listEntry.update({
            where: { id: listEntry.id },
            data: {
              episodesWatched: finalEpsWatched,
              status: finalStatus,
              completedAt: completedDate,
            },
          });
        } else {
          finalStatus = listEntry.status;
          finalEpsWatched = listEntry.episodesWatched;
        }
      } else {
        // Create new ListEntry
        if (totalEps && epNum >= totalEps) {
          finalStatus = 'completed';
        }

        await db.listEntry.create({
          data: {
            userId,
            animeId: String(animeId),
            animeTitle: animeTitle || 'Unknown Anime',
            animeImage: animeImage || '',
            animeEpisodes: totalEps,
            status: finalStatus,
            episodesWatched: epNum,
            completedAt: finalStatus === 'completed' ? new Date() : null,
          },
        });
      }

      // Sync to external trackers
      syncWatchProgress(userId, String(animeId), finalStatus, finalEpsWatched).catch((err) => {
        console.error('[MAL/AniList Toggle Sync Error]', err);
      });

    } else {
      // 1. Mark as unwatched: Delete WatchHistory entry
      try {
        await db.watchHistory.delete({
          where: {
            userId_animeId_episode: {
              userId,
              animeId: String(animeId),
              episode: epNum,
            },
          },
        });
      } catch (e) {
        // Ignore if not exists
      }

      // Also clean up WatchProgress for this episode
      try {
        await db.watchProgress.delete({
          where: {
            userId_animeId_episode: {
              userId,
              animeId: String(animeId),
              episode: epNum,
            },
          },
        });
      } catch (e) {
        // Ignore
      }

      // 2. Recalculate highest watched episode from remaining history
      const remainingHistory = await db.watchHistory.findMany({
        where: {
          userId,
          animeId: String(animeId),
        },
        select: {
          episode: true,
        },
      });

      const maxEp = remainingHistory.length > 0
        ? Math.max(...remainingHistory.map((h) => h.episode))
        : 0;

      // Update ListEntry episodes count
      const listEntry = await db.listEntry.findUnique({
        where: {
          userId_animeId: {
            userId,
            animeId: String(animeId),
          },
        },
      });

      if (listEntry) {
        let finalStatus = listEntry.status;
        if (maxEp < (listEntry.animeEpisodes || 9999) && listEntry.status === 'completed') {
          finalStatus = 'watching'; // Revert back to watching if they unmarked the final episode
        }

        await db.listEntry.update({
          where: { id: listEntry.id },
          data: {
            episodesWatched: maxEp,
            status: finalStatus,
            completedAt: finalStatus === 'completed' ? listEntry.completedAt : null,
          },
        });

        // Sync to external trackers
        syncWatchProgress(userId, String(animeId), finalStatus, maxEp).catch((err) => {
          console.error('[MAL/AniList Toggle Sync Error]', err);
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[History Toggle API] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/history
 * Body: { animeId: string }
 * Removes ALL watch history entries and watch progress for one anime.
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { animeId } = body;

    if (!animeId) {
      return NextResponse.json({ error: 'Missing animeId.' }, { status: 400 });
    }

    const aid = String(animeId);

    // Delete all history rows for this anime
    await db.watchHistory.deleteMany({
      where: { userId, animeId: aid },
    });

    // Delete all progress rows for this anime
    await db.watchProgress.deleteMany({
      where: { userId, animeId: aid },
    });

    // Reset the ListEntry episodes count and revert to planning (so it no longer shows in Continue Watching)
    const listEntry = await db.listEntry.findUnique({
      where: { userId_animeId: { userId, animeId: aid } },
    });

    if (listEntry && listEntry.status !== 'completed') {
      await db.listEntry.update({
        where: { id: listEntry.id },
        data: {
          episodesWatched: 0,
          status: 'planning',
          completedAt: null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[History Delete API] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
