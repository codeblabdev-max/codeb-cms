import { json, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { getUser } from "~/lib/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const formData = await request.formData();
  const topicId = formData.get("topicId") as string;
  const voteType = formData.get("voteType") as "LIKE" | "DISLIKE";

  if (!topicId || !voteType) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  // 사용자 확인
  const user = await getUser(request);

  // IP 주소 가져오기 (비회원용)
  const ipAddress = request.headers.get("x-forwarded-for") ||
                    request.headers.get("x-real-ip") ||
                    "unknown";

  try {
    // 이미 투표했는지 확인
    const existingVote = await db.vote.findFirst({
      where: {
        topicId,
        OR: [
          { userId: user?.id },
          { ipAddress: user ? undefined : ipAddress }
        ]
      }
    });

    if (existingVote) {
      // 같은 투표면 취소, 다른 투표면 변경
      if (existingVote.voteType === voteType) {
        // 투표 취소
        await db.vote.delete({
          where: { id: existingVote.id }
        });
        return json({ success: true, action: "removed", voteType: null });
      } else {
        // 투표 변경
        await db.vote.update({
          where: { id: existingVote.id },
          data: { voteType }
        });
        return json({ success: true, action: "changed", voteType });
      }
    }

    // 새 투표 생성
    await db.vote.create({
      data: {
        topicId,
        voteType,
        userId: user?.id,
        ipAddress: user ? null : ipAddress
      }
    });

    return json({ success: true, action: "added", voteType });
  } catch (error) {
    console.error("Vote error:", error);
    return json({ error: "Failed to process vote" }, { status: 500 });
  }
}

// GET: 투표 통계 조회
export async function loader({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const topicId = url.searchParams.get("topicId");

  if (!topicId) {
    return json({ error: "Missing topicId" }, { status: 400 });
  }

  const user = await getUser(request);
  const ipAddress = request.headers.get("x-forwarded-for") ||
                    request.headers.get("x-real-ip") ||
                    "unknown";

  try {
    // 투표 통계
    const [likeCount, dislikeCount, userVote] = await Promise.all([
      db.vote.count({
        where: { topicId, voteType: "LIKE" }
      }),
      db.vote.count({
        where: { topicId, voteType: "DISLIKE" }
      }),
      db.vote.findFirst({
        where: {
          topicId,
          OR: [
            { userId: user?.id },
            { ipAddress: user ? undefined : ipAddress }
          ]
        },
        select: { voteType: true }
      })
    ]);

    return json({
      likeCount,
      dislikeCount,
      userVote: userVote?.voteType || null
    });
  } catch (error) {
    console.error("Vote stats error:", error);
    return json({ error: "Failed to get vote stats" }, { status: 500 });
  }
}
