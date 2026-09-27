import Link from "next/link";
import Image from "next/image";
import { YouFatNavbar } from "@/components/navbar";
import { Mic, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Luyện Speaking IELTS - YouFat (IELTS 1984)",
  description: "Luyện nói Speaking IELTS theo chủ đề và bộ đề dự đoán sát đề thi thật.",
};

export default function SpeakingPage() {
  const speakingTopics = [
    {
      part: "Part 1",
      title: "Hometown, Work & Study, Accommodation",
      questionsCount: 18,
      level: "Cơ bản",
      desc: "Luyện phản xạ trả lời tự nhiên các câu hỏi mở đầu quen thuộc.",
    },
    {
      part: "Part 2",
      title: "Describe a person who inspired you to achieve a goal",
      questionsCount: 4,
      level: "Trung cấp",
      desc: "Lập dàn ý tư duy 1 phút và phát triển câu trả lời mạch lạc trong 2 phút.",
    },
    {
      part: "Part 3",
      title: "Role models, Education & Societal Impacts",
      questionsCount: 6,
      level: "Nâng cao",
      desc: "Phân tích chiều sâu, mở rộng lập luận đa chiều và dùng từ vựng Band 7.0+.",
    },
    {
      part: "Part 1",
      title: "Daily Habits, Social Media & Free Time",
      questionsCount: 15,
      level: "Cơ bản",
      desc: "Mở rộng ý tưởng với cấu trúc Point - Reason - Example.",
    },
    {
      part: "Part 2",
      title: "Describe an interesting place you visited recently",
      questionsCount: 4,
      level: "Trung cấp",
      desc: "Sử dụng tính từ miêu tả sinh động và thì quá khứ chuẩn xác.",
    },
    {
      part: "Part 3",
      title: "Tourism, Environment & Cultural Heritage",
      questionsCount: 6,
      level: "Nâng cao",
      desc: "Bàn luận các vấn đề xã hội có tính trừu tượng cao.",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--yf-bg-page)" }}>
      <YouFatNavbar />

      <div className="yf-listing-layout">
        {/* Sidebar */}
        <aside className="yf-sidebar">
          <div className="yf-sidebar-group">
            <Link href="/reading" className="yf-sidebar-group-header">
              <Image src="/nav_reading.webp" alt="Reading" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Reading</span>
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/reading" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Bài lẻ
              </Link>
              <Link href="/reading/full" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Full đề
              </Link>
            </div>
          </div>
          <div className="yf-sidebar-group">
            <Link href="/listening" className="yf-sidebar-group-header">
              <Image src="/nav_listening.webp" alt="Listening" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Listening</span>
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/listening" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Bài lẻ
              </Link>
              <Link href="/listening/full" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Full đề
              </Link>
              <Link href="/listening/dictation" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Dictation
              </Link>
            </div>
          </div>
          <div className="yf-sidebar-group">
            <Link href="/writing" className="yf-sidebar-group-header">
              <Image src="/nav_writing.svg" alt="Writing" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Writing</span>
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/writing" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Bài lẻ
              </Link>
            </div>
          </div>
          <div className="yf-sidebar-group">
            <Link href="/speaking" className="yf-sidebar-group-header active">
              <Image src="/nav_speaking.webp" alt="Speaking" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Speaking</span>
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/speaking" className="yf-sidebar-sub-item active">
                <span className="yf-sidebar-radio checked" />
                Luyện nói
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="yf-content">
          <div className="yf-promo">
            <div className="w-9 h-9 relative flex-shrink-0">
              <Image
                src="/mascot.webp"
                alt="YouFat Mascot"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="yf-promo-text">
              <div className="yf-promo-title">
                Luyện IELTS Speaking – Phương pháp Tư duy Bản chất
              </div>
              <div className="yf-promo-subtitle">
                Bộ đề dự đoán bám sát kỳ thi thực tế, phân tích cấu trúc trả lời Band 7.0+
              </div>
            </div>
            <a
              href="https://ielts1984.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="yf-promo-btn"
            >
              Học Speaking 1-1
            </a>
          </div>

          <div className="yf-filter-tabs">
            <span className="yf-filter-tab active">Tất cả đề luyện</span>
            <span className="yf-filter-tab">Part 1</span>
            <span className="yf-filter-tab">Part 2</span>
            <span className="yf-filter-tab">Part 3</span>
          </div>

          <div className="yf-section-header">Bộ đề Speaking theo chủ đề</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {speakingTopics.map((topic, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs hover:border-[#ff6d3a] hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#fff0eb] text-[#ff6d3a]">
                      {topic.part}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {topic.questionsCount} câu hỏi
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#1d1d1f] group-hover:text-[#ff6d3a] transition-colors mb-2">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {topic.desc}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {topic.level}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-bold text-[#ff6d3a] group-hover:underline cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Luyện tập
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
