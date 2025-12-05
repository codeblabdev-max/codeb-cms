import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/lib/db.server";
import { getUser } from "~/lib/auth.server";
import { CategorySection } from "~/components/home/CategorySection";
import { Sidebar } from "~/components/layout/Sidebar";
import { VoteBox } from "~/components/home/VoteBox";

export const meta: MetaFunction = () => {
  return [
    { title: "Blee CMS - 현대적인 콘텐츠 관리 시스템" },
    { name: "description", content: "Blee CMS로 콘텐츠를 효율적으로 관리하세요" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  
  // Menu 테이블에서 메인 페이지에 표시할 카테고리 가져오기
  const menus = await db.menu.findMany({
    where: {
      isActive: true,
    },
    orderBy: { order: "asc" },
    take: 8,
  });

  // 카테고리별 최신 게시물 가져오기
  const categoryPosts = await Promise.all(
    menus.map(async (menu) => {
      const posts = await db.post.findMany({
        where: {
          menuId: menu.id,
          isPublished: true,
          publishedAt: {
            lte: new Date(),
          },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          publishedAt: true,
          views: true,
          author: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: 6,
      });

      return {
        category: {
          id: menu.id,
          name: menu.name,
          slug: menu.slug,
          order: menu.order
        },
        posts: posts.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          publishedAt: post.publishedAt?.toISOString(),
          viewCount: post.views,
          commentCount: post._count.comments,
          author: {
            name: post.author.name || post.author.email,
          },
        })),
      };
    })
  );

  // 인기 게시물 (조회수 기준)
  const popularPosts = await db.post.findMany({
    where: {
      isPublished: true,
      publishedAt: {
        lte: new Date(),
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      views: true,
      menu: {
        select: {
          slug: true,
        },
      },
    },
    orderBy: { views: "desc" },
    take: 10,
  });

  // 회원 랭킹 (게시글 수 기준)
  const memberRankings = await db.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      _count: {
        select: {
          posts: {
            where: {
              isPublished: true,
            },
          },
        },
      },
    },
    orderBy: {
      posts: {
        _count: "desc",
      },
    },
    take: 10,
  });

  // 오늘의 투표 주제 가져오기
  const todayVoteTopic = await db.voteTopic.findFirst({
    where: {
      isActive: true,
      startDate: {
        lte: new Date()
      },
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    },
    orderBy: { createdAt: "desc" }
  });

  // 투표 통계
  let voteStats = null;
  if (todayVoteTopic) {
    const [likeCount, dislikeCount] = await Promise.all([
      db.vote.count({
        where: { topicId: todayVoteTopic.id, voteType: "LIKE" }
      }),
      db.vote.count({
        where: { topicId: todayVoteTopic.id, voteType: "DISLIKE" }
      })
    ]);

    voteStats = {
      topicId: todayVoteTopic.id,
      title: todayVoteTopic.title,
      description: todayVoteTopic.description,
      likeCount,
      dislikeCount,
      userVote: null // 로더에서는 IP를 정확히 알 수 없으므로 클라이언트에서 처리
    };
  }

  // 최근 댓글
  const recentComments = await db.comment.findMany({
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          name: true,
          username: true,
        },
      },
      post: {
        select: {
          title: true,
          slug: true,
          menu: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return json({
    user,
    voteStats,
    categoryPosts,
    popularPosts: popularPosts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      viewCount: post.views,
      category: post.menu ? { slug: post.menu.slug } : undefined,
    })),
    memberRankings: memberRankings.map((member, index) => ({
      id: member.id,
      name: member.name || "",
      username: member.username || "",
      postCount: member._count.posts,
      rank: index + 1,
    })),
    recentComments: recentComments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        name: comment.author.name || "",
        username: comment.author.username || "",
      },
      post: {
        title: comment.post.title,
        slug: comment.post.slug,
        category: comment.post.menu ? { slug: comment.post.menu.slug } : undefined,
      },
    })),
  });
}

export default function Index() {
  const { user, voteStats, categoryPosts, popularPosts, memberRankings, recentComments } = useLoaderData<typeof loader>();

  const categoryColors = [
    "blue", "green", "purple", "orange", "red", "yellow", "gray", "blue"
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: '1450px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* 메인 콘텐츠 영역 - 왼쪽 */}
          <main className="order-1">
            {/* 오늘의 투표 - 호불호 박스 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">오늘의 투표</h2>
                {/* 어드민 사용자에게만 관리 패널 링크 표시 */}
                {user?.role === "ADMIN" && (
                  <a
                    href="/admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
                    title="관리자 패널 (새 창)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    관리 패널
                  </a>
                )}
              </div>
              {voteStats ? (
                <VoteBox
                  topicId={voteStats.topicId}
                  title={voteStats.title}
                  description={voteStats.description}
                  initialLikeCount={voteStats.likeCount}
                  initialDislikeCount={voteStats.dislikeCount}
                  initialUserVote={voteStats.userVote}
                />
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">현재 진행 중인 투표가 없습니다</p>
                </div>
              )}
            </div>

            {/* 카테고리별 섹션 - 2개씩 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoryPosts.map((section, index) => (
                <CategorySection
                  key={section.category.id}
                  title={section.category.name}
                  slug={section.category.slug}
                  posts={section.posts}
                  color={categoryColors[index % categoryColors.length]}
                />
              ))}
            </div>
          </main>

          {/* 오른쪽 사이드바 - 320px 고정 너비 */}
          <aside className="order-2 lg:w-80">
            <Sidebar
              popularPosts={popularPosts}
              memberRankings={memberRankings}
              recentComments={recentComments}
              position="right"
              user={user}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}