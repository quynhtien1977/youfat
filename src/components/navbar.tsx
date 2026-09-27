"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  GraduationCap,
  BookOpen,
  FileText,
  Trophy,
} from "lucide-react";

// ============================================================
// YouPass Navigation Bar (1:1 Clone with Dropdowns & Options)
// ============================================================

export function YouFatNavbar() {
  const pathname = usePathname();
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const coursesTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePracticeMouseEnter = () => {
    if (practiceTimerRef.current) {
      clearTimeout(practiceTimerRef.current);
      practiceTimerRef.current = null;
    }
    if (coursesTimerRef.current) {
      clearTimeout(coursesTimerRef.current);
      coursesTimerRef.current = null;
    }
    setPracticeOpen(true);
    setCoursesOpen(false);
  };

  const handlePracticeMouseLeave = () => {
    practiceTimerRef.current = setTimeout(() => {
      setPracticeOpen(false);
    }, 280);
  };

  const handleCoursesMouseEnter = () => {
    if (coursesTimerRef.current) {
      clearTimeout(coursesTimerRef.current);
      coursesTimerRef.current = null;
    }
    if (practiceTimerRef.current) {
      clearTimeout(practiceTimerRef.current);
      practiceTimerRef.current = null;
    }
    setCoursesOpen(true);
    setPracticeOpen(false);
  };

  const handleCoursesMouseLeave = () => {
    coursesTimerRef.current = setTimeout(() => {
      setCoursesOpen(false);
    }, 280);
  };

  useEffect(() => {
    return () => {
      if (practiceTimerRef.current) clearTimeout(practiceTimerRef.current);
      if (coursesTimerRef.current) clearTimeout(coursesTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const scrollableHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      setIsScrolled(currentScroll > 35);
      setScrollProgress(Math.min((currentScroll / scrollableHeight) * 100, 100));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = pathname === "/";
  const isPractice =
    pathname.startsWith("/reading") ||
    pathname.startsWith("/listening") ||
    pathname.startsWith("/writing") ||
    pathname.startsWith("/speaking");
  const isCourses = pathname.startsWith("/courses");
  const showPracticeOptions = isPractice || practiceOpen;
  const showCourseOptions = !showPracticeOptions && (isCourses || coursesOpen);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[44px] z-40 h-[46px] bg-white"
      />
      <div
        data-scroll-progress
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[44px] z-[60] h-[46px] bg-transparent"
      >
        <div
          className="absolute inset-x-0 bottom-0 h-[4px] origin-left bg-gradient-to-r from-[#ff6d3a] via-[#f7b731] to-[#13a62e] transition-[width] duration-75 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <header
        className={`w-full sticky top-0 z-50 bg-white transition-transform duration-200 ${
          isScrolled ? "-translate-y-[50px] shadow" : "translate-y-0"
        }`}
      >

        {/* Top announcement row remains in layout and slides above the viewport on scroll. */}
        <div className="border-b border-gray-150 bg-white w-full overflow-hidden">
          <div className="w-full max-w-[1512px] mx-auto h-[50px] px-5 2xl:px-0 flex items-center justify-between gap-4">
            {/* Logo with Mascot */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-11 h-11 relative flex-shrink-0">
                <Image
                  src="/mascot.webp"
                  alt="YouFat Mascot"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  priority
                />
              </div>
              <span className="text-[32px] font-black tracking-tight text-[#ff5d38] leading-none">
                You<span className="text-[#ff5d38]">Fat</span>
              </span>
            </Link>

            {/* Marquee ticker directly on clean white background */}
            <div className="hidden md:flex flex-1 overflow-hidden mx-6 max-w-2xl [mask-image:linear-gradient(to_right,transparent,black_32px,black_calc(100%-32px),transparent)]">
              <div className="flex items-center whitespace-nowrap text-sm text-[#1d1d1f] gap-6 overflow-hidden w-full font-bold">
                <div className="animate-marquee-smooth flex items-center gap-4 flex-shrink-0">
                  <span>Nền tảng YouFat được phát triển bởi Trung Tâm IELTS 1984 ⭐⭐</span>
                  <span className="text-gray-300">|</span>
                  <span>🔍🔍 IELTS 1984 tuyển Giáo Viên IELTS, tìm hiểu ngay! 🔍🔍</span>
                  <span className="text-gray-300">|</span>
                  <span>⭐⭐ Luyện thi IELTS Cambridge 10-20 hoàn toàn miễn phí ⭐⭐</span>
                  <span className="text-gray-300">|</span>
                  <span>Học viên khoá Intensive 7.0 tăng 0.5 - 1.5 band sau 10 tuần 🚀</span>
                  <span className="text-gray-300">|</span>
                </div>
                <div className="animate-marquee-smooth flex items-center gap-4 flex-shrink-0" aria-hidden="true">
                  <span>Nền tảng YouFat được phát triển bởi Trung Tâm IELTS 1984 ⭐⭐</span>
                  <span className="text-gray-300">|</span>
                  <span>🔍🔍 IELTS 1984 tuyển Giáo Viên IELTS, tìm hiểu ngay! 🔍🔍</span>
                  <span className="text-gray-300">|</span>
                  <span>⭐⭐ Luyện thi IELTS Cambridge 10-20 hoàn toàn miễn phí ⭐⭐</span>
                  <span className="text-gray-300">|</span>
                  <span>Học viên khoá Intensive 7.0 tăng 0.5 - 1.5 band sau 10 tuần 🚀</span>
                  <span className="text-gray-300">|</span>
                </div>
              </div>
            </div>

            {/* Right Actions - Bold Typography as Requested */}
            <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0 text-sm font-bold">
              <Link
                href="/huong-dan"
                className="text-[#1d1d1f] hover:text-[#ff5d38] font-bold underline decoration-gray-400 underline-offset-4 transition-colors hidden sm:inline"
              >
                Cách luyện tập FREE
              </Link>
              <a
                href="https://rebrand.ly/zalo-youpass-group-hoc-writing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1d1d1f] hover:text-[#ff6d3a] flex items-center gap-1.5 font-bold transition-colors"
              >
                <Image
                  src="/youpass_zalo.webp"
                  alt="Zalo"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                />
                <span className="hidden sm:inline">Group luyện Writing</span>
              </a>
              <button
                type="button"
                className="bg-[#ff6d3a] hover:bg-[#ea5520] text-white px-6 py-2 rounded-full font-bold transition-all shadow-xs cursor-pointer"
              >
                Đăng nhập
              </button>
            </div>
          </div>
        </div>

        {/* 2. Main Ribbon Bar (Mint Green with Black Font & Hover Pills - Exact YouPass Signature) */}
        <nav className={`bg-[#8dd8b5] w-full relative ${showPracticeOptions || showCourseOptions ? "shadow-none" : "shadow-xs"}`}>
          <div className="w-full max-w-[1512px] mx-auto px-5 2xl:px-0">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto xl:overflow-visible py-1.5 scrollbar-none text-sm sm:text-[15px] font-bold">
              {/* 1. Trang chủ */}
              <Link
                href="/"
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  isHome
                    ? "bg-white text-[#ff6d3a] font-bold shadow-xs"
                    : "text-[#1d1d1f] hover:bg-white hover:text-[#ff6d3a] hover:shadow-xs font-bold"
                }`}
              >
                <Home className={`w-3.5 h-3.5 ${isHome ? "text-[#ff6d3a]" : "text-[#1d1d1f]"}`} />
                <span>Trang chủ</span>
              </Link>

              <span className="text-black/20 select-none">|</span>

              {/* 2. Khóa học Intensive 7.0 (with horizontal option row) */}
              <div
                className="relative"
                onMouseEnter={handleCoursesMouseEnter}
                onMouseLeave={handleCoursesMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setCoursesOpen(!coursesOpen)}
                  aria-expanded={coursesOpen}
                  className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    isCourses || coursesOpen
                      ? "relative z-20 -mb-px bg-white text-[#ff6d3a] font-bold rounded-lg shadow-xs"
                      : "text-[#1d1d1f] hover:bg-white hover:text-[#ff6d3a] hover:shadow-xs font-bold"
                  }`}
                >
                  <GraduationCap
                    className={`w-4 h-4 transition-colors ${
                      isCourses || coursesOpen
                        ? "text-[#ff6d3a]"
                        : "text-[#1d1d1f] group-hover:text-[#ff6d3a]"
                    }`}
                  />
                  <span>Khóa học Intensive 7.0</span>
                </button>

              </div>

              <span className="text-black/20 select-none">|</span>

              {/* 3. Luyện tập 4 kỹ năng (Folder tab connecting to horizontal subbar) */}
              <div
                className="relative"
                onMouseEnter={handlePracticeMouseEnter}
                onMouseLeave={handlePracticeMouseLeave}
              >
                {isHome ? (
                  <button
                    type="button"
                    onClick={() => setPracticeOpen((prev) => !prev)}
                    aria-expanded={practiceOpen}
                    className={`group inline-flex items-center gap-2 px-3.5 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      isPractice || practiceOpen
                        ? "relative z-20 -mb-px bg-white text-[#ff6d3a] font-bold rounded-lg shadow-xs"
                        : "text-[#1d1d1f] hover:bg-white hover:text-[#ff6d3a] hover:shadow-xs rounded-full font-bold"
                    }`}
                  >
                    <BookOpen
                      className={`w-4 h-4 transition-colors ${
                        isPractice || practiceOpen ? "text-[#ff6d3a]" : "text-[#1d1d1f] group-hover:text-[#ff6d3a]"
                      }`}
                    />
                    <span>Luyện tập 4 kỹ năng</span>
                  </button>
                ) : (
                  <Link
                    href="/reading"
                    className={`group inline-flex items-center gap-2 px-3.5 py-1.5 transition-all whitespace-nowrap ${
                      isPractice || practiceOpen
                        ? "relative z-20 -mb-px bg-white text-[#ff6d3a] font-bold rounded-lg shadow-xs"
                        : "text-[#1d1d1f] hover:bg-white hover:text-[#ff6d3a] hover:shadow-xs rounded-full font-bold"
                    }`}
                  >
                    <BookOpen
                      className={`w-4 h-4 transition-colors ${
                        isPractice || practiceOpen ? "text-[#ff6d3a]" : "text-[#1d1d1f] group-hover:text-[#ff6d3a]"
                      }`}
                    />
                    <span>Luyện tập 4 kỹ năng</span>
                  </Link>
                )}
              </div>

              <span className="text-black/20 select-none">|</span>

              {/* 4. Bài mẫu Writing 8.0+ */}
              <Link
                href="/writing"
                className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  pathname === "/writing" && !isPractice
                    ? "bg-white text-[#ff5d38] font-bold shadow-xs"
                    : "text-[#1d1d1f] hover:bg-white hover:text-[#ff6d3a] hover:shadow-xs font-bold"
                }`}
              >
                <FileText
                  className={`w-4 h-4 transition-colors ${
                    pathname === "/writing" && !isPractice
                      ? "text-[#ff5d38]"
                      : "text-[#1d1d1f] group-hover:text-[#ff6d3a]"
                  }`}
                />
                <span>Bài mẫu Writing 8.0+</span>
              </Link>

              <span className="text-black/20 select-none">|</span>

              {/* 5. Kết quả học viên */}
              <Link
                href="/ket-qua"
                className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  pathname === "/ket-qua"
                    ? "bg-white text-[#ff5d38] font-bold shadow-xs"
                    : "text-[#1d1d1f] hover:bg-white hover:text-[#ff6d3a] hover:shadow-xs font-bold"
                }`}
              >
                <Trophy
                  className={`w-4 h-4 transition-colors ${
                    pathname === "/ket-qua"
                      ? "text-[#ff5d38]"
                      : "text-[#1d1d1f] group-hover:text-[#ff6d3a]"
                  }`}
                />
                <span>Kết quả học viên</span>
              </Link>
            </div>
          </div>
        </nav>

      {/* 3. Horizontal Secondary Sub-Nav Bar (1:1 Exact YouPass Folder Tab Submenu) */}
      {showPracticeOptions && (
        <div
          data-practice-options
          className="bg-[#FFF8F2] border-b border-[#ebd7cb]/50 w-full transition-all duration-200"
          onMouseEnter={handlePracticeMouseEnter}
          onMouseLeave={handlePracticeMouseLeave}
        >
          <div className="w-full max-w-[1512px] mx-auto">
            <div className="flex items-center justify-start gap-2 sm:gap-3 h-[40px] px-4 xl:px-10 text-xs sm:text-[13px] font-semibold overflow-x-auto scrollbar-none xl:w-[785px] xl:ml-[368px]">
              <Link
                href="/reading"
                className={`flex items-center gap-2 px-2 h-full border-b-[3px] border-solid transition-colors duration-200 ${
                  pathname.startsWith("/reading")
                    ? "border-[#ff6d3a] text-[#ff6d3a] font-bold"
                    : "border-transparent text-gray-700 hover:text-[#ff6d3a] hover:border-[#ff6d3a]"
                }`}
              >
                <div className="w-3.5 h-3.5 relative flex-shrink-0">
                  <Image src="/nav_reading.webp" alt="Reading" width={16} height={16} className="w-full h-full object-contain" />
                </div>
                <span>Reading</span>
              </Link>

              <div className="h-3.5 w-[1px] bg-slate-300"></div>

              <Link
                href="/listening"
                className={`flex items-center gap-2 px-2 h-full border-b-[3px] border-solid transition-colors duration-200 ${
                  pathname.startsWith("/listening")
                    ? "border-[#ff6d3a] text-[#ff6d3a] font-bold"
                    : "border-transparent text-gray-700 hover:text-[#ff6d3a] hover:border-[#ff6d3a]"
                }`}
              >
                <div className="w-3.5 h-3.5 relative flex-shrink-0">
                  <Image src="/nav_listening.webp" alt="Listening" width={16} height={16} className="w-full h-full object-contain" />
                </div>
                <span>Listening</span>
              </Link>

              <div className="h-3.5 w-[1px] bg-slate-300"></div>

              <Link
                href="/writing"
                className={`flex items-center gap-2 px-2 h-full border-b-[3px] border-solid transition-colors duration-200 ${
                  pathname.startsWith("/writing")
                    ? "border-[#ff6d3a] text-[#ff6d3a] font-bold"
                    : "border-transparent text-gray-700 hover:text-[#ff6d3a] hover:border-[#ff6d3a]"
                }`}
              >
                <div className="w-3.5 h-3.5 relative flex-shrink-0">
                  <Image src="/nav_writing.svg" alt="Writing" width={16} height={16} className="w-full h-full object-contain" />
                </div>
                <span>Writing</span>
              </Link>

              <div className="h-3.5 w-[1px] bg-slate-300"></div>

              <Link
                href="/speaking"
                className={`flex items-center gap-2 px-2 h-full border-b-[3px] border-solid transition-colors duration-200 ${
                  pathname.startsWith("/speaking")
                    ? "border-[#ff6d3a] text-[#ff6d3a] font-bold"
                    : "border-transparent text-gray-700 hover:text-[#ff6d3a] hover:border-[#ff6d3a]"
                }`}
              >
                <div className="w-3.5 h-3.5 relative flex-shrink-0">
                  <Image src="/nav_speaking.webp" alt="Speaking" width={16} height={16} className="w-full h-full object-contain" />
                </div>
                <span>Speaking</span>
              </Link>
            </div>
          </div>
        </div>
      )}
      {showCourseOptions && (
        <div
          data-course-options
          className="bg-[#FFF8F2] border-b border-[#ebd7cb]/50 w-full transition-all duration-200"
          onMouseEnter={handleCoursesMouseEnter}
          onMouseLeave={handleCoursesMouseLeave}
        >
          <div className="w-full max-w-[1512px] mx-auto">
            <div className="flex items-center justify-start gap-2 sm:gap-3 h-[40px] px-4 xl:px-10 text-xs sm:text-[13px] font-semibold overflow-x-auto scrollbar-none xl:w-[785px] xl:ml-[118px]">
              <a
                href="https://ielts1984.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 h-full text-gray-700 hover:text-[#ff6d3a] transition-colors whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5 text-[#ff6d3a]" />
                <span>Test đầu vào 4 kỹ năng FREE</span>
              </a>

              <div className="h-3.5 w-px bg-slate-300" />

              <a
                href="https://ielts1984.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 h-full text-gray-700 hover:text-[#ff6d3a] transition-colors whitespace-nowrap"
              >
                <GraduationCap className="w-3.5 h-3.5 text-[#13a62e]" />
                <span>Khóa học Intensive 7.0</span>
              </a>
            </div>
          </div>
        </div>
      )}
      </header>
    </>
  );
}
