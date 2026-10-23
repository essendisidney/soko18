import type { Metadata } from "next";
import { DropList } from "@/components/drop/drop-list";

export const metadata: Metadata = {
  title: "Today’s picks",
  robots: { index: false, follow: false },
};

export default function DropPage() {
  return <DropList />;
}
