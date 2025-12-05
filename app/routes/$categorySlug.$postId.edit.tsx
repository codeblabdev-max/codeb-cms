import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { PostEditor } from "~/components/editor/PostEditor";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/auth.server";
import { sanitizeHTML, postTitleSchema } from "~/lib/security/validation.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { categorySlug, postId } = params;

  if (!postId || !categorySlug) {
    throw new Response("잘못된 요청입니다.", { status: 400 });
  }

  // 게시글 가져오기 (ID 또는 slug로 찾기)
  const post = await db.post.findFirst({
    where: {
      OR: [
        { id: postId },
        { slug: postId }
      ]
    },
    include: {
      menu: true,
      author: {
        select: { id: true, username: true, role: true },
      },
    },
  });

  if (!post) {
    throw new Response("게시글을 찾을 수 없습니다.", { status: 404 });
  }

  // 카테고리 확인
  if (post.menu.slug !== categorySlug) {
    throw new Response("잘못된 카테고리입니다.", { status: 404 });
  }

  // 수정 권한 확인
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const isAdmin = user?.role === "ADMIN";
  const isAuthor = post.authorId === userId;

  if (!isAuthor && !isAdmin) {
    throw new Response("수정 권한이 없습니다.", { status: 403 });
  }

  // 모든 메뉴(카테고리) 가져오기
  const categories = await db.menu.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return {
    post: {
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() || null,
      menu: {
        ...post.menu,
        createdAt: post.menu.createdAt.toISOString(),
        updatedAt: post.menu.updatedAt.toISOString(),
      },
    },
    categories: categories.map(cat => ({
      ...cat,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    })),
    isAdmin,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const { postId } = params;

  if (!postId) {
    return Response.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  // 게시글 확인
  const existingPost = await db.post.findFirst({
    where: {
      OR: [
        { id: postId },
        { slug: postId }
      ]
    },
    include: { menu: true },
  });

  if (!existingPost) {
    return Response.json(
      { error: "게시글을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 수정 권한 확인
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const isAdmin = user?.role === "ADMIN";
  const isAuthor = existingPost.authorId === userId;

  if (!isAuthor && !isAdmin) {
    return Response.json(
      { error: "수정 권한이 없습니다." },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const rawTitle = formData.get("title") as string;
  const rawContent = formData.get("content") as string;
  const categoryId = formData.get("categoryId") as string;
  const isPinned = formData.get("isPinned") === "on";
  const isDraft = formData.get("isDraft") === "true";

  // 유효성 검사
  if (!rawTitle || !rawContent || !categoryId) {
    return Response.json(
      { error: "제목, 내용, 카테고리는 필수입니다." },
      { status: 400 }
    );
  }

  // 제목 검증
  const titleResult = postTitleSchema.safeParse(rawTitle);
  if (!titleResult.success) {
    return Response.json(
      { error: titleResult.error?.errors[0]?.message || "제목이 유효하지 않습니다." },
      { status: 400 }
    );
  }

  // XSS 방지를 위한 콘텐츠 정화
  const title = titleResult.data;
  const content = sanitizeHTML(rawContent);

  // 메뉴(카테고리) 확인
  const menu = await db.menu.findUnique({
    where: { id: categoryId },
  });

  if (!menu) {
    return Response.json(
      { error: "유효하지 않은 카테고리입니다." },
      { status: 400 }
    );
  }

  try {
    // 게시글 수정
    const updatedPost = await db.post.update({
      where: { id: existingPost.id },
      data: {
        title,
        content,
        excerpt: content.slice(0, 200),
        menuId: categoryId,
        isNotice: isAdmin ? isPinned : existingPost.isNotice,
        isPublished: !isDraft,
        publishedAt: !isDraft && !existingPost.publishedAt ? new Date() : existingPost.publishedAt,
      },
    });

    // 임시저장이면 목록으로, 아니면 상세 페이지로 이동
    if (isDraft) {
      return redirect(`/${menu.slug}?message=draft_saved`);
    } else {
      return redirect(`/${menu.slug}/${updatedPost.slug}`);
    }
  } catch (error) {
    console.error("게시글 수정 오류:", error);
    return Response.json(
      { error: "게시글 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

interface LoaderData {
  post: {
    id: string;
    title: string;
    content: string;
    menuId: string;
    isNotice: boolean;
    isPublished: boolean;
    menu: {
      id: string;
      name: string;
      slug: string;
    };
  };
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
  isAdmin: boolean;
}

export default function BoardEditPage() {
  const { post, categories, isAdmin } = useLoaderData<LoaderData>();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ maxWidth: '1450px' }}>
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">글 수정</h1>

        <PostEditor
          post={post}
          categories={categories}
          isAdmin={isAdmin}
          mode="edit"
        />
      </div>
    </div>
  );
}
