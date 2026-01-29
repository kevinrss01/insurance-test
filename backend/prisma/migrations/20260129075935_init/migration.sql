-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyNumber" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "incidentDate" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "attachments" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClaimAiVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "responseJson" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "tokenUsage" TEXT,
    CONSTRAINT "ClaimAiVersion_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Claim_claimType_status_idx" ON "Claim"("claimType", "status");

-- CreateIndex
CREATE INDEX "ClaimAiVersion_claimId_createdAt_idx" ON "ClaimAiVersion"("claimId", "createdAt" DESC);
