import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "FitGreen — วิดพื้นทุกวัน แข่งกับเพื่อน",
  description: "นับวิดพื้นด้วยกล้อง แข่งขันกับผู้ใช้อื่นแบบเรียลไทม์",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <Header />
        {children}
      </body>
    </html>
  );
}
