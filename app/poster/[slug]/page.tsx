import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicCampusBoard } from "@/lib/campus/board";
import { posterQrSvg } from "@/lib/campus/poster";
import { raceUrl } from "@/lib/campus/race";
import { CAMPUS_SLUG } from "@/lib/campus/shared";
import { displayLink } from "@/lib/share/prompt-card";
import { siteUrl } from "@/lib/site";
import { PrintButton } from "@/components/growth/print-button";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Campus poster", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string }> };

/**
 * A printable A4 poster for a campus noticeboard: one question, one QR code to the campus race.
 * No numbers on paper (they'd go stale); the live count is one scan away. Universities only.
 */
export default async function PosterPage({ params }: Props) {
  const { slug } = await params;
  if (!CAMPUS_SLUG.test(slug)) notFound();
  const row = (await publicCampusBoard()).find((r) => r.slug === slug);
  if (!row) notFound();
  const url = raceUrl(siteUrl(), row.slug);
  const qr = await posterQrSvg(url);
  const open = row.status === "live";

  return (
    <main className="poster mx-auto flex min-h-dvh max-w-[210mm] flex-col bg-white px-[14mm] py-[14mm] text-[#070708]">
      <style>{`@page { size: A4; margin: 0 } @media print { .no-print { display: none } body { background: #fff } }`}</style>
      <div className="no-print mb-6 flex items-center justify-between rounded-xl bg-[#f3efe6] px-4 py-3 text-sm">
        <span>Print on A4. Only put it up where students 18+ will see it, and where posters are allowed.</span>
        <PrintButton />
      </div>

      <div className="flex items-center gap-3">
        <span className="grid size-[11mm] place-items-center rounded-[3mm] bg-[#d4b56a] text-[22px] font-black">K</span>
        <span className="text-[22px] font-black tracking-[0.08em] italic">KUTANA</span>
      </div>
      <div className="mt-[8mm] h-[2mm] w-[30mm] bg-[#d4b56a]" />
      <h1 className="mt-[8mm] font-display text-[76px] leading-[1] tracking-tight">
        {open ? `${row.shortName} is open.` : `Is ${row.shortName} open yet?`}
      </h1>
      <p className="mt-[6mm] max-w-[160mm] text-[21px] leading-snug">
        {open
          ? `Verified ${row.shortName} students get a deck of people from their own campus.`
          : `Dating for ${row.shortName} students opens when ${row.target} of you verify with your student email.`}
      </p>

      <div className="mt-[10mm] flex items-center gap-[10mm]">
        <div className="size-[82mm] shrink-0" aria-label={`QR code for ${displayLink(url)}`} dangerouslySetInnerHTML={{ __html: qr }} />
        <div>
          <p className="text-[30px] leading-tight font-semibold">{open ? "Scan to join" : "Scan to see the race"}</p>
          <p className="mt-2 text-[15px] break-all">{displayLink(url)}</p>
        </div>
      </div>

      <ol className="mt-[10mm] grid grid-cols-3 gap-[6mm] text-[16px] leading-snug">
        <li>
          <p className="text-[28px] font-semibold text-[#b8964a]">1</p>
          Scan and make a profile. One photo is enough.
        </li>
        <li>
          <p className="text-[28px] font-semibold text-[#b8964a]">2</p>
          Verify with your student email. Nobody sees it.
        </li>
        <li>
          <p className="text-[28px] font-semibold text-[#b8964a]">3</p>
          {open ? "Swipe your campus deck. Sundays 8pm is live night." : `At ${row.target}, ${row.shortName} opens. Launch night is that Sunday, 8pm.`}
        </li>
      </ol>

      <p className="mt-auto border-t border-[#070708]/15 pt-[5mm] text-[14px]">
        18+ only · No sponsors, no selling · Free to join · Pay with M-Pesa only if you want extras
      </p>
    </main>
  );
}
