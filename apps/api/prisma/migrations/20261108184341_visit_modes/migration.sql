-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "queues" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "savedBy2optM" INTEGER,
ADD COLUMN     "visitMode" TEXT NOT NULL DEFAULT 'MAIN';

-- AlterTable
ALTER TABLE "RoutePoint" ADD COLUMN     "enterable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inside" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insideMin" INTEGER,
ADD COLUMN     "outsideMin" INTEGER;
