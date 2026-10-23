import type { Instrumentation } from "next";

/**
 * Error monitoring for API routes and pages. Every server error is logged as one JSON line
 * (searchable in Vercel's runtime logs) and, when ERROR_WEBHOOK_URL is set (e.g. a free Slack or
 * Discord webhook), posted there too. Never sends headers, cookies, query strings or bodies.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const message = (err instanceof Error ? err.message : String(err)).slice(0, 300);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  const report = {
    level: "error",
    service: "kutana",
    at: new Date().toISOString(),
    method: request.method,
    path: request.path.split("?")[0],
    route: context.routePath,
    routeType: context.routeType,
    message,
    digest,
  };
  console.error(JSON.stringify(report));
  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `Kutana error · ${report.method} ${report.route} · ${report.message}`, ...report }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Monitoring must never break a request.
  }
};
