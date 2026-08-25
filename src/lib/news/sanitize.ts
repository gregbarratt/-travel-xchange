/**
 * Text handling for untrusted feed content.
 *
 * Feed descriptions arrive as HTML written by someone else. Travel Xchange
 * never renders that HTML: every string that reaches the database has already
 * been reduced to plain text here, so a hostile `<script>`, an event handler
 * attribute or a `javascript:` URL cannot survive as markup.
 */

const htmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  pound: "£",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
};

function decodeHtmlEntities(value: string) {
  return value.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, entity: string) => {
      if (entity.startsWith("#")) {
        const isHex = entity[1] === "x" || entity[1] === "X";
        const codePoint = Number.parseInt(
          isHex ? entity.slice(2) : entity.slice(1),
          isHex ? 16 : 10,
        );

        if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) {
          return "";
        }

        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return "";
        }
      }

      return htmlEntities[entity.toLowerCase()] ?? "";
    },
  );
}

/** Collapses runs of whitespace and strips control characters. */
export function collapseWhitespace(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips markup and collapses whitespace, dropping the contents of elements
 * that never carry readable copy.
 */
export function htmlToPlainText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const withoutDangerousBlocks = value
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const withBreaks = withoutDangerousBlocks
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");

  return collapseWhitespace(decodeHtmlEntities(withBreaks));
}

/** Normalises a title: markup removed, whitespace collapsed, length bounded. */
export function cleanTitle(value: string | null | undefined, maxLength = 300) {
  const text = htmlToPlainText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Accepts an image URL only when it is an absolute https/http URL. Feed
 * descriptions are a common vector for `javascript:` and `data:` URLs, and a
 * poisoned image URL must never reach an `img` tag.
 */
export function safeImageUrl(value: string | null | undefined, baseUrl?: string) {
  if (!value) {
    return null;
  }

  try {
    const url = baseUrl ? new URL(value, baseUrl) : new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
