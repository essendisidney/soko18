import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  return <AuthForm mode="login" nextParam={one(params.next)} errorParam={one(params.error)} />;
}
