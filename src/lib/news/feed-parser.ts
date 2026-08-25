import {
  childText,
  findChild,
  findChildren,
  findDescendant,
  parseXml,
  XmlParseError,
  type XmlNode,
} from "./xml.ts";
import { cleanTitle, htmlToPlainText, safeImageUrl } from "./sanitize.ts";

/** One item as the publisher supplied it, normalised but not yet classified. */
export type ParsedFeedItem = {
  externalGuid: string | null;
  title: string;
  link: string | null;
  description: string;
  author: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
};

export type ParsedFeed = {
  format: "rss" | "atom" | "json";
  title: string;
  homepageUrl: string | null;
  items: ParsedFeedItem[];
};

export class FeedParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedParseError";
  }
}

const maxItemsPerFeed = 200;

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value.trim());

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);

  // A publisher clock that is wildly wrong should not reorder the feed.
  const upperBound = Date.now() + 48 * 60 * 60 * 1000;
  const lowerBound = Date.parse("1995-01-01T00:00:00Z");

  if (date.getTime() > upperBound || date.getTime() < lowerBound) {
    return null;
  }

  return date;
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function extractImage(node: XmlNode, baseUrl: string | null) {
  const enclosure = findChildren(node, "enclosure").find((child) =>
    (child.attributes.type ?? "").startsWith("image/"),
  );

  const mediaContent = findChildren(node, "media:content", "content").find((child) => {
    const type = child.attributes.type ?? "";
    const medium = child.attributes.medium ?? "";
    return medium === "image" || type.startsWith("image/");
  });

  const mediaThumbnail = findChild(node, "media:thumbnail", "thumbnail");
  const itunesImage = findChild(node, "itunes:image");

  const candidate = firstNonEmpty(
    enclosure?.attributes.url,
    mediaContent?.attributes.url,
    mediaThumbnail?.attributes.url,
    itunesImage?.attributes.href,
  );

  return safeImageUrl(candidate, baseUrl ?? undefined);
}

function parseRssItem(node: XmlNode, baseUrl: string | null): ParsedFeedItem | null {
  const title = cleanTitle(childText(node, "title"));
  const guidNode = findChild(node, "guid");
  const linkText = firstNonEmpty(childText(node, "link"), childText(node, "origlink"));

  // A guid is only usable as an identifier when the publisher marks it as one;
  // `isPermaLink="true"` means it is really a URL, which the link already covers.
  const guid = guidNode?.text.trim() || null;
  const guidIsPermalink = (guidNode?.attributes.ispermalink ?? "").toLowerCase() === "true";

  const description = htmlToPlainText(
    firstNonEmpty(
      childText(node, "description"),
      childText(node, "summary"),
      childText(node, "content:encoded"),
    ),
  );

  if (!title && !linkText) {
    return null;
  }

  return {
    author: firstNonEmpty(childText(node, "dc:creator"), childText(node, "author")),
    description,
    externalGuid: guid && !guidIsPermalink ? guid : null,
    imageUrl: extractImage(node, baseUrl),
    link: linkText ?? (guidIsPermalink ? guid : null),
    publishedAt: parseDate(
      firstNonEmpty(
        childText(node, "pubdate"),
        childText(node, "dc:date"),
        childText(node, "date"),
        childText(node, "updated"),
      ),
    ),
    title,
  };
}

function atomLink(node: XmlNode) {
  const links = findChildren(node, "link");
  const alternate = links.find((link) => {
    const rel = (link.attributes.rel ?? "alternate").toLowerCase();
    return rel === "alternate";
  });

  return firstNonEmpty(
    alternate?.attributes.href,
    links.find((link) => link.attributes.href)?.attributes.href,
  );
}

function parseAtomEntry(node: XmlNode, baseUrl: string | null): ParsedFeedItem | null {
  const title = cleanTitle(childText(node, "title"));
  const link = atomLink(node);

  if (!title && !link) {
    return null;
  }

  const authorNode = findChild(node, "author");

  return {
    author: firstNonEmpty(
      authorNode ? childText(authorNode, "name") : null,
      childText(node, "dc:creator"),
    ),
    description: htmlToPlainText(
      firstNonEmpty(childText(node, "summary"), childText(node, "content")),
    ),
    externalGuid: firstNonEmpty(childText(node, "id")),
    imageUrl: extractImage(node, baseUrl),
    link,
    publishedAt: parseDate(
      firstNonEmpty(childText(node, "published"), childText(node, "updated")),
    ),
    title,
  };
}

