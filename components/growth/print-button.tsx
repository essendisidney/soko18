"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-[#070708] px-4 py-2 text-white">
      Print
    </button>
  );
}
