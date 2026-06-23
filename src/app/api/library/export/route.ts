import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const entries = await db.listEntry.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (format === 'csv') {
      const csvHeaders = 'Anime ID,Title,Status,Episodes Watched,Total Episodes,Score,Rewatches,Private,Favorite,Updated At\n';
      const csvRows = entries.map(e => {
        const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
        return [
          escape(e.animeId),
          escape(e.animeTitle),
          escape(e.status),
          e.episodesWatched,
          e.animeEpisodes || '',
          e.score || '',
          e.rewatchCount,
          e.isPrivate ? 'YES' : 'NO',
          e.isFavorite ? 'YES' : 'NO',
          e.updatedAt.toISOString(),
        ].join(',');
      }).join('\n');

      return new Response(csvHeaders + csvRows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="aniworld_library_export.csv"',
        },
      });
    }

    if (format === 'markdown') {
      let md = `# My AniWorld Anime Library Export\n\n`;
      md += `Exported on ${new Date().toLocaleDateString()}\n\n`;
      
      const statuses = ['watching', 'completed', 'paused', 'dropped', 'planning'];
      const statusLabels: Record<string, string> = {
        watching: '📺 Currently Watching',
        completed: '✅ Completed',
        paused: '⏳ On Hold',
        dropped: '❌ Dropped',
        planning: '📅 Plan to Watch',
      };

      statuses.forEach(status => {
        const statusEntries = entries.filter(e => e.status === status);
        if (statusEntries.length > 0) {
          md += `## ${statusLabels[status]} (${statusEntries.length})\n\n`;
          md += `| Poster | Anime Title | Progress | Score | Favorite | Notes |\n`;
          md += `| --- | --- | --- | --- | --- | --- |\n`;
          statusEntries.forEach(e => {
            const cover = e.animeImage ? `![cover](${e.animeImage})` : 'N/A';
            const progress = `${e.episodesWatched}/${e.animeEpisodes || '??'}`;
            const rating = e.score ? `⭐ ${e.score}/10` : '-';
            const favorite = e.isFavorite ? '❤️' : ' ';
            const noteText = e.notes ? e.notes.replace(/\r?\n/g, ' ') : '';
            md += `| ${cover} | **${e.animeTitle}** | ${progress} | ${rating} | ${favorite} | ${noteText} |\n`;
          });
          md += `\n`;
        }
      });

      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="aniworld_library_export.md"',
        },
      });
    }

    if (format === 'mal') {
      // MyAnimeList XML format
      let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
      xml += `<!-- Created by AniWorld Export -->\n`;
      xml += `<myanimelist>\n`;
      xml += `  <myinfo>\n`;
      xml += `    <user_export_type>1</user_export_type>\n`;
      xml += `  </myinfo>\n`;

      entries.forEach(e => {
        // Map status: watching, completed, paused (on hold), dropped, planning (plan to watch)
        let malStatus = 'Watching';
        if (e.status === 'completed') malStatus = 'Completed';
        if (e.status === 'paused') malStatus = 'On-Hold';
        if (e.status === 'dropped') malStatus = 'Dropped';
        if (e.status === 'planning') malStatus = 'Plan to Watch';

        // Strip non-numeric for MAL ID if possible (e.g. series-1234 -> 1234)
        const cleanId = e.animeId.replace(/[^\d]/g, '');

        xml += `  <anime>\n`;
        xml += `    <series_animedb_id>${cleanId || '0'}</series_animedb_id>\n`;
        xml += `    <series_title><![CDATA[${e.animeTitle}]]></series_title>\n`;
        xml += `    <my_watched_episodes>${e.episodesWatched}</my_watched_episodes>\n`;
        xml += `    <my_score>${e.score || 0}</my_score>\n`;
        xml += `    <my_status>${malStatus}</my_status>\n`;
        xml += `    <my_comments><![CDATA[${e.notes || ''}]]></my_comments>\n`;
        xml += `    <update_on_import>1</update_on_import>\n`;
        xml += `  </anime>\n`;
      });
      xml += `</myanimelist>\n`;

      return new Response(xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': 'attachment; filename="aniworld_mal_export.xml"',
        },
      });
    }

    if (format === 'anilist') {
      // AniList JSON format compatible
      const anilistList = entries.map(e => {
        let alStatus = 'CURRENT';
        if (e.status === 'completed') alStatus = 'COMPLETED';
        if (e.status === 'paused') alStatus = 'PAUSED';
        if (e.status === 'dropped') alStatus = 'DROPPED';
        if (e.status === 'planning') alStatus = 'PLANNING';

        return {
          media: {
            id: parseInt(e.animeId.replace(/[^\d]/g, ''), 10) || 0,
            title: {
              romaji: e.animeTitle,
              english: e.animeTitle,
            },
            episodes: e.animeEpisodes,
          },
          status: alStatus,
          progress: e.episodesWatched,
          score: e.score ? e.score : null,
          notes: e.notes,
          repeat: e.rewatchCount,
        };
      });

      return new Response(JSON.stringify(anilistList, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="aniworld_anilist_export.json"',
        },
      });
    }

    // Default: JSON format
    return new Response(JSON.stringify(entries, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="aniworld_library_export.json"',
      },
    });
  } catch (error) {
    console.error('[GET Library Export Error]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
