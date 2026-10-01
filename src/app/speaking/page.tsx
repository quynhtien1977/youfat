import { SpeakingListing } from "@/components/speaking-listing";
import { YouFatNavbar } from "@/components/navbar";

export const metadata = {
  title: "Luyện Speaking IELTS - YouFat (IELTS 1984)",
  description: "Luyện nói Speaking IELTS theo cấu trúc bài luyện của YouPass.",
};

export default function SpeakingPage() {
  return (
    <div className="yf-listing-page">
      <YouFatNavbar />
      <SpeakingListing />
    </div>
  );
}
