-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('LIKE', 'DISLIKE');

-- CreateTable
CREATE TABLE "public"."vote_topics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vote_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."votes" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "vote_type" "public"."VoteType" NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "votes_topic_id_idx" ON "public"."votes"("topic_id");

-- CreateIndex
CREATE INDEX "votes_user_id_idx" ON "public"."votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_topic_id_user_id_key" ON "public"."votes"("topic_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_topic_id_ip_address_key" ON "public"."votes"("topic_id", "ip_address");

-- AddForeignKey
ALTER TABLE "public"."votes" ADD CONSTRAINT "votes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."vote_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
