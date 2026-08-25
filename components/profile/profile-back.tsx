"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RETURN_KEY } from "@/components/nav/remember-return";

export function ProfileBack() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Back"
      className="grid size-10 place-items-center rounded-full bg-black/40 backdrop-blur"
      onClick={() => {
        if (typeof window !== "undefined" && sessionStorage.getItem(RETURN_KEY)) {
          router.back();
          return;
        }
        router.push("/discover");
      }}
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
