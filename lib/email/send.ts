/**
 * Transactional email through Resend's HTTP API. Server only.
 * Needs RESEND_API_KEY and EMAIL_FROM (a sender on a domain verified in Resend).
 * Without them, callers get `false` and must tell the member honestly that email isn't set up yet.
 */

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: { to: string; subject: string; text: string }) {
  if (!isEmailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [input.to], subject: input.subject, text: input.text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
