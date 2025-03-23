-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopSettings" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "aiTaggingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiTaggingOnChange" BOOLEAN NOT NULL DEFAULT true,
    "aiTaggingFrequency" TEXT NOT NULL DEFAULT 'daily',
    "aiTaggingBatchSize" INTEGER NOT NULL DEFAULT 50,
    "performanceAlertThreshold" INTEGER NOT NULL DEFAULT 60000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processingJob" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "processingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "shop" TEXT,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "metadata" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "shop" TEXT,
    "source" TEXT,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "stack" TEXT,

    CONSTRAINT "AppLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopSettings_shopDomain_key" ON "shopSettings"("shopDomain");

-- CreateIndex
CREATE INDEX "processingJob_shopDomain_idx" ON "processingJob"("shopDomain");

-- CreateIndex
CREATE INDEX "processingJob_jobType_idx" ON "processingJob"("jobType");

-- CreateIndex
CREATE INDEX "processingJob_status_idx" ON "processingJob"("status");

-- CreateIndex
CREATE INDEX "Alert_shop_idx" ON "Alert"("shop");

-- CreateIndex
CREATE INDEX "Alert_level_idx" ON "Alert"("level");

-- CreateIndex
CREATE INDEX "Alert_timestamp_idx" ON "Alert"("timestamp");

-- CreateIndex
CREATE INDEX "AppLog_shop_idx" ON "AppLog"("shop");

-- CreateIndex
CREATE INDEX "AppLog_level_idx" ON "AppLog"("level");

-- CreateIndex
CREATE INDEX "AppLog_category_idx" ON "AppLog"("category");

-- CreateIndex
CREATE INDEX "AppLog_timestamp_idx" ON "AppLog"("timestamp");
