"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ============================================================
// YouPass-style top navigation bars (clone 1:1)
// ============================================================

const NAV_LINKS = [
  { href: "/", label: "🏠 Trang chủ" },
  { href: "/courses", label: "🎓 Khóa học Intensive 7.0" },
  { href: "/luyen-tap", label: "💪 Luyện tập 4 kỹ năng", active: true },
  { href: "/bai-mau", label: "✍️ Bài mẫu Writing 8.0+" },
  { href: "/ket-qua", label: "🏆 Kết quả học viên" },
];

const SKILL_TABS = [
  { href: "/reading", label: "📖 Reading", skill: "reading" },
  { href: "/listening", label: "🎧 Listening", skill: "listening" },
  { href: "/writing", label: "✏️ Writing", skill: "writing" },
  { href: "/speaking", label: "🎤 Speaking", skill: "speaking" },
];

export function YouFatNavbar() {
  const pathname = usePathname();

  const activeSkill = SKILL_TABS.find((t) =>
    pathname.startsWith(t.href)
  )?.skill;

  return (
    <>
      {/* Top announcement bar */}
      <div className="yf-topbar">
        <div className="yf-topbar-inner">
          <span className="yf-logo">
            <span className="yf-logo-you">You</span>
            <span className="yf-logo-fat">Fat</span>
          </span>
          <div className="yf-marquee-wrap">
            <span className="yf-marquee-text">
              ⭐⭐ Nền tảng YouFat được phát triển bởi Trung Tâm IELTS 1984 ⭐⭐
              &nbsp;&nbsp;&nbsp; IELTS 1984 tuyển Giáo Viên IELTS, tìm hiểu ngay! 🔍🔍
            </span>
          </div>
          <div className="yf-topbar-actions">
            <a href="#" className="yf-link-sm">Cách luyện tập FREE</a>
            <a href="#" className="yf-link-sm">👥 Group luyện Writing</a>
            <button className="yf-btn-login">Đăng nhập</button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="yf-mainnav">
        {NAV_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`yf-mainnav-link ${l.active ? "active" : ""}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Skill tab bar */}
      <div className="yf-skilltabs">
        {SKILL_TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`yf-skilltab ${activeSkill === t.skill ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </>
  );
}
