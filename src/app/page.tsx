"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { YouFatNavbar } from "@/components/navbar";
import {
  ArrowRight,
  ExternalLink,
} from "lucide-react";

// ============================================================
// YouPass Exact Sparkle / Jelly Bean Decorative Seed Component
// ============================================================
function SparkBean({
  left,
  top,
  color,
  delay = "0s",
  sr = "15deg",
  size = 28,
}: {
  left: string;
  top: string;
  color: string;
  delay?: string;
  sr?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 20"
      width={size}
      height={(size * 20) / 18}
      className="spark pointer-events-none absolute select-none"
      style={{
        left,
        top,
        color,
        animationDelay: delay,
        ["--sr" as string]: sr,
      }}
    >
      <path
        fill="currentColor"
        d="M4.1501 8.11813C5.32131 5.64061 4.10089 2.56324 6.27271 1.02726C8.42374 -0.494613 10.6994 -0.068315 12.2709 0.662792C17.1996 2.95699 19.4326 9.0933 17.0279 14.1785C14.6221 19.2637 8.48936 21.3703 3.56067 19.0761C1.98813 18.345 0.203433 16.8817 0.00877929 14.2675C-0.188062 11.6283 2.9778 10.5935 4.1501 8.11596V8.11813ZM5.32568 10.5121C5.7981 10.7323 6.53079 10.2247 6.94197 9.35581C7.35424 8.48694 7.28753 7.58445 6.81511 7.36533C6.6642 7.29482 6.42799 7.29265 6.14913 7.59421C5.86699 7.89902 6.09336 8.52924 5.89324 8.95229C5.69312 9.37533 5.13321 9.44801 5.07744 9.85804C5.02276 10.2637 5.17586 10.4427 5.32677 10.5121H5.32568Z"
      />
    </svg>
  );
}

const TAB_KEYS: ("free" | "pro" | "intensive")[] = ["free", "pro", "intensive"];

type FeatureTab = (typeof TAB_KEYS)[number];

