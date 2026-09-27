"use client";

import { useState } from "react";
import {
  AllFilterTab,
  EmptyListing,
  PracticePromo,
  PracticeSidebar,
  type SpeakingMode,
  type SpeakingPartFilter,
} from "@/components/practice-listing-shared";

export function SpeakingListing() {
  const [mode, setMode] = useState<SpeakingMode>("single");
  const [part, setPart] = useState<SpeakingPartFilter>("all");
  const [sources, setSources] = useState<string[]>([]);
  const label = mode === "shadowing" ? "Shadowing" : mode === "full" ? "Full đề Speaking" : part === "all" ? "Speaking" : `Speaking Part ${part}`;
  const toggleSource = (value: string) => setSources((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  return (
    <div className="yf-listing-layout">
      <PracticeSidebar activeSkill="speaking" speakingMode={mode} speakingPart={part} onSpeakingModeChange={setMode} onSpeakingPartChange={setPart} selectedSourceFilters={sources} onSourceFilterToggle={toggleSource} />
      <main className="yf-content">
        <PracticePromo title="Phá đảo tất cả dạng đề IELTS cùng YouFat!" subtitle={'Chốt đầu vào, mục tiêu, thời gian và nhận Practice Plan được "may đo" miễn phí cho bạn!'} />
        <AllFilterTab />
        <EmptyListing>Chưa có bài {label} trong phạm vi dữ liệu Cambridge 10–20 hiện tại.</EmptyListing>
      </main>
    </div>
  );
}
