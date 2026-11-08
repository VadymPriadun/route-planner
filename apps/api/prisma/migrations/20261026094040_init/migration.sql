-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis_tiger_geocoder";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis_topology";

-- CreateEnum
CREATE TYPE "PoiCategory" AS ENUM ('MUSEUM', 'ART', 'ATTRACTION', 'HISTORIC', 'CHURCH', 'PARK', 'VIEWPOINT', 'CAFE', 'RESTAURANT', 'BAR', 'PHARMACY');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interests" TEXT[],
    "activityLevel" "ActivityLevel" NOT NULL DEFAULT 'MEDIUM',
    "hoursPerDay" INTEGER NOT NULL DEFAULT 6,

    CONSTRAINT "Preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "title" TEXT,
    "requestText" TEXT,
    "days" INTEGER NOT NULL,
    "hoursPerDay" INTEGER NOT NULL,
    "activityLevel" "ActivityLevel" NOT NULL,
    "interests" TEXT[],
    "status" "RouteStatus" NOT NULL DEFAULT 'PENDING',
    "algorithm" TEXT,
    "totalDistanceM" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteDay" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "distanceM" INTEGER,
    "durationMin" INTEGER,

    CONSTRAINT "RouteDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePoint" (
    "id" TEXT NOT NULL,
    "routeDayId" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "arrivalTime" TEXT,
    "visitMinutes" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "RoutePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poi" (
    "id" TEXT NOT NULL,
    "osmType" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PoiCategory" NOT NULL,
    "subcategory" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "geom" geography(Point,4326),
    "rating" DOUBLE PRECISION,
    "openingHours" TEXT,
    "website" TEXT,
    "address" TEXT,
    "metadata" JSONB,
    "defaultVisitMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Preferences_userId_key" ON "Preferences"("userId");

-- CreateIndex
CREATE INDEX "Route_userId_idx" ON "Route"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteDay_routeId_dayNumber_key" ON "RouteDay"("routeId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RoutePoint_routeDayId_order_key" ON "RoutePoint"("routeDayId", "order");

-- CreateIndex
CREATE INDEX "Poi_category_idx" ON "Poi"("category");

-- CreateIndex
CREATE INDEX "Poi_geom_idx" ON "Poi" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "Poi_osmType_osmId_key" ON "Poi"("osmType", "osmId");

-- AddForeignKey
ALTER TABLE "Preferences" ADD CONSTRAINT "Preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteDay" ADD CONSTRAINT "RouteDay_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePoint" ADD CONSTRAINT "RoutePoint_routeDayId_fkey" FOREIGN KEY ("routeDayId") REFERENCES "RouteDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePoint" ADD CONSTRAINT "RoutePoint_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "Poi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
