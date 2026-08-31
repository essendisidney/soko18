import type { Metadata } from "next";
import { NairobiHome } from "@/components/nairobi/nairobi-home";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Nairobi",
  description: "Discover people around Nairobi. Local discovery, verified.",
  openGraph: {
    title: "Nairobi",
    description: "Discover people around Nairobi. Local discovery, verified.",
    url: `${siteUrl()}/nairobi`,
  },
};

export default function NairobiPage() {
  return <NairobiHome />;
}
