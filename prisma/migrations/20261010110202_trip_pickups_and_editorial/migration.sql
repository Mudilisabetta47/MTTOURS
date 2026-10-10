-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "category" TEXT,
ADD COLUMN     "highlights" TEXT[],
ADD COLUMN     "motif" TEXT,
ADD COLUMN     "reviewNotes" TEXT[];

-- CreateTable
CREATE TABLE "TripPickup" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "localTime" TEXT NOT NULL,
    "surchargeCents" INTEGER NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TripPickup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripPickup_tripId_stopId_key" ON "TripPickup"("tripId", "stopId");

-- AddForeignKey
ALTER TABLE "TripPickup" ADD CONSTRAINT "TripPickup_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPickup" ADD CONSTRAINT "TripPickup_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
