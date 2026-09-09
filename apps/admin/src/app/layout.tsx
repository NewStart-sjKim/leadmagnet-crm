import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "리드마그넷 CRM · 관리자",
  description: "리드마그넷 신청 폼 운영 · 성과 관리",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
