-- CreateEnum
CREATE TYPE "PoiCategory" AS ENUM ('SIGHT', 'BEACH_NATURE', 'FOOD', 'LEISURE', 'TRANSPORT', 'AIRPORT');

-- CreateEnum
CREATE TYPE "PoiReview" AS ENUM ('DRAFT', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "guideId" TEXT;

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "refLabel" TEXT NOT NULL,
    "refLatitude" DOUBLE PRECISION NOT NULL,
    "refLongitude" DOUBLE PRECISION NOT NULL,
    "intro" TEXT,
    "defaultZoom" DOUBLE PRECISION NOT NULL DEFAULT 13,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationPoi" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PoiCategory" NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "source" TEXT NOT NULL,
    "attribution" TEXT,
    "review" "PoiReview" NOT NULL DEFAULT 'DRAFT',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHighlight" BOOLEAN NOT NULL DEFAULT false,
    "highlightText" TEXT,
    "mediaId" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationPoi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE INDEX "DestinationPoi_destinationId_category_sort_idx" ON "DestinationPoi"("destinationId", "category", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationPoi_destinationId_name_key" ON "DestinationPoi"("destinationId", "name");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationPoi" ADD CONSTRAINT "DestinationPoi_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationPoi" ADD CONSTRAINT "DestinationPoi_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