function parseJsonFeed(body: string): ParsedFeed {
  let payload: unknown;

  try {
    payload = JSON.parse(body);
  } catch {
    throw new FeedParseError("The feed is not valid JSON.");
  }

  if (!payload || typeof payload !== "object") {
    throw new FeedParseError("The JSON feed did not contain an object.");
  }

  const feed = payload as Record<string, unknown>;
  const rawItems = feed.items;

  if (!Array.isArray(rawItems)) {
    throw new FeedParseError("The JSON feed did not contain an items array.");
  }

  const homepageUrl = typeof feed.home_page_url === "string" ? feed.home_page_url : null;

  const items = rawItems.slice(0, maxItemsPerFeed).flatMap((raw): ParsedFeedItem[] => {
    if (!raw || typeof raw !== "object") {
      return [];
    }

    const item = raw as Record<string, unknown>;
    const title = cleanTitle(typeof item.title === "string" ? item.title : "");
    const link = typeof item.url === "string" ? item.url : null;

    if (!title && !link) {
      return [];
    }

    const author = item.author as Record<string, unknown> | undefined;

    return [
      {
        author:
          typeof author?.name === "string"
            ? author.name
            : typeof item.author === "string"
              ? item.author
              : null,
        description: htmlToPlainText(
          typeof item.summary === "string"
            ? item.summary
            : typeof item.content_text === "string"
              ? item.content_text
              : typeof item.content_html === "string"
                ? item.content_html
                : "",
        ),
        externalGuid: typeof item.id === "string" ? item.id : null,
        imageUrl: safeImageUrl(
          typeof item.image === "string" ? item.image : null,
          homepageUrl ?? undefined,
        ),
        link,
        publishedAt: parseDate(
          typeof item.date_published === "string"
            ? item.date_published
            : typeof item.date_modified === "string"
              ? item.date_modified
              : null,
        ),
        title,
      },
    ];
  });

  return {
    format: "json",
    homepageUrl,
    items,
    title: typeof feed.title === "string" ? cleanTitle(feed.title) : "",
  };
}

/**
 * Parses an RSS 2.0, RSS 1.0/RDF, Atom or JSON Feed document.
 *
 * The feed format is detected from the document itself rather than trusted
 * from the source configuration, because publishers change format without
 * changing their endpoint.
 */
export function parseFeed(body: string): ParsedFeed {
  const trimmed = body.trim();

  if (!trimmed) {
    throw new FeedParseError("The feed response was empty.");
  }

  if (trimmed.startsWith("{")) {
    return parseJsonFeed(trimmed);
  }

  let document: XmlNode;

  try {
    document = parseXml(trimmed);
  } catch (error) {
    if (error instanceof XmlParseError) {
      throw new FeedParseError(error.message);
    }

    throw new FeedParseError("The feed could not be parsed as XML.");
  }

  const atomRoot = findChild(document, "feed");

  if (atomRoot) {
    const homepageUrl = atomLink(atomRoot);
    const entries = findChildren(atomRoot, "entry").slice(0, maxItemsPerFeed);

    return {
      format: "atom",
      homepageUrl,
      items: entries
        .map((entry) => parseAtomEntry(entry, homepageUrl))
        .filter((item): item is ParsedFeedItem => item !== null),
      title: cleanTitle(childText(atomRoot, "title")),
    };
  }

  const rssRoot = findChild(document, "rss", "rdf:rdf");

  if (rssRoot) {
    const channel = findChild(rssRoot, "channel") ?? rssRoot;
    const homepageUrl = firstNonEmpty(childText(channel, "link"));

    // RSS 1.0 keeps items as siblings of the channel rather than inside it.
    const itemNodes = [...findChildren(channel, "item"), ...findChildren(rssRoot, "item")].slice(
      0,
      maxItemsPerFeed,
    );

    return {
      format: "rss",
      homepageUrl,
      items: itemNodes
        .map((item) => parseRssItem(item, homepageUrl))
        .filter((item): item is ParsedFeedItem => item !== null),
      title: cleanTitle(childText(channel, "title")),
    };
  }

  // Some publishers serve a bare <channel> or a namespaced root.
  const looseChannel = findDescendant(document, "channel");

  if (looseChannel) {
    const homepageUrl = firstNonEmpty(childText(looseChannel, "link"));

    return {
      format: "rss",
      homepageUrl,
      items: findChildren(looseChannel, "item")
        .slice(0, maxItemsPerFeed)
        .map((item) => parseRssItem(item, homepageUrl))
        .filter((item): item is ParsedFeedItem => item !== null),
      title: cleanTitle(childText(looseChannel, "title")),
    };
  }

  throw new FeedParseError(
    "The response is not an RSS, Atom or JSON feed. Check that the URL points at a feed endpoint rather than a web page.",
  );
}
