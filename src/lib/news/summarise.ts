import { collapseWhitespace, htmlToPlainText } from "./sanitize.ts";

/**
 * Copyright-safe summarisation.
 *
 * Travel Xchange links to the publisher; it does not republish them. A news
 * post therefore carries a headline, an attribution, a link and at most a
 * short teaser. Two rules follow from that:
 *
 * 1. Nothing is invented. If the feed carries no usable description, the post
 *    ships with no summary and the card falls back to headline and source.
 * 2. Nothing long is copied. A publisher teaser is used only when it is
 *    already short enough to be a teaser; a full article body in the feed is
 *    reduced to its opening sentence rather than stored whole.
 */

export type SummaryKind = "publisher_extract" | "none";

export type ArticleSummary = {
  summary: string | null;
  kind: SummaryKind;
};

/** Longest extract Travel Xchange will store from a publisher description. */
export const maxSummaryLength = 220;

/** Below this, a description is a headline restatement rather than a teaser. */
const minSummaryLength = 40;

function trimToSentence(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  const window = value.slice(0, limit);
  const sentenceEnd = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("? "),
    window.lastIndexOf("! "),
  );

  if (sentenceEnd > minSummaryLength) {
    return window.slice(0, sentenceEnd + 1);
  }

  const wordEnd = window.lastIndexOf(" ");
  const cut = wordEnd > minSummaryLength ? window.slice(0, wordEnd) : window;

  return `${cut.trimEnd()}…`;
}

/**
 * Builds the summary stored on a news post.
 *
 * @param description Publisher description from the feed, HTML or plain.
 * @param title The headline, used to reject descriptions that merely repeat it.
 */
export function buildArticleSummary(
  description: string | null | undefined,
  title: string,
): ArticleSummary {
  const text = collapseWhitespace(htmlToPlainText(description));

  if (!text || text.length < minSummaryLength) {
    return { kind: "none", summary: null };
  }

  const normalisedTitle = collapseWhitespace(title).toLowerCase();

  if (normalisedTitle && text.toLowerCase().startsWith(normalisedTitle)) {
    const remainder = text.slice(normalisedTitle.length).replace(/^[\s\-–—:.]+/, "");

    if (remainder.length < minSummaryLength) {
      return { kind: "none", summary: null };
    }

    return { kind: "publisher_extract", summary: trimToSentence(remainder, maxSummaryLength) };
  }

  return { kind: "publisher_extract", summary: trimToSentence(text, maxSummaryLength) };
}
