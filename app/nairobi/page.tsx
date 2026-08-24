import type { Metadata } from "next";
import { NairobiHome } from "@/components/nairobi/nairobi-home";

export const metadata: Metadata = {
  title: "Nairobi",
  description: "Discover people around Nairobi. Local discovery, verified.",
};

export default function NairobiPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-4 pt-6">
      <NairobiHome showChrome />
    </main>
  );
}
