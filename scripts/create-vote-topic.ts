import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗳️  Creating test vote topic...");

  // 기존 활성 투표 비활성화
  await prisma.voteTopic.updateMany({
    where: { isActive: true },
    data: { isActive: false }
  });

  // 새 투표 주제 생성
  const voteTopic = await prisma.voteTopic.create({
    data: {
      title: "호불호 커뮤니티 - 좋아요 VS 싫어요",
      description: "호불호 커뮤니티에 대한 여러분의 의견을 투표해주세요!",
      isActive: true,
      startDate: new Date(),
      endDate: null // 무제한
    }
  });

  console.log("✅ Vote topic created:", voteTopic);
  console.log("\n📊 Topic ID:", voteTopic.id);
  console.log("📝 Title:", voteTopic.title);
  console.log("✅ Status: Active");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
