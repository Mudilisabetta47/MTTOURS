-- AlterTable
ALTER TABLE "DepartureStop" ADD COLUMN     "platform" TEXT;

-- AlterTable
ALTER TABLE "TripPickup" ADD COLUMN     "platform" TEXT,
ALTER COLUMN "localTime" DROP NOT NULL;
