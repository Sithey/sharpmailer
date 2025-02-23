/*
  Warnings:

  - You are about to drop the column `campaignId` on the `Lead` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_CampaignToLead" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CampaignToLead_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CampaignToLead_B_fkey" FOREIGN KEY ("B") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "variables" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("createdAt", "email", "id", "updatedAt", "userId", "variables") SELECT "createdAt", "email", "id", "updatedAt", "userId", "variables" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_CampaignToLead_AB_unique" ON "_CampaignToLead"("A", "B");

-- CreateIndex
CREATE INDEX "_CampaignToLead_B_index" ON "_CampaignToLead"("B");
