import React, { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import {
  Share2,
  Bookmark,
  BookmarkCheck,
  Link,
  Twitter,
  Facebook,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface ShareBookmarkProps {
  postId: string;
  postTitle: string;
  postUrl: string;
}

export function ShareBookmark({ postId, postTitle, postUrl }: ShareBookmarkProps) {
  const [isBookmarked, setIsBookmarked] = useState(() => {
    if (typeof window !== "undefined") {
      const bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "[]");
      return bookmarks.includes(postId);
    }
    return false;
  });
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${postUrl}`
    : postUrl;

  const handleBookmark = useCallback(() => {
    if (typeof window === "undefined") return;

    const bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "[]");

    if (isBookmarked) {
      const newBookmarks = bookmarks.filter((id: string) => id !== postId);
      localStorage.setItem("bookmarks", JSON.stringify(newBookmarks));
      setIsBookmarked(false);
    } else {
      bookmarks.push(postId);
      localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
      setIsBookmarked(true);
    }
  }, [postId, isBookmarked]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("클립보드 복사 실패:", err);
    }
  }, [fullUrl]);

  const handleShareTwitter = useCallback(() => {
    const text = encodeURIComponent(postTitle);
    const url = encodeURIComponent(fullUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "width=550,height=420"
    );
  }, [postTitle, fullUrl]);

  const handleShareFacebook = useCallback(() => {
    const url = encodeURIComponent(fullUrl);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
      "width=550,height=420"
    );
  }, [fullUrl]);

  const handleShareKakao = useCallback(() => {
    // 카카오톡 공유 (Kakao SDK 필요)
    if (typeof window !== "undefined" && (window as Window & typeof globalThis & { Kakao?: { Share?: { sendDefault: (options: object) => void }; isInitialized?: () => boolean } }).Kakao?.Share) {
      const Kakao = (window as Window & typeof globalThis & { Kakao: { Share: { sendDefault: (options: object) => void } } }).Kakao;
      Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: postTitle,
          description: "게시글을 확인해보세요!",
          imageUrl: "",
          link: {
            mobileWebUrl: fullUrl,
            webUrl: fullUrl,
          },
        },
        buttons: [
          {
            title: "자세히 보기",
            link: {
              mobileWebUrl: fullUrl,
              webUrl: fullUrl,
            },
          },
        ],
      });
    } else {
      // 카카오톡 SDK가 없으면 URL 복사
      handleCopyLink();
      alert("카카오톡으로 공유하려면 URL을 복사하여 붙여넣기 해주세요.");
    }
  }, [postTitle, fullUrl, handleCopyLink]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: postTitle,
          url: fullUrl,
        });
      } catch (err) {
        // 사용자가 공유를 취소한 경우 무시
        if ((err as Error).name !== "AbortError") {
          console.error("공유 실패:", err);
        }
      }
    } else {
      // Web Share API를 지원하지 않는 경우 링크 복사
      handleCopyLink();
    }
  }, [postTitle, fullUrl, handleCopyLink]);

  return (
    <div className="flex items-center gap-2">
      {/* 공유 버튼 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">공유</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                복사됨
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                링크 복사
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleNativeShare}>
            <Copy className="mr-2 h-4 w-4" />
            공유하기
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareTwitter}>
            <Twitter className="mr-2 h-4 w-4" />
            Twitter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareFacebook}>
            <Facebook className="mr-2 h-4 w-4" />
            Facebook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareKakao}>
            <MessageCircle className="mr-2 h-4 w-4" />
            KakaoTalk
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 북마크 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={handleBookmark}
      >
        {isBookmarked ? (
          <>
            <BookmarkCheck className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="hidden sm:inline">북마크됨</span>
          </>
        ) : (
          <>
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">북마크</span>
          </>
        )}
      </Button>
    </div>
  );
}

ShareBookmark.displayName = "ShareBookmark";
