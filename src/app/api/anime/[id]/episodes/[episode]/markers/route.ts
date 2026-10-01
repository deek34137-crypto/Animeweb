import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; episode: string }> }
) {
  try {
    const { id: animeId, episode: epNumStr } = await context.params;
    const episodeNumber = parseInt(epNumStr, 10);
    
    if (isNaN(episodeNumber)) {
      return NextResponse.json({ error: "Invalid episode number" }, { status: 400 });
    }

    // Find the episode and its markers/metadata in one query
    const episode = await db.episode.findFirst({
      where: {
        animeId,
        number: episodeNumber,
      },
      include: {
        markers: {
          where: { verified: true },
          orderBy: { startTime: "asc" },
        },
        metadataMain: {
          include: {
            nextEpisode: true,
          },
        },
      },
    });

    if (!episode) {
      return NextResponse.json({
        found: false,
        markers: [],
        metadata: null,
      });
    }

    return NextResponse.json({
      found: true,
      episodeId: episode.id,
      markers: episode.markers,
      metadata: episode.metadataMain,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to fetch local markers:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
