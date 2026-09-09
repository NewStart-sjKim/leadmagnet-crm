import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "리드마그넷 폼", robots: { index: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
