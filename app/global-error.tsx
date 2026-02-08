"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 font-sans antialiased">
        <h2 className="text-lg font-semibold">문제가 발생했습니다</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          일시적인 오류일 수 있습니다. 페이지를 새로고침해 주세요.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
