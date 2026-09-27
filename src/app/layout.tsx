import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YouFat – Luyện thi IELTS Cambridge 10-20",
  description:
    "Luyện thi IELTS Cambridge Authentic 10-20. 44 đề thi Reading · Listening · Writing. Tự chấm điểm tức thì, Band Score chuẩn.",
};

type LayoutProps = { children: React.ReactNode };

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html
      lang="vi"
      className={`${nunito.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full bg-[#fbf9f5] text-[#1e293b] font-sans antialiased">{children}</body>
    </html>
  );
}
