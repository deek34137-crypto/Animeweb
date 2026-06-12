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
    const { animeId, animeTitle, animeImage, episode, position, duration } = body;

    if (!animeId || episode === undefined || position === undefined || !duration) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const epNum = Number(episode);
    const posSec = Number(position);
    const durSec = Number(duration);

    // 1. Upsert WatchProgress
    const progress = await db.watchProgress.upsert({
      where: {
        userId_animeId_episode: {
          userId,
          animeId: String(animeId),
          episode: epNum,
        },
      },
      update: {
        position: posSec,
        duration: durSec,
        lastWatchedAt: new Date(),
      },
      create: {
        userId,
        animeId: String(animeId),
        episode: epNum,
        position: posSec,
        duration: durSec,
      },
    });

    // 2. Check Auto-Completion (Watch Progress >= 95% or ended)
    const completionRatio = posSec / durSec;
    const isCompleted = completionRatio >= 0.95;

    let historyCreated = false;
    let listEntryUpdated = false;

    if (isCompleted) {
      // 2a. Record WatchHistory (Clean upsert on rewatches to update timestamp and prevent duplication)
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
      historyCreated = true;

      // 2b. Auto list tracking updates
      // Find user's list entry for this anime
      const listEntry = await db.listEntry.findUnique({
        where: {
          userId_animeId: {
            userId,
            animeId: String(animeId),
          },
        },
      });

      if (listEntry) {
        // Only update if they watched a further episode than recorded
        if (epNum > listEntry.episodesWatched) {
          const finalEpsWatched = epNum;
          
          // If they reached the end, automatically set status to 'completed'
          let finalStatus = listEntry.status;
          let completedDate = listEntry.completedAt;

          if (listEntry.animeEpisodes && finalEpsWatched >= listEntry.animeEpisodes) {
            finalStatus = 'completed';
            completedDate = new Date();
          } else if (listEntry.status === 'planning') {
            // Auto start watching if they were planning
            finalStatus = 'watching';
          }

          await db.listEntry.update({
            where: {
              id: listEntry.id,
            },
            data: {
              episodesWatched: finalEpsWatched,
              status: finalStatus,
              completedAt: completedDate,
            },
          });
          listEntryUpdated = true;
          // Trigger sync in the background
          syncWatchProgress(userId, String(animeId), finalStatus, finalEpsWatched).catch((err) => {
            console.error('[MAL/AniList Sync Error]', err);
          });
        }
      } else {
        // If they had no list entry, create one as 'watching'
        let finalStatus = 'watching';
        const totalEps = body.totalEpisodes ? Number(body.totalEpisodes) : null;
        let completedDate = null;

        if (totalEps && epNum >= totalEps) {
          finalStatus = 'completed';
          completedDate = new Date();
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
            completedAt: completedDate,
          },
        });
        listEntryUpdated = true;
        // Trigger sync in the background
        syncWatchProgress(userId, String(animeId), finalStatus, epNum).catch((err) => {
          console.error('[MAL/AniList Sync Error]', err);
        });
      }
    }

    return NextResponse.json({
      success: true,
      progress,
      isCompleted,
      historyCreated,
      listEntryUpdated,
    });
  } catch (error) {
    console.error('API watch progress save error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
