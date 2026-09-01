import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function migration(name: string) {
  return readFileSync(join(process.cwd(), "supabase", "migrations", name), "utf8");
}

function policy(sql: string, name: string) {
  const match = sql.match(new RegExp(`create policy ${name}[\\s\\S]*?;`, "i"));
  expect(match, `missing policy ${name}`).toBeTruthy();
  return match![0];
}

describe("RLS contract", () => {
  const foundation = migration("00001_foundation.sql");

  it("enables RLS on public tables that hold user data", () => {
    for (const table of ["profile_media", "likes", "moderation_cases", "moderation_actions", "accounts"]) {
      expect(foundation).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("anon cannot read pending media — only approved, owner, or staff", () => {
    const sql = policy(foundation, "media_select");
    expect(sql).toContain("status = 'approved'");
    expect(sql).toContain("p.account_id = auth.uid()");
    expect(sql).toContain("public.is_staff()");
    expect(sql).not.toMatch(/status = 'uploaded'|status = 'pending_review'/);
  });

  it("a user cannot like as someone else", () => {
    const sql = policy(foundation, "likes_insert_own");
    expect(sql).toMatch(/actor_id = auth\.uid\(\)/);
  });

  it("moderation is staff-only", () => {
    expect(policy(foundation, "moderation_cases_staff")).toContain("public.is_staff()");
    expect(policy(foundation, "moderation_actions_staff")).toContain("public.is_staff()");
    expect(foundation).toMatch(/role in \('moderator', 'admin', 'support'\)/);
  });
});

describe("safety ratings RLS", () => {
  const sql = migration("00008_ratings.sql");

  it("enables RLS and keeps ratings on a match", () => {
    expect(sql).toContain("alter table public.ratings enable row level security");
    expect(sql).toContain("constraint ratings_not_self");
    expect(policy(sql, "ratings_insert")).toContain("rater_id = auth.uid()");
    expect(policy(sql, "ratings_select")).toMatch(/account_a = auth\.uid\(\) or m\.account_b = auth\.uid\(\)/);
  });

  it("lets a participant mark the other person’s messages read", () => {
    expect(policy(sql, "messages_update_read")).toContain("sender_id <> auth.uid()");
  });

  it("queues identity as pending only — never self-verified", () => {
    const insert = policy(sql, "verification_insert_own");
    expect(insert).toContain("account_id = auth.uid()");
    expect(insert).toContain("status = 'pending'");
    expect(insert).not.toContain("verified");
  });
});
