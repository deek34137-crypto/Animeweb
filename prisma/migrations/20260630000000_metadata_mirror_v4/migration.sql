-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('ANILIST', 'MAL', 'TMDB', 'KITSU', 'SIMKL', 'ANIDB');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'LEASED', 'SENT', 'RETRY', 'FAILED', 'DLQ');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Anime" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "season" TEXT,
    "year" INTEGER,
    "episodesCount" INTEGER NOT NULL DEFAULT 0,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION DEFAULT 0.0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeTranslation" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeAlias" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimeAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalMapping" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "providerId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "lastVerified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProvenance" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "lastVerified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldProvenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "thumbnail" TEXT,
    "airDate" TIMESTAMP(3),
    "duration" INTEGER,
    "isFiller" BOOLEAN NOT NULL DEFAULT false,
    "isRecap" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeRelation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,

    CONSTRAINT "AnimeRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetadataVersion" (
    "id" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "migrationVersion" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetadataVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "errorDetails" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAuditLog" (
    "id" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterQueue" (
    "id" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "errorStack" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeadLetterQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Anime_slug_key" ON "Anime"("slug");

-- CreateIndex
CREATE INDEX "Anime_status_idx" ON "Anime"("status");

-- CreateIndex
CREATE INDEX "Anime_year_season_idx" ON "Anime"("year", "season");

-- CreateIndex
CREATE INDEX "AnimeTranslation_language_idx" ON "AnimeTranslation"("language");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeTranslation_animeId_language_key" ON "AnimeTranslation"("animeId", "language");

-- CreateIndex
CREATE INDEX "AnimeAlias_alias_idx" ON "AnimeAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeAlias_animeId_alias_key" ON "AnimeAlias"("animeId", "alias");

-- CreateIndex
CREATE INDEX "ExternalMapping_animeId_idx" ON "ExternalMapping"("animeId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalMapping_provider_providerId_key" ON "ExternalMapping"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalMapping_animeId_provider_key" ON "ExternalMapping"("animeId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "FieldProvenance_animeId_fieldName_key" ON "FieldProvenance"("animeId", "fieldName");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_animeId_number_key" ON "Episode"("animeId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeRelation_sourceId_targetId_relationType_key" ON "AnimeRelation"("sourceId", "targetId", "relationType");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "OutboxEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SyncJob_status_idx" ON "SyncJob"("status");

-- CreateIndex
CREATE INDEX "SyncJob_queueName_idx" ON "SyncJob"("queueName");

-- CreateIndex
CREATE INDEX "ProviderAuditLog_provider_createdAt_idx" ON "ProviderAuditLog"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "AnimeTranslation" ADD CONSTRAINT "AnimeTranslation_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeAlias" ADD CONSTRAINT "AnimeAlias_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalMapping" ADD CONSTRAINT "ExternalMapping_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProvenance" ADD CONSTRAINT "FieldProvenance_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeRelation" ADD CONSTRAINT "AnimeRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeRelation" ADD CONSTRAINT "AnimeRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable pg_trgm and add GIN index for search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS trgm_idx_anime_translation_title ON "AnimeTranslation" USING gin (title gin_trgm_ops);
