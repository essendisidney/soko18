import { createPaymentIntent } from "@/lib/payments/intent";

export async function requestBoost(requestedProfileId?: string | null) {
  return createPaymentIntent({ kind: "boost", profileId: requestedProfileId });
}
