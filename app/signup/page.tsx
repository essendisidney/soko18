import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  return <AuthForm mode="signup" nextParam={one(params.next)} errorParam={one(params.error)} />;
}
