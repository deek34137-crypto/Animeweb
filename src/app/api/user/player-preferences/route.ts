import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const DEFAULT_PLAYER_PREFERENCES = {
  subtitleLanguage: "en",
  defaultAudioLanguage: "ja",
  autoSkipOP: false,
  autoSkipED: false,
  skipRecaps: false,
  skipCredits: false,
  alwaysResume: true,
  playbackSpeed: 1.0,
  autoplay: true,
  autoNext: true,
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await db.playerPreferences.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(preferences || DEFAULT_PLAYER_PREFERENCES);
  } catch (error) {
    logger.error("Player preferences GET error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const allowedKeys = [
      "subtitleLanguage",
      "defaultAudioLanguage",
      "autoSkipOP",
      "autoSkipED",
      "skipRecaps",
      "skipCredits",
      "alwaysResume",
      "playbackSpeed",
      "autoplay",
      "autoNext",
    ];

    const updateData: Record<string, string | boolean | number> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // Increment version for optimistic concurrency control
    const current = await db.playerPreferences.findUnique({
      where: { userId: session.user.id },
    });

    const nextVersion = current ? (current.version || 1) + 1 : 1;
    updateData.version = nextVersion;

    const preferences = await db.playerPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...DEFAULT_PLAYER_PREFERENCES,
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json(preferences);
  } catch (error) {
    logger.error("Player preferences PUT error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
