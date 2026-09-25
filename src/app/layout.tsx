import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YouFat – Luyện thi IELTS Cambridge 10-20",
  description:
    "Luyện thi IELTS Cambridge Authentic 10-20. 44 đề thi Reading · Listening · Writing. Tự chấm điểm tức thì, Band Score chuẩn.",
};

type LayoutProps<T extends string> = { children: React.ReactNode };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-[#111827]">{children}</body>
    </html>
  );
}