function FeatureArch({ tab, activeTab }: { tab: FeatureTab; activeTab: FeatureTab }) {
  const baseGradientId = `feature-${tab}-base`;
  const accentGradientId = `feature-${tab}-accent`;
  const path =
    "M331.5 0C514.582 0 663 150.179 663 333.082C663 337.71 662.903 342.317 662.715 346.901H663L663 1623H0L0 346.901H0.285069C0.096874 342.317 0 337.71 0 333.082C0 150.179 148.418 0 331.5 0Z";

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-y-0 right-0 hidden w-[304px] overflow-hidden pointer-events-none transition-opacity duration-300 xl:block ${
        activeTab === tab ? "opacity-100" : "opacity-0"
      }`}
    >
      <svg
        width="663"
        height="1623"
        viewBox="0 0 663 1623"
        fill="none"
        className="absolute top-1/2 w-[610px] -rotate-90 -translate-y-1/2 translate-x-[442px]"
      >
        <path d={path} fill="#D9D9D9" />
        <path d={path} fill={`url(#${baseGradientId})`} />
        {tab !== "free" && <path d={path} fill={`url(#${accentGradientId})`} />}
        <defs>
          <radialGradient
            id={baseGradientId}
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(466.482 963.182 -464.266 1178.01 -117.117 473.249)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.043475" stopColor="#13A62E" />
            <stop offset="1" stopColor="#ECFBE4" />
          </radialGradient>
          {tab === "pro" && (
            <radialGradient
              id={accentGradientId}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(82 36) rotate(45) scale(682.358 838.185)"
            >
              <stop stopColor="#FFC100" />
              <stop offset="0.52" stopColor="#FF3532" />
              <stop offset="1" stopColor="#4B86F4" />
            </radialGradient>
          )}
          {tab === "intensive" && (
            <radialGradient
              id={accentGradientId}
              cx="0"
              cy="0"
              r="1"
              gradientTransform="matrix(176.365 1315.93 -1003.79 1208.3 173 120.5)"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0.043475" stopColor="#FF6D3A" />
              <stop offset="1" stopColor="#FFF0EB" />
            </radialGradient>
          )}
        </defs>
      </svg>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"free" | "pro" | "intensive">("free");
  const [tabProgress, setTabProgress] = useState(0);
  const sec2Ref = useRef<HTMLElement>(null);
  const [sec2InView, setSec2InView] = useState(false);

  useEffect(() => {
    const el = sec2Ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSec2InView(true);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Section 2 Auto-Play Progress Bar: 5s per tab, auto-advances to next tab
  useEffect(() => {
    if (!sec2InView) return;

    const intervalMs = 50;
    const totalDuration = 5000; // 5 seconds per tab (exact YouPass cycle)
    const step = (intervalMs / totalDuration) * 100;

    const timer = setInterval(() => {
      setTabProgress((prev) => {
        if (prev >= 100) {
          setActiveTab((currentTab) => {
            const currentIdx = TAB_KEYS.indexOf(currentTab);
            const nextIdx = (currentIdx + 1) % TAB_KEYS.length;
            return TAB_KEYS[nextIdx];
          });
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [sec2InView]);

  const handleTabSelect = (tab: "free" | "pro" | "intensive") => {
    setActiveTab((current) => {
      if (current === tab) return current;
      setTabProgress(0); // Immediately activate and reset countdown timer
      return tab;
    });
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] flex flex-col text-[#1d1d1f] w-full font-sans">
      {/* 1. Header Navigation */}
      <YouFatNavbar />

      {/* 2. Hero Section (1:1 YouPass Clone) */}
      <section
        className="w-full pt-10 sm:pt-14 pb-16 relative overflow-hidden"
        style={{ background: "linear-gradient(0deg, #FBEFE4 -0.58%, #FFF0EB 72.06%)" }}
      >
        {/* Floating Jelly Bean Sparks (Exact SVG seeds from YouPass) */}
        <SparkBean left="5.5%" top="7%" color="#ffa41b" delay="2.4s" sr="-27deg" size={28} />
        <SparkBean left="89%" top="12%" color="#37c181" delay="1.2s" sr="18deg" size={27} />
        <SparkBean left="11%" top="48%" color="#ff8fa3" delay="0.5s" sr="14deg" size={24} />
        <SparkBean left="92%" top="54%" color="#ffa41b" delay="1.8s" sr="-15deg" size={29} />
        <SparkBean left="4.5%" top="82%" color="#37c181" delay="3.1s" sr="22deg" size={25} />
        <SparkBean left="86%" top="78%" color="#6caef8" delay="2.0s" sr="-18deg" size={27} />

        <div className="w-full max-w-[1304px] mx-auto text-center relative z-10 px-4 sm:px-6 lg:px-8">
          {/* Main Heading with Authentic YouPass Typography and Two-Stage Green Blob Animation */}
          <div className="md:max-w-[713px] max-w-[370px] text-center md:text-[48px] text-[24px] font-bold md:leading-[60px] leading-[34px] tracking-tight relative z-10 mx-auto mb-4">
            <div className="relative inline-block z-10">
              {/* Stage 2: Green SVG Blob sweeps in behind text and highlighted words transition to white */}
              <div className="absolute xl:-top-2.5 xl:-left-[18px] md:-top-2 md:-left-[16px] -left-2 -z-10 xl:w-[466px] xl:h-[133px] md:w-[452px] md:h-[128px] w-[265px] h-[68px] -top-1 pointer-events-none select-none animate-heading-blob">
                <svg
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                  width="569"
                  height="162"
                  viewBox="0 0 569 162"
                  fill="none"
                >
                  <path
                    d="M12.6042 0.625675C1.02316 8.17868 -2.39522 79.3643 1.60106 82.8636C5.59733 86.3629 232.194 84.4592 237.104 86.1788C242.014 87.8984 236.183 160.497 254.104 161.582C272.024 162.667 321.659 161.259 381.604 161.582C443.274 161.914 554.604 158.072 554.604 158.072C563.041 153.925 571.514 89.9268 567.603 86.1788C563.691 82.4308 503.604 86.1788 483.604 86.1788C438.97 86.1788 472.948 4.91681 455.104 3.92752C413.919 1.64413 18.3389 -1.30592 12.6042 0.625675Z"
                    fill="#13A62E"
                  />
                </svg>
              </div>

              {/* Stage 1: Text reveals first with left-to-right wipe */}
              <span className="inline-block relative z-10 animate-heading-text">
                <span className="animate-heading-word">HỌC CHĂM CHỈ</span>
                {" "}
                <span className="text-[#1d1d1f]">NHẤT ĐỊNH</span>
                <br />
                <span className="animate-heading-word">ĐẠT BAND</span>
              </span>
            </div>
          </div>

          <p className="text-[#4b5563] text-[18px] sm:text-[20px] md:text-[24px] md:leading-[34px] max-w-[760px] mx-auto mb-10 sm:mb-12 font-medium animate-fly-up">
            Dù bạn là ai, ở bất cứ đâu - chỉ cần bạn chịu học, YouFat đã chuẩn bị sẵn tất cả để bạn tự học IELTS đúng cách.
          </p>

          {/* 2 Main Action Cards with Artwork & Interactive Hover (1:1 YouPass Clone) */}
          <div className="flex lg:flex-row flex-col lg:gap-10 gap-6 items-center justify-center w-full max-w-[1240px] mx-auto">
            {/* Card 1: Luyện đề IELTS 4 kỹ năng (Flies in from left) */}
            <div className="flex-1 w-full animate-fly-left">
              <div
                className="group relative flex flex-col w-full border-4 border-[#ff6d3a] rounded-[32px] overflow-hidden lg:h-[450px] md:h-[522px] h-[340px] sm:h-[380px] bg-white cursor-pointer transition-all duration-300 hover:shadow-2xl"
                style={{ boxShadow: "0 24px 48px -12px rgba(16, 24, 40, 0.18)" }}
              >
                {/* Header Bar: Warm Peach -> Turns Solid Orange on Hover (sits with z-10 OVER the top of the image) */}
                <p className="md:py-4 py-2.5 px-4 text-xl sm:text-2xl md:text-[30px] md:leading-[38px] font-bold text-center group-hover:text-white text-[#ff6d3a] z-10 bg-[#fff0eb] transition-all duration-200 group-hover:bg-[#ff6d3a] leading-snug">
                  Luyện đề IELTS 4 kỹ năng
                </p>

                {/* Artwork Image Container with Authentic YouPass Mascot Artwork - Positioned ABSOLUTE INSET-0 spanning full card behind header */}
                <Image
                  src="/youpass_card1.webp"
                  alt="Luyện đề IELTS 4 kỹ năng"
                  fill
                  className="absolute inset-0 w-full h-full object-cover object-bottom group-hover:scale-105 transition-transform duration-500"
                  priority
                />

                {/* Frosted Bottom Blur Dock that expands on hover (1:1 Exact YouPass Clone: stays bg-white/60 with backdrop-blur-[20px]) */}
                <div className="flex-1 w-full relative overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 lg:h-[108px] md:h-[102px] h-[90px] group-hover:h-full md:p-6 p-4 flex flex-col justify-between bg-white/60 backdrop-blur-sm group-hover:backdrop-blur-[20px] transition-all duration-300 ease-out z-10 overflow-hidden">
                    {/* Bullet points: hidden by default (max-h-0, opacity-0, translate-y-4), revealed smoothly on hover */}
                    <div className="max-h-0 group-hover:max-h-[9999px] opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 overflow-hidden transition-all duration-300 ease-out md:group-hover:mb-6 group-hover:mb-3 pointer-events-none group-hover:pointer-events-auto">
                      <ul className="space-y-2.5 md:mb-6 mb-3 text-base md:text-[19px] md:leading-[28px] text-[#374151] font-medium text-left">
                        <li className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6d3a] flex-shrink-0" />
                          <span>Luyện với giao diện y như thi thật</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6d3a] flex-shrink-0" />
                          <span>Kho đề chất lượng cập nhật liên tục</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6d3a] flex-shrink-0" />
                          <span>Giải thích đáp án siêu chi tiết</span>
                        </li>
                      </ul>

                      <p className="text-[#1d1d1f] font-bold text-base md:text-[22px] md:leading-[30px] text-left leading-snug">
                        Không chỉ &quot;show&quot; điểm - bạn hiểu sai ở đâu và cách làm cho đúng
                      </p>
                    </div>

                    {/* Button: sits cleanly inside the frosted dock at bottom initially */}
                    <div className="flex-1 flex items-end justify-center group-hover:items-start pt-1">
                      <Link
                        href="/reading"
                        className="text-center inline-flex items-center whitespace-nowrap gap-2 duration-200 rounded-full border border-solid border-[#ff6d3a] bg-[#fff0eb] hover:bg-[#ffe2d6] text-[#ff6d3a] px-8 sm:px-10 py-3 sm:py-3.5 text-xl sm:text-2xl md:text-[28px] md:leading-[36px] font-bold transition-all duration-200 group-hover:bg-[#ff6d3a] group-hover:text-white group-hover:border-transparent pointer-events-auto shadow-xs"
                      >
                        <span>Luyện tập ngay</span>
                        <ArrowRight className="w-6 h-6 stroke-[2.2]" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Khóa học IELTS Intensive 7.0 (Flies in from right) */}
            <div className="flex-1 w-full animate-fly-right">
              <div
                className="group relative flex flex-col w-full border-4 border-[#ff6d3a] rounded-[32px] overflow-hidden lg:h-[450px] md:h-[522px] h-[340px] sm:h-[380px] bg-white cursor-pointer transition-all duration-300 hover:shadow-2xl"
                style={{ boxShadow: "0 24px 48px -12px rgba(16, 24, 40, 0.18)" }}
              >
                {/* Header Bar: Warm Peach -> Turns Solid Orange on Hover */}
                <p className="md:py-4 py-2.5 px-4 text-xl sm:text-2xl md:text-[30px] md:leading-[38px] font-bold text-center group-hover:text-white text-[#ff6d3a] z-10 bg-[#fff0eb] transition-all duration-200 group-hover:bg-[#ff6d3a] leading-snug">
                  Khoá học IELTS Intensive 7.0
                </p>

                {/* Artwork Image Container with Authentic YouPass Mascot on Fire - Spanning absolute inset-0 */}
                <Image
                  src="/youpass_card2.webp"
                  alt="Khoá học IELTS Intensive 7.0"
                  fill
                  className="absolute inset-0 w-full h-full object-cover object-bottom group-hover:scale-105 transition-transform duration-500"
                  priority
                />

                {/* Frosted Bottom Blur Dock that expands on hover (1:1 Exact YouPass Clone: stays bg-white/60 with backdrop-blur-[20px]) */}
                <div className="flex-1 w-full relative overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 lg:h-[108px] md:h-[102px] h-[90px] group-hover:h-full md:p-6 p-4 flex flex-col justify-between bg-white/60 backdrop-blur-sm group-hover:backdrop-blur-[20px] transition-all duration-300 ease-out z-10 overflow-hidden">
                    {/* Bullet points: hidden by default, revealed smoothly on hover */}
                    <div className="max-h-0 group-hover:max-h-[9999px] opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 overflow-hidden transition-all duration-300 ease-out md:group-hover:mb-6 group-hover:mb-3 pointer-events-none group-hover:pointer-events-auto">
                      <ul className="space-y-2.5 md:mb-6 mb-3 text-base md:text-[19px] md:leading-[28px] text-[#374151] font-medium text-left">
                        <li className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6d3a] flex-shrink-0" />
                          <span>Study Plan chi tiết từng tuần</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6d3a] flex-shrink-0" />
                          <span>Trọn bộ bài giảng &amp; bài tập 4 kỹ năng IELTS</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6d3a] flex-shrink-0" />
                          <span>Giáo viên đồng hành 1-1 luôn sẵn sàng giải đáp</span>
                        </li>
                      </ul>

                      <p className="text-[#1d1d1f] font-bold text-base md:text-[22px] md:leading-[30px] text-left leading-snug">
                        Biết chính xác mỗi tuần học gì, không lo lạc hướng trên hành trình đạt band
                      </p>
                    </div>

                    {/* Button */}
                    <div className="flex-1 flex items-end justify-center group-hover:items-start pt-1">
                      <a
                        href="https://ielts1984.vn"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-center inline-flex items-center whitespace-nowrap gap-2 duration-200 rounded-full border border-solid border-[#ff6d3a] bg-[#fff0eb] hover:bg-[#ffe2d6] text-xl sm:text-2xl md:text-[28px] md:leading-[36px] text-[#ff6d3a] px-8 sm:px-10 py-3 sm:py-3.5 font-bold transition-all duration-200 group-hover:bg-[#ff6d3a] group-hover:text-white group-hover:border-transparent pointer-events-auto shadow-xs"
                      >
                        <span>Thoát kẹt band ngay</span>
                        <ArrowRight className="w-6 h-6 stroke-[2.2]" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section 2: Features Showcase (1:1 YouPass Clone) */}
      <section
        ref={sec2Ref}
        id="section-2"
        className="relative z-0 3xl:px-[120px] hd+:px-[100px] md:px-5 px-4 py-16 sm:py-20 flex flex-col items-center justify-center gap-10 bg-[#fbefe4] overflow-hidden"
      >
        {/* Floating Sparks */}
        <SparkBean left="7%" top="18%" color="#6caef8" delay="1.5s" sr="-20deg" size={26} />
        <SparkBean left="91%" top="22%" color="#ffa41b" delay="0.8s" sr="15deg" size={28} />
        <SparkBean left="9%" top="78%" color="#37c181" delay="2.7s" sr="-10deg" size={25} />
        <SparkBean left="89%" top="82%" color="#ff8fa3" delay="1.9s" sr="25deg" size={29} />

        <div className="w-full max-w-[1240px] mx-auto">
          {/* Section Heading with Authentic YouPass Typography and Two-Stage #13A62E Blob Accent */}
          <div className="md:max-w-[713px] max-w-[370px] text-center text-[28px] md:text-[46px] lg:text-[48px] md:leading-[58px] leading-[36px] font-bold relative z-10 mx-auto mb-10 sm:mb-12">
            <div className="relative inline-block z-10">
              {/* Green SVG Blob behind Section 2 heading */}
              <div
                className={`absolute top-0 xl:top-[3px] xl:left-[309px] md:-right-[18px] -z-10 xl:w-[272px] xl:h-[115px] md:w-[277px] md:h-[121px] w-[136px] h-[65px] -right-1 pointer-events-none select-none ${
                  sec2InView ? "animate-sec2-blob" : "opacity-0"
                }`}
              >
                <svg
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                  width="334"
                  height="146"
                  viewBox="0 0 334 146"
                  fill="none"
                >
                  <path
                    d="M22.2761 1.66494C10.6951 9.197 -3.29953 61.4459 0.696748 64.9355C4.69303 68.4251 24.2865 66.2083 29.1966 67.9231C34.1066 69.638 7.27468 139.176 25.1953 140.258C43.1159 141.34 110.497 139.936 170.441 140.258C232.112 140.589 317.426 145.121 317.426 145.121C325.862 140.985 336.732 73.9103 332.82 70.1727C328.909 66.4352 288.695 70.1727 268.695 70.1727C224.061 70.1727 280.539 2.49371 262.695 1.50717C221.509 -0.769887 28.0109 -0.261295 22.2761 1.66494Z"
                    fill="#13A62E"
                  />
                </svg>
              </div>

              <span className={`inline-block relative z-10 ${sec2InView ? "animate-heading-text" : "opacity-0"}`}>
                Chỉ cần bạn <span className={sec2InView ? "animate-sec2-word" : "text-[#13A62E]"}>chăm chỉ</span>
                <br />
                Phần còn lại để <span className={sec2InView ? "animate-sec2-word" : "text-[#13A62E]"}>YouFat lo</span>
              </span>
            </div>
          </div>

          {/* Section 2 Body: Left 3 Interactive Tabs + Right Feature Showcase Card (1:1 YouPass) */}
          <div className="w-full flex flex-col gap-8 mx-auto">
            <div className="flex xl:flex-row flex-col xl:gap-8 gap-6 w-full">
              {/* Left 3 Interactive Tabs (Cascade Unfolding: Tab 1 pops in, Tab 2 & 3 slide out from underneath) */}
              <div className="xl:w-[360px] w-full flex xl:flex-col items-stretch justify-center flex-col sm:flex-row xl:gap-8 gap-4 relative">
                {/* Tab 1: Free (z-30) */}
                <div className={`relative z-30 flex w-full xl:flex-[98] ${sec2InView ? "animate-tab-1" : "opacity-0"}`}>
                  <button
                    type="button"
                    onClick={() => handleTabSelect("free")}
                    onMouseEnter={() => handleTabSelect("free")}
                    className={`p-4 flex gap-4 bg-white overflow-hidden relative rounded-2xl border-2 cursor-pointer text-left w-full h-full transition-all duration-300 ${
                      activeTab === "free"
                        ? "border-[#ff6d3a] shadow-[0_4px_8px_-2px_rgba(16,24,40,0.10),_0_2px_4px_-2px_rgba(16,24,40,0.06)]"
                        : "border-transparent shadow-none hover:bg-white/80"
                    }`}
                  >
                    <div className="w-[30px] h-[30px] relative flex-shrink-0">
                      <Image
                        src="/youpass_tab1_icon.webp"
                        alt="Free icon"
                        width={30}
                        height={30}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <div
                        className={`px-4 py-[3px] rounded-full transition-all duration-300 w-fit text-[16px] leading-5 font-normal ${
                          activeTab === "free"
                            ? "bg-[#13A62E] text-white"
                            : "bg-[#e5f6e9] text-[#13A62E]"
                        }`}
                      >
                        Nếu bạn cần luyện IELTS Free
                      </div>
                      <div className={`text-[16px] leading-5 ${activeTab === "free" ? "font-semibold text-[#1d1d1f]" : "font-normal text-[#374151]"}`}>
                        Kho đề luyện đầy đủ 4 kỹ năng - <span className="whitespace-nowrap">Miễn phí</span>
                      </div>
                    </div>

                    {/* Auto-Play Dynamic Progress Line at Bottom */}
                    <div className="h-1 absolute bottom-0 inset-x-0 overflow-hidden rounded-b-2xl">
                      {activeTab === "free" ? (
                        <div
                          className="h-full bg-gradient-to-r from-[#FF7A00] to-[#13A62E] transition-[width] duration-75 ease-linear"
                          style={{ width: `${tabProgress}%` }}
                        />
                      ) : (
                        <div className="h-full bg-transparent" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Tab 2: Pro (z-20) */}
                <div className={`relative z-20 flex w-full xl:flex-[118] ${sec2InView ? "animate-tab-2" : "opacity-0"}`}>
                  <button
                    type="button"
                    onClick={() => handleTabSelect("pro")}
                    onMouseEnter={() => handleTabSelect("pro")}
                    className={`p-4 flex gap-4 bg-white overflow-hidden relative rounded-2xl border-2 cursor-pointer text-left w-full h-full transition-all duration-300 ${
                      activeTab === "pro"
                        ? "border-[#ff6d3a] shadow-[0_4px_8px_-2px_rgba(16,24,40,0.10),_0_2px_4px_-2px_rgba(16,24,40,0.06)]"
                        : "border-transparent shadow-none hover:bg-white/80"
                    }`}
                  >
                    <div className="w-[30px] h-[30px] relative flex-shrink-0">
                      <Image
                        src="/youpass_tab2_icon.webp"
                        alt="PRO icon"
                        width={30}
                        height={30}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <div
                        className={`px-4 py-[3px] rounded-full transition-all duration-300 w-fit text-[16px] leading-5 font-normal ${
                          activeTab === "pro"
                            ? "bg-[#13A62E] text-white"
                            : "bg-[#e5f6e9] text-[#13A62E]"
                        }`}
                      >
                        Luyện mãi mà vẫn kẹt band
                      </div>
                      <div className={`text-[16px] leading-5 ${activeTab === "pro" ? "font-semibold text-[#1d1d1f]" : "font-normal text-[#374151]"}`}>
                        Thoát kẹt band nhờ luyện IELTS đúng cách, với các tính năng{" "}
                        <Image
                          src="/youpass_pro_badge.webp"
                          alt="YouPass PRO"
                          width={82}
                          height={17}
                          className="w-auto h-[1.15em] inline-block align-middle ml-1"
                        />
                      </div>
                    </div>

                    {/* Auto-Play Dynamic Progress Line at Bottom */}
                    <div className="h-1 absolute bottom-0 inset-x-0 overflow-hidden rounded-b-2xl">
                      {activeTab === "pro" ? (
                        <div
                          className="h-full bg-gradient-to-r from-[#FF7A00] to-[#13A62E] transition-[width] duration-75 ease-linear"
                          style={{ width: `${tabProgress}%` }}
                        />
                      ) : (
                        <div className="h-full bg-transparent" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Tab 3: Intensive (z-10) */}
                <div className={`relative z-10 flex w-full xl:flex-[98] ${sec2InView ? "animate-tab-3" : "opacity-0"}`}>
                  <button
                    type="button"
                    onClick={() => handleTabSelect("intensive")}
                    onMouseEnter={() => handleTabSelect("intensive")}
                    className={`p-4 flex gap-4 bg-white overflow-hidden relative rounded-2xl border-2 cursor-pointer text-left w-full h-full transition-all duration-300 ${
                      activeTab === "intensive"
                        ? "border-[#ff6d3a] shadow-[0_4px_8px_-2px_rgba(16,24,40,0.10),_0_2px_4px_-2px_rgba(16,24,40,0.06)]"
                        : "border-transparent shadow-none hover:bg-white/80"
                    }`}
                  >
                    <div className="w-[30px] h-[30px] relative flex-shrink-0">
                      <Image
                        src="/youpass_tab3_icon.webp"
                        alt="Intensive icon"
                        width={30}
                        height={30}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <div
                        className={`px-4 py-[3px] rounded-full transition-all duration-300 w-fit text-[16px] leading-5 font-normal ${
                          activeTab === "intensive"
                            ? "bg-[#13A62E] text-white"
                            : "bg-[#e5f6e9] text-[#13A62E]"
                        }`}
                      >
                        Nếu bạn cần học IELTS
                      </div>
                      <div className={`text-[16px] leading-5 ${activeTab === "intensive" ? "font-semibold text-[#1d1d1f]" : "font-normal text-[#374151]"}`}>
                        Lộ trình học IELTS Intensive 7.0 toàn diện trong 3-6 tháng
                      </div>
                    </div>

                    {/* Auto-Play Dynamic Progress Line at Bottom */}
                    <div className="h-1 absolute bottom-0 inset-x-0 overflow-hidden rounded-b-2xl">
                      {activeTab === "intensive" ? (
                        <div
                          className="h-full bg-gradient-to-r from-[#FF7A00] to-[#13A62E] transition-[width] duration-75 ease-linear"
                          style={{ width: `${tabProgress}%` }}
                        />
                      ) : (
                        <div className="h-full bg-transparent" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Right Showcase Card with Arched UI Graphic Pattern and Authentic YouPass Screenshots */}
              <div
                className={`flex-1 relative flex flex-col xl:flex-row border-2 bg-white rounded-[32px] overflow-hidden border-[#ff6d3a] justify-between min-h-[631px] md:min-h-[864px] xl:h-[444px] xl:min-h-0 ${
                  sec2InView ? "animate-card-bg" : "opacity-0"
                }`}
              >
                {/* Left Half: Features Description & CTA Button (Compact 296px column matching YouPass) */}
                <div
                  className={`w-full p-6 sm:p-7 xl:my-8 xl:ml-8 xl:w-[296px] xl:p-0 z-20 flex-shrink-0 ${
                    sec2InView ? "animate-card-content-first" : "opacity-0"
                  }`}
                >
                  <div key={activeTab} className="flex flex-col gap-4 animate-card-swap">
                    {activeTab === "free" && (
                      <>
                        <div className="text-[20px] leading-6 font-bold text-[#1d1d1f]">
                          Kho đề luyện đầy đủ 4 kỹ năng - <span className="whitespace-nowrap">Miễn phí</span>
                        </div>
                        <ul className="text-[16px] leading-6 font-normal text-[#4b5563] ml-[1em] list-disc">
                          <li>Luyện với giao diện y như thi thật</li>
                          <li>Kho đề chất lượng cập nhật liên tục</li>
                          <li>Giải thích đáp án siêu chi tiết</li>
                        </ul>
                        <div className="text-[16px] leading-5 font-bold text-[#1d1d1f]">
                          Không chỉ &quot;show&quot; điểm - bạn hiểu sai ở đâu và cách làm cho đúng
                        </div>
                        <Link
                          href="/reading"
                          className="inline-flex items-center gap-2 rounded-[28px] bg-[#ff6d3a] text-white hover:bg-[#ea5520] px-[18px] py-4 text-[16px] leading-5 font-bold w-fit mt-2 transition-colors"
                        >
                          Luyện tập ngay thôi!
                        </Link>
                      </>
                    )}

                    {activeTab === "pro" && (
                      <>
                        <div className="text-[20px] leading-6 font-bold text-[#1d1d1f]">
                          Thoát kẹt band nhờ luyện IELTS đúng cách, với các tính năng{" "}
                          <Image
                            src="/youpass_pro_badge.webp"
                            alt="YouPass PRO"
                            width={76}
                            height={16}
                            className="w-auto h-[1.1em] inline-block align-middle ml-1"
                          />
                        </div>
                        <ul className="text-[16px] leading-6 font-normal text-[#4b5563] ml-[1em] list-disc">
                          <li>Giải thích mọi lỗi sai - bạn biết đang yếu ở đâu, không tự học trong vô vọng</li>
                          <li>Chẻ nhỏ việc luyện đề theo từng bước logic, luyện đúng cách để tiến bộ</li>
                          <li>Có tất cả mọi thứ bạn cần để luyện đề: Dictation, phân tích lập luận, nâng cấp bài</li>
                        </ul>
                        <div className="text-[16px] leading-5 font-bold text-[#1d1d1f]">
                          Không cần mất thời gian tìm thêm tài liệu
                        </div>
                        <Link
                          href="/reading"
                          className="inline-flex items-center gap-2 rounded-[28px] bg-[#ff6d3a] text-white hover:bg-[#ea5520] px-[18px] py-4 text-[16px] leading-5 font-bold w-fit mt-2 transition-colors"
                        >
                          Luyện tập ngay thôi!
                        </Link>
                      </>
                    )}

                    {activeTab === "intensive" && (
                      <>
                        <div className="text-[20px] leading-6 font-bold text-[#1d1d1f]">
                          Lộ trình học IELTS toàn diện với Khoá YouFat Intensive 7.0
                        </div>
                        <ul className="text-[16px] leading-6 font-normal text-[#4b5563] ml-[1em] list-disc">
                          <li>Study Plan chi tiết từng tuần</li>
                          <li>Trọn bộ bài giảng &amp; bài tập 4 kỹ năng IELTS</li>
                          <li>Giáo viên đồng hành 1-1 luôn sẵn sàng giải đáp</li>
                        </ul>
                        <div className="text-[16px] leading-5 font-bold text-[#1d1d1f]">
                          Biết chính xác mỗi tuần học gì, không lo lạc hướng trên hành trình đạt band
                        </div>
                        <a
                          href="https://ielts1984.vn"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-[28px] bg-[#ff6d3a] text-white hover:bg-[#ea5520] px-[18px] py-4 text-[16px] leading-5 font-bold w-fit mt-2 transition-colors"
                        >
                          Tìm hiểu ngay thôi!
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {TAB_KEYS.map((tab) => (
                  <FeatureArch key={tab} tab={tab} activeTab={activeTab} />
                ))}

                {/* Enlarged & Prominent Preview Artwork (Full height, right-aligned) */}
                <div
                  className={`absolute left-1/2 bottom-4 z-10 w-[calc(100%-32px)] aspect-[800/580] -translate-x-1/2 md:w-[730px] xl:left-auto xl:right-0 xl:bottom-0 xl:w-[521px] xl:h-full xl:translate-x-0 flex items-end justify-end pointer-events-none ${
                    sec2InView ? "animate-card-content-first" : "opacity-0"
                  }`}
                >
                  <div key={activeTab} className="relative w-full h-full animate-card-swap flex items-end justify-end">
                    <Image
                      src={
                        activeTab === "free"
                          ? "/youpass_sec2_tab1.webp"
                          : activeTab === "pro"
                          ? "/youpass_sec2_tab2.webp"
                          : "/youpass_sec2_tab3.webp"
                      }
                      alt="Tính năng YouFat"
                      fill
                      className="object-contain object-bottom xl:object-right-bottom"
                      preload
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Statistics Section (Full Width 1240px) */}
      <section className="w-full py-16 bg-white border-t border-gray-150">
        <div className="yf-container px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] uppercase tracking-tight">
              KHO DỮ LIỆU LUYỆN THI HOÀN TOÀN MIỄN PHÍ
            </h2>
            <p className="text-[#4b5563] text-sm mt-2">
              Dữ liệu được chuẩn hóa nguyên bản từ bộ đề Cambridge IELTS 10 - 20
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-[1240px] mx-auto w-full">
            <div className="bg-[#fbf9f5] p-6 sm:p-7 rounded-2xl border border-orange-100 text-center shadow-xs">
              <span className="block text-3xl sm:text-4xl font-black text-[#ff6d3a] mb-1">44</span>
              <span className="text-xs sm:text-sm font-bold text-[#1d1d1f]">Bộ đề Cambridge</span>
              <span className="block text-[11px] text-[#4b5563] mt-1">Từ Cam 10 đến Cam 20</span>
            </div>

            <div className="bg-[#fbf9f5] p-6 sm:p-7 rounded-2xl border border-orange-100 text-center shadow-xs">
              <span className="block text-3xl sm:text-4xl font-black text-[#ff6d3a] mb-1">307</span>
              <span className="text-xs sm:text-sm font-bold text-[#1d1d1f]">Passage & Section</span>
              <span className="block text-[11px] text-[#4b5563] mt-1">Reading & Listening</span>
            </div>

            <div className="bg-[#fbf9f5] p-6 sm:p-7 rounded-2xl border border-orange-100 text-center shadow-xs">
              <span className="block text-3xl sm:text-4xl font-black text-[#ff6d3a] mb-1">3.404</span>
              <span className="text-xs sm:text-sm font-bold text-[#1d1d1f]">Câu hỏi chuẩn hóa</span>
              <span className="block text-[11px] text-[#4b5563] mt-1">Tất cả dạng bài thi thật</span>
            </div>

            <div className="bg-[#fbf9f5] p-6 sm:p-7 rounded-2xl border border-orange-100 text-center shadow-xs">
              <span className="block text-3xl sm:text-4xl font-black text-[#ff6d3a] mb-1">10.000+</span>
              <span className="text-xs sm:text-sm font-bold text-[#1d1d1f]">Lựa chọn & Đáp án</span>
              <span className="block text-[11px] text-[#4b5563] mt-1">So khớp chính xác 100%</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Team Message Section with Helo Mascot Asset */}
      <section className="w-full py-16 sm:py-20 border-t border-gray-200/60" style={{ background: "linear-gradient(180deg, #FBEFE4 0%, #FFF 100%), #FFF" }}>
        <div className="yf-container px-4 sm:px-6">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border-2 border-orange-100 text-center relative overflow-hidden shadow-sm">
            {/* Authentic Team Image */}
            <div className="max-w-[480px] sm:max-w-[560px] mx-auto mb-6 rounded-2xl overflow-hidden shadow-md border border-orange-100">
              <Image
                src="/youpass_team.webp"
                alt="Đội ngũ YouFat"
                width={560}
                height={200}
                className="w-full h-auto object-cover"
                priority
              />
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] mb-4 tracking-tight">
              Lời chào từ đội ngũ YouFat
            </h3>
            <p className="text-[#374151] text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-8">
              YouFat được xây dựng với mong muốn đem đến cho học viên Việt Nam một công cụ tự học và luyện đề Cambridge IELTS chân thực, trực quan và khoa học nhất. Chúng mình tin rằng chỉ cần có sự chăm chỉ kết hợp với phương pháp đúng đắn, bất kỳ ai cũng có thể chinh phục được band điểm mơ ước.
            </p>
            <div className="inline-flex items-center gap-4">
              <Link
                href="/reading"
                className="inline-flex items-center gap-2 bg-[#ff6d3a] hover:bg-[#ea5520] text-white font-bold px-8 py-3.5 rounded-full transition-all text-sm sm:text-base shadow-sm hover:shadow"
              >
                <span>Bắt đầu luyện tập ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="w-full bg-[#1e2329] text-gray-300 py-12 px-4 sm:px-6 mt-auto text-xs sm:text-sm">
        <div className="yf-container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Col 1 */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 relative flex-shrink-0">
                  <Image
                    src="/mascot.webp"
                    alt="YouFat Mascot"
                    width={28}
                    height={28}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-2xl font-black text-white tracking-tight">
                  You<span className="text-[#ff6d3a]">Fat</span>
                </span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
                Nền tảng thi thử và tự học Cambridge IELTS 10-20 trực tuyến. Hệ thống được xây dựng nhằm phục vụ mục đích học tập phi thương mại cho cộng đồng học viên Việt Nam.
              </p>
              <p className="text-gray-500 text-[11px]">
                Tất cả bản quyền đề thi thuộc về Cambridge University Press & Assessment.
              </p>
            </div>

            {/* Col 2 */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-white uppercase text-xs tracking-wider">Kỹ năng luyện thi</h4>
              <ul className="space-y-2 text-gray-400 text-xs">
                <li>
                  <Link href="/reading" className="hover:text-white transition-colors">
                    Luyện đề Reading Cambridge
                  </Link>
                </li>
                <li>
                  <Link href="/listening" className="hover:text-white transition-colors">
                    Luyện đề Listening Cambridge
                  </Link>
                </li>
                <li>
                  <Link href="/writing" className="hover:text-white transition-colors">
                    Luyện đề Writing Cambridge
                  </Link>
                </li>
                <li>
                  <a href="https://ielts1984.vn" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Khóa học IELTS Intensive 7.0
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-white uppercase text-xs tracking-wider">Hỗ trợ & Cộng đồng</h4>
              <ul className="space-y-2 text-gray-400 text-xs">
                <li>
                  <a href="https://rebrand.ly/zalo-youpass-group-hoc-writing" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                    <span>Group Zalo luyện Writing</span>
                    <ExternalLink className="w-3 h-3 text-gray-500" />
                  </a>
                </li>
                <li>
                  <Link href="/huong-dan" className="hover:text-white transition-colors">
                    Hướng dẫn tự học FREE
                  </Link>
                </li>
                <li>
                  <Link href="/dieu-khoan" className="hover:text-white transition-colors">
                    Điều khoản sử dụng
                  </Link>
                </li>
                <li>
                  <Link href="/bao-mat" className="hover:text-white transition-colors">
                    Chính sách bảo mật
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800 text-center text-gray-500 text-[11px]">
            © {new Date().getFullYear()} YouFat. All rights reserved. Developed by IELTS 1984.
          </div>
        </div>
      </footer>

      {/* Floating Mascot Button and Zalo Button (1:1 YouPass Clone) */}
      <div className="fixed z-[1212] right-4 sm:right-6 bottom-20 group">
        <a
          href="https://rebrand.ly/zalo-youpass-group-hoc-writing"
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center justify-end"
        >
          {/* Tooltip slide-out on hover */}
          <div className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none absolute right-[56px] whitespace-nowrap bg-[#13A62E] text-white text-xs font-bold py-1.5 px-3 rounded-full shadow-md">
            Góp ý cho YouFat nè!
          </div>
          {/* Authentic YouPass Mascot Button */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 relative cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-200 drop-shadow-md">
            <Image
              src="/youpass_mascot_float.webp"
              alt="Mascot Feedback"
              fill
              className="object-contain"
            />
          </div>
        </a>
      </div>

      {/* Floating Zalo Button */}
      <div className="fixed z-[1210] right-4 sm:right-6 bottom-4">
        <a
          href="https://rebrand.ly/zalo-youpass-group-hoc-writing"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-11 h-11 sm:w-12 sm:h-12 relative cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-200 drop-shadow-md"
        >
          <Image
            src="/youpass_zalo.webp"
            alt="Zalo Chat"
            fill
            className="object-contain"
          />
        </a>
      </div>
    </div>
  );
}
