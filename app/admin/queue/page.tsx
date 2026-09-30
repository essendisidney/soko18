import { ReviewQueue } from "@/components/admin/review-queue";

export default function AdminQueuePage() {
  return (
    <main className="min-h-dvh bg-bg px-5 py-6 md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Trust & safety</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Review queue</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Flagged profiles and messages first, then selfie checks, photos and new profiles. Every decision is logged.
      </p>
      <ReviewQueue />
    </main>
  );
}
