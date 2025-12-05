-- AlterTable
ALTER TABLE "public"."posts" ADD COLUMN     "is_vote_post" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."post_votes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT,
    "vote_type" "public"."VoteType" NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_votes_post_id_idx" ON "public"."post_votes"("post_id");

-- CreateIndex
CREATE INDEX "post_votes_user_id_idx" ON "public"."post_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_votes_post_id_user_id_key" ON "public"."post_votes"("post_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_votes_post_id_ip_address_key" ON "public"."post_votes"("post_id", "ip_address");

-- CreateIndex
CREATE INDEX "posts_is_vote_post_idx" ON "public"."posts"("is_vote_post");

-- AddForeignKey
ALTER TABLE "public"."post_votes" ADD CONSTRAINT "post_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
