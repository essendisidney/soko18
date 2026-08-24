import Link from "next/link";
import { Button } from "@/components/soko/button";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-bg px-6">
      <h1 className="font-display text-4xl tracking-tight">Sign in</h1>
      <p className="mt-3 text-sm text-muted">Auth wires in Phase 03. You can still discover as a guest.</p>
      <Button className="mt-8 w-full" disabled>
        Continue with phone
      </Button>
      <Link href="/discover" className="mt-6 text-center text-sm text-muted">
        Not now
      </Link>
    </main>
  );
}
