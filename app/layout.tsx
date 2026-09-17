import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Pretendard는 Google Fonts에 없어 폰트 파일을 직접 포함해 self-host 한다 (가변 폰트 1종).
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "영업 지원 헬프데스크",
  description: "영업사원의 문의·요청을 접수하고 영업관리팀에 연결하는 사내 헬프데스크",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="flex min-h-[100dvh] flex-col">{children}</body>
    </html>
  );
}
