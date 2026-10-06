import { CampusCard } from "@/components/growth/campus-card";

export const metadata = { title: "Campus" };

export default function CampusPage() {
  return (
    <div className="pb-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Campus</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Verified students only</h1>
      <p className="mt-2 text-sm text-muted">
        Each campus opens when enough students verify. Then you get a deck of people from your campus only.
      </p>
      <CampusCard />
    </div>
  );
}
