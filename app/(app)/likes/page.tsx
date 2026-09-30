import type { Metadata } from "next";
import { LikedMeList } from "@/components/payments/liked-me";

export const metadata: Metadata = {
  title: "Likes you",
  robots: { index: false, follow: false },
};

export default function LikesPage() {
  return <LikedMeList />;
}
