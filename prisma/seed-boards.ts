import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding boards...');

  // 기본 게시판 생성
  const boards = [
    {
      name: '공지사항',
      slug: 'notice',
      description: '사이트 공지사항을 확인하세요',
      boardType: 'notice',
      order: 1,
      isActive: true,
      showInMain: true,
      readPermission: 'all',
      writePermission: 'admin',
      commentPermission: 'user',
      useComment: true,
      useNotice: true,
      useAttachment: true,
      postsPerPage: 20,
    },
    {
      name: '자유게시판',
      slug: 'free',
      description: '자유롭게 소통하는 공간입니다',
      boardType: 'general',
      order: 2,
      isActive: true,
      showInMain: true,
      readPermission: 'all',
      writePermission: 'user',
      commentPermission: 'user',
      useComment: true,
      useNotice: true,
      useAttachment: false,
      postsPerPage: 20,
    },
    {
      name: '질문과답변',
      slug: 'qna',
      description: '궁금한 점을 질문하고 답변을 받으세요',
      boardType: 'qna',
      order: 3,
      isActive: true,
      showInMain: true,
      readPermission: 'all',
      writePermission: 'user',
      commentPermission: 'user',
      useComment: true,
      useNotice: false,
      useAttachment: false,
      postsPerPage: 20,
    },
    {
      name: '개발일지',
      slug: 'dev',
      description: '개발 진행 상황과 업데이트 내용',
      boardType: 'general',
      order: 4,
      isActive: true,
      showInMain: true,
      readPermission: 'all',
      writePermission: 'admin',
      commentPermission: 'user',
      useComment: true,
      useNotice: false,
      useAttachment: true,
      postsPerPage: 20,
    },
  ];

  for (const boardData of boards) {
    // 게시판이 이미 있는지 확인
    const existingBoard = await prisma.board.findUnique({
      where: { slug: boardData.slug }
    });

    if (!existingBoard) {
      // 게시판 생성
      const board = await prisma.board.create({
        data: boardData
      });

      console.log(`Created board: ${board.name}`);

      // 메뉴도 함께 생성/업데이트
      const existingMenu = await prisma.menu.findUnique({
        where: { slug: boardData.slug }
      });

      if (existingMenu) {
        // 기존 메뉴가 있으면 boardId 연결
        await prisma.menu.update({
          where: { slug: boardData.slug },
          data: { boardId: board.id }
        });
        console.log(`Updated menu: ${boardData.name}`);
      } else {
        // 메뉴 생성
        await prisma.menu.create({
          data: {
            name: boardData.name,
            slug: boardData.slug,
            description: boardData.description,
            isActive: boardData.isActive,
            boardId: board.id,
            order: boardData.order
          }
        });
        console.log(`Created menu: ${boardData.name}`);
      }
    } else {
      console.log(`Board already exists: ${boardData.name}`);
    }
  }

  console.log('Boards seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });