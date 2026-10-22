import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/safety/contact";
import { currentUser } from "@/lib/auth/user";
import { deliverEmergency, type EmergencyKind } from "@/lib/safety/deliver";

const bodySchema = contactSchema;

async function handle(kind: EmergencyKind, request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: kind === "panic" ? "Sign in to send a panic alert." : "Sign in to share location.",
        },
      },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid", message: parsed.error.issues[0]?.message ?? "Contact and location required." } }, { status: 400 });
  }

  const result = await deliverEmergency({
    accountId: user.id,
    kind,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    name: parsed.data.name,
    phone: parsed.data.phone,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    data: {
      delivered: result.delivered,
      kind,
      contact: { name: parsed.data.name, phone: parsed.data.phone },
    },
  });
}

export async function POST(request: Request) {
  return handle("panic", request);
}
