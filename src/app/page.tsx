import { redirect } from "next/navigation";

// Home → redirect to /reading (same as YouPass /luyen-thi)
export default function Home() {
  redirect("/reading");
}
