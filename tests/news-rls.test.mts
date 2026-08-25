import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

/**
 * Row level security verification for the news tables.
 *
 * Hidden navigation is not access control, so these assertions run as the
 * `authenticated` role against a real PostgreSQL instance and check what the
 * database itself allows.
 *
 * The suite skips when no verification database is reachable, so it never
 * turns into a false failure on a machine that has not set one up. To run it:
 *
 *   createdb travel_xchange_verify
 *   psql -d travel_xchange_verify -f supabase/testing/local-shim.sql
 *   psql -d travel_xchange_verify -f supabase/phase-31-news-ingestion.sql
 *   TX_VERIFY_DATABASE_URL=postgres://postgres@127.0.0.1:5432/travel_xchange_verify npm test
 */

const databaseUrl =
  process.env.TX_VERIFY_DATABASE_URL ??
  "postgres://postgres@127.0.0.1:5433/travel_xchange_verify";

function psql(sql: string) {
  return execFileSync("psql", [databaseUrl, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function isDatabaseAvailable() {
  try {
    psql("select 1");
    return true;
  } catch {
    return false;
  }
}

/** Runs SQL as a signed-in member with the given profile id. */
function asMember(userId: string, sql: string) {
  return psql(
    `set local role authenticated;
     set local "request.jwt.claim.sub" = '${userId}';
     set local "request.jwt.claim.role" = 'authenticated';
     ${sql}`,
  );
}

function expectDenied(userId: string, sql: string) {
  try {
    asMember(userId, sql);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const available = isDatabaseAvailable();
const adminId = "11111111-1111-1111-1111-111111111111";
const memberId = "22222222-2222-2222-2222-222222222222";

describe("news row level security", { skip: available ? false : "no verification database reachable" }, () => {
  if (available) {
    // Fixtures: one platform admin, one ordinary member, one enabled source,
    // one published post and one still awaiting moderation.
    psql(`
      delete from public.news_post_topics;
      delete from public.news_moderation_events;
      delete from public.news_click_events;
      delete from public.news_posts;
      delete from public.news_items;
      delete from public.user_topic_follows;
      delete from public.user_source_follows;
      delete from public.news_ingestion_source_runs;
      delete from public.news_ingestion_runs;
      delete from public.news_sources where slug = 'rls-fixture-source';
      delete from public.profiles where id in ('${adminId}', '${memberId}');
      delete from auth.users where id in ('${adminId}', '${memberId}');

      insert into auth.users (id, email) values
        ('${adminId}', 'admin@example.test'),
        ('${memberId}', 'member@example.test');

      insert into public.profiles (id, full_name, role, verification_tier) values
        ('${adminId}', 'Platform Admin', 'super_admin', 'admin_verified'),
        ('${memberId}', 'Trade Member', 'verified_travel_professional', 'travel_professional_verified');

      insert into public.news_sources (name, slug, publisher, website_url, feed_url, enabled, health_status)
      values ('RLS Fixture', 'rls-fixture-source', 'RLS Fixture', 'https://fixture.test', 'https://fixture.test/rss', true, 'healthy');

      insert into public.news_items (source_id, canonical_url, canonical_url_hash, source_url, title, title_fingerprint)
      select id, 'https://fixture.test/a', 'hash-a', 'https://fixture.test/a', 'Published fixture story', 'fp-a'
      from public.news_sources where slug = 'rls-fixture-source';

      insert into public.news_items (source_id, canonical_url, canonical_url_hash, source_url, title, title_fingerprint)
      select id, 'https://fixture.test/b', 'hash-b', 'https://fixture.test/b', 'Pending fixture story', 'fp-b'
      from public.news_sources where slug = 'rls-fixture-source';

      insert into public.news_posts (news_item_id, source_id, title, canonical_url, publisher, published_at, status, requires_moderation)
      select i.id, i.source_id, i.title, i.canonical_url, 'RLS Fixture', now(), 'published', false
      from public.news_items i where i.canonical_url_hash = 'hash-a';

      insert into public.news_posts (news_item_id, source_id, title, canonical_url, publisher, published_at, status, requires_moderation)
      select i.id, i.source_id, i.title, i.canonical_url, 'RLS Fixture', now(), 'pending_review', true
      from public.news_items i where i.canonical_url_hash = 'hash-b';
    `);
  }

  it("lets an ordinary member read published news only", () => {
    const titles = asMember(memberId, "select title from public.news_posts order by title;");

    assert.equal(titles, "Published fixture story");
  });

  it("shows a platform admin the moderation queue as well", () => {
    const count = asMember(adminId, "select count(*) from public.news_posts;");

    assert.equal(count, "2");
  });

  it("keeps raw ingested items behind the admin boundary", () => {
    assert.equal(asMember(memberId, "select count(*) from public.news_items;"), "0");
    assert.equal(asMember(adminId, "select count(*) from public.news_items;"), "2");
  });

  it("refuses to let an ordinary member add a news source", () => {
    const error = expectDenied(
      memberId,
      `insert into public.news_sources (name, slug, publisher, website_url)
       values ('Rogue', 'rogue-source', 'Rogue', 'https://rogue.test');`,
    );

    assert.match(error ?? "", /row-level security/i);
  });

  it("refuses to let an ordinary member enable or edit a source", () => {
    const error = expectDenied(
      memberId,
      "update public.news_sources set auto_publish = true where slug = 'rls-fixture-source';",
    );

    // The update is either rejected outright or matches no rows; either way the
    // member must not be able to change the source.
    if (!error) {
      const changed = asMember(
        adminId,
        "select auto_publish from public.news_sources where slug = 'rls-fixture-source';",
      );
      assert.equal(changed, "f");
    }
  });

  it("lets a platform admin manage sources", () => {
    asMember(
      adminId,
      "update public.news_sources set auto_publish = true where slug = 'rls-fixture-source';",
    );

    assert.equal(
      asMember(adminId, "select auto_publish from public.news_sources where slug = 'rls-fixture-source';"),
      "t",
    );

    asMember(
      adminId,
      "update public.news_sources set auto_publish = false where slug = 'rls-fixture-source';",
    );
  });

  it("refuses to let a member publish a story out of the moderation queue", () => {
    const error = expectDenied(
      memberId,
      "update public.news_posts set status = 'published' where status = 'pending_review';",
    );

    if (!error) {
      assert.equal(
        asMember(adminId, "select count(*) from public.news_posts where status = 'pending_review';"),
        "1",
      );
    }
  });

  it("keeps one member's follows private to that member", () => {
    asMember(
      memberId,
      `insert into public.user_topic_follows (user_id, topic_id)
       select '${memberId}', id from public.news_topics where slug = 'cruise';`,
    );

    assert.equal(asMember(memberId, "select count(*) from public.user_topic_follows;"), "1");
    assert.equal(asMember(adminId, "select count(*) from public.user_topic_follows;"), "0");
  });

  it("refuses to let a member create a follow for somebody else", () => {
    const error = expectDenied(
      memberId,
      `insert into public.user_topic_follows (user_id, topic_id)
       select '${adminId}', id from public.news_topics where slug = 'aviation';`,
    );

    assert.match(error ?? "", /row-level security/i);
  });

  it("stops a source being enabled without a verified feed URL", () => {
    const error = expectDenied(
      adminId,
      "update public.news_sources set feed_url = null where slug = 'rls-fixture-source';",
    );

    assert.match(error ?? "", /news_sources_enabled_requires_feed/);
  });
});
