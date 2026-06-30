import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extract Normalized Query Filters
    const query = searchParams.get('q') || '';
    const genres = searchParams.getAll('genres[]'); // Multi-select genre IDs
    const status = searchParams.get('status') || undefined;
    const year = searchParams.get('year') || undefined;
    const season = searchParams.get('season') || undefined;
    const format = searchParams.get('format') || undefined; // TV, Movie, OVA, Special

    // Extended filters (points 18 & 19)
    const episodeCountMin = searchParams.get('episodeCountMin') ? parseInt(searchParams.get('episodeCountMin')!, 10) : undefined;
    const episodeCountMax = searchParams.get('episodeCountMax') ? parseInt(searchParams.get('episodeCountMax')!, 10) : undefined;
    const scoreMin = searchParams.get('scoreMin') ? parseFloat(searchParams.get('scoreMin')!) : undefined;
    const membersMin = searchParams.get('membersMin') ? parseInt(searchParams.get('membersMin')!, 10) : undefined;
    const favoritesMin = searchParams.get('favoritesMin') ? parseInt(searchParams.get('favoritesMin')!, 10) : undefined;
    const producer = searchParams.get('producer') || undefined;
    const source = searchParams.get('source') || undefined;

    // Pagination & Sorting (point 17)
    const sort = searchParams.get('sort') || 'score'; // score, popularity, members, favorites, title
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Inclusion Controls (point 8)
    const includeRelations = searchParams.get('includeRelations') === 'true';
    const includeRecommendations = searchParams.get('includeRecommendations') === 'true';
    const includeStudios = searchParams.get('includeStudios') === 'true';

    // 2. Build local Prisma Query filter based on Normalized Query Object
    const whereClause: any = {};

    if (query) {
      whereClause.title = { contains: query, mode: 'insensitive' };
    }

    if (genres.length > 0) {
      whereClause.genres = {
        some: {
          genreId: { in: genres },
        },
      };
    }

    if (status) {
      whereClause.rating = { contains: status, mode: 'insensitive' }; // Map status or generic fields
    }

    if (format) {
      whereClause.type = format;
    }

    if (episodeCountMin !== undefined || episodeCountMax !== undefined) {
      whereClause.episodes = {};
      if (episodeCountMin !== undefined) whereClause.episodes.gte = episodeCountMin;
      if (episodeCountMax !== undefined) whereClause.episodes.lte = episodeCountMax;
    }

    if (scoreMin !== undefined) {
      whereClause.score = { gte: scoreMin };
    }

    if (membersMin !== undefined) {
      whereClause.members = { gte: membersMin };
    }

    if (favoritesMin !== undefined) {
      whereClause.favorites = { gte: favoritesMin };
    }

    if (source) {
      whereClause.source = { equals: source, mode: 'insensitive' };
    }

    // 3. Sorting & Pagination
    const orderByClause: any = {};
    if (sort === 'score') orderByClause.score = order;
    else if (sort === 'popularity') orderByClause.popularity = order;
    else if (sort === 'members') orderByClause.members = order;
    else if (sort === 'favorites') orderByClause.favorites = order;
    else orderByClause.title = order;

    // 4. Perform localized Query (joins on Genre and Studio if inclusion options are true)
    const results = await db.animeCache.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
        ...(includeStudios
          ? {
              studios: {
                include: {
                  studio: true,
                },
              },
            }
          : {}),
      },
    });

    // 5. Enrich with relations or recommendations if requested
    const enrichedResults = await Promise.all(
      results.map(async (anime) => {
        const item: any = {
          ...anime,
          genres: anime.genres.map((g) => g.genre),
          studios: (anime as any).studios ? (anime as any).studios.map((s: any) => s.studio) : undefined,
        };

        if (includeRelations) {
          item.relations = await db.animeRelations.findMany({
            where: { animeId: anime.animeId },
          });
        }

        if (includeRecommendations) {
          item.recommendations = await db.animeRecommendationCache.findMany({
            where: { animeId: anime.animeId },
            take: 5,
          });
        }

        return item;
      })
    );

    return NextResponse.json({
      data: enrichedResults,
      pagination: {
        page,
        limit,
        count: enrichedResults.length,
      },
    });
  } catch (error: any) {
    console.error('Browse API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
