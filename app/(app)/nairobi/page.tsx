import type { Metadata } from "next";
import { NairobiHome } from "@/components/nairobi/nairobi-home";
import { JsonLd } from "@/components/seo/json-ld";
import { nairobiJsonLd, nairobiMetadata } from "@/lib/profile/seo";

export const metadata: Metadata = nairobiMetadata();

export default function NairobiPage() {
  return (
    <>
      <JsonLd data={nairobiJsonLd()} />
      <NairobiHome />
    </>
  );
}
