-- CreateTable
CREATE TABLE "Prefecture" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Lineage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CovidData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "count" INTEGER NOT NULL,
    "ratio" REAL NOT NULL,
    "prefectureId" INTEGER NOT NULL,
    "lineageId" INTEGER NOT NULL,
    "wave" INTEGER NOT NULL,
    CONSTRAINT "CovidData_prefectureId_fkey" FOREIGN KEY ("prefectureId") REFERENCES "Prefecture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CovidData_lineageId_fkey" FOREIGN KEY ("lineageId") REFERENCES "Lineage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Prefecture_name_key" ON "Prefecture"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Lineage_name_key" ON "Lineage"("name");

-- CreateIndex
CREATE INDEX "CovidData_date_idx" ON "CovidData"("date");

-- CreateIndex
CREATE INDEX "CovidData_prefectureId_idx" ON "CovidData"("prefectureId");

-- CreateIndex
CREATE INDEX "CovidData_lineageId_idx" ON "CovidData"("lineageId");
