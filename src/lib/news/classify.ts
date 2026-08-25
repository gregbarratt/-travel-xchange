/**
 * Deterministic classification for ingested trade news.
 *
 * Rules run first and carry the confidence they earned. One article regularly
 * belongs to several topics at once - a Royal Caribbean announcement is Cruise
 * *and* Supplier Updates - so this returns every topic that matched rather
 * than forcing a single category.
 *
 * No model is called. The rules below are cheap, auditable and stable, which
 * matters more for a trade feed than the extra recall a classifier would add.
 */

export type TopicMatch = {
  slug: string;
  confidence: number;
};

export type Sensitivity = "routine" | "sensitive" | "high_risk";

export type Classification = {
  topics: TopicMatch[];
  sensitivity: Sensitivity;
  /** Highest topic confidence, or 0 when nothing matched. */
  confidence: number;
  matchedCompanyIds: string[];
};

type TopicRule = {
  slug: string;
  /** Weight added per distinct matching term. */
  weight: number;
  terms: string[];
};

const topicRules: TopicRule[] = [
  {
    slug: "cruise",
    terms: [
      "cruise",
      "cruising",
      "cruise line",
      "shipboard",
      "sailings",
      "maiden voyage",
      "river cruise",
      "ocean cruise",
      "msc cruises",
      "royal caribbean",
      "carnival",
      "norwegian cruise",
      "celebrity cruises",
      "p&o cruises",
      "cunard",
      "princess cruises",
      "virgin voyages",
      "viking",
      "clia",
    ],
    weight: 0.3,
  },
  {
    slug: "aviation",
    terms: [
      "airline",
      "airlines",
      "airport",
      "aviation",
      "flight",
      "flights",
      "aircraft",
      "route launch",
      "new route",
      "iata",
      "civil aviation authority",
      "british airways",
      "easyjet",
      "ryanair",
      "jet2",
      "virgin atlantic",
      "emirates",
      "tui airways",
      "heathrow",
      "gatwick",
      "long-haul route",
    ],
    weight: 0.3,
  },
  {
    slug: "tour-operators",
    terms: [
      "tour operator",
      "operator",
      "package holiday",
      "packages",
      "tui",
      "jet2holidays",
      "on the beach",
      "hays travel",
      "abta member",
      "escorted tour",
      "itinerary launch",
    ],
    weight: 0.28,
  },
  {
    slug: "hotels",
    terms: [
      "hotel",
      "hotels",
      "resort",
      "resorts",
      "accor",
      "marriott",
      "hilton",
      "ihg",
      "radisson",
      "all-inclusive",
      "property opening",
      "room nights",
    ],
    weight: 0.28,
  },
  {
    slug: "luxury",
    terms: [
      "luxury",
      "five-star",
      "ultra-luxury",
      "premium travel",
      "first class",
      "villa",
      "private jet",
      "bespoke travel",
    ],
    weight: 0.25,
  },
  {
    slug: "travel-technology",
    terms: [
      "technology",
      "platform",
      "booking engine",
      "api",
      "artificial intelligence",
      "ai-powered",
      "software",
      "gds",
      "nde",
      "ndc",
      "payments",
      "fintech",
      "crm",
      "automation",
      "startup funding",
    ],
    weight: 0.28,
  },
  {
    slug: "supplier-updates",
    terms: [
      "launches",
      "launch",
      "announces",
      "announcement",
      "unveils",
      "introduces",
      "commission",
      "incentive",
      "trade offer",
      "agent offer",
      "fam trip",
      "familiarisation",
      "brochure",
      "campaign",
      "partnership",
    ],
    weight: 0.22,
  },
  {
    slug: "uk-travel",
    terms: [
      "uk",
      "britain",
      "british",
      "england",
      "scotland",
      "wales",
      "northern ireland",
      "london",
      "manchester",
      "birmingham",
      "staycation",
    ],
    weight: 0.22,
  },
  {
    slug: "europe",
    terms: [
      "europe",
      "european",
      "spain",
      "greece",
      "italy",
      "portugal",
      "france",
      "croatia",
      "cyprus",
      "turkey",
      "canary islands",
      "balearics",
      "schengen",
      "eu ",
      "ees",
      "etias",
    ],
    weight: 0.22,
  },
  {
    slug: "usa",
    terms: [
      "usa",
      "united states",
      "america",
      "american",
      "florida",
      "california",
      "new york",
      "las vegas",
      "orlando",
      "esta",
    ],
    weight: 0.22,
  },
  {
    slug: "long-haul",
    terms: [
      "long-haul",
      "long haul",
      "caribbean",
      "asia",
      "thailand",
      "japan",
      "australia",
      "new zealand",
      "dubai",
      "middle east",
      "africa",
      "south america",
      "indian ocean",
      "maldives",
    ],
    weight: 0.22,
  },
  {
    slug: "regulation",
    terms: [
      "atol",
      "abta",
      "regulation",
      "regulator",
      "package travel regulations",
      "consumer protection",
      "compliance",
      "licence",
      "licensing",
      "legislation",
      "ruling",
      "court",
      "fine",
      "refund rules",
      "trading standards",
    ],
    weight: 0.3,
  },
  {
    slug: "disruption",
    terms: [
      "strike",
      "strikes",
      "industrial action",
      "cancelled",
      "cancellation",
      "delays",
      "disruption",
      "grounded",
      "closure",
      "evacuation",
      "wildfire",
      "hurricane",
      "earthquake",
      "storm",
      "flooding",
      "volcano",
      "travel advice",
      "advisory",
      "outbreak",
    ],
    weight: 0.32,
  },
  {
    slug: "training-webinars",
    terms: [
      "training",
      "webinar",
      "academy",
      "e-learning",
      "elearning",
      "specialist programme",
      "masterclass",
      "workshop",
      "roadshow",
      "certification",
      "upskilling",
    ],
    weight: 0.3,
  },
  {
    slug: "regional-support",
    terms: ["bdm", "business development manager", "regional support", "trade support team"],
    weight: 0.3,
  },
];

type SensitivityRule = {
  level: Exclude<Sensitivity, "routine">;
  terms: string[];
};

const sensitivityRules: SensitivityRule[] = [
  {
    level: "high_risk",
    terms: [
      "collapse",
      "collapses",
      "ceases trading",
      "ceased trading",
      "insolvency",
      "insolvent",
      "administration",
      "administrators",
      "liquidation",
      "bankruptcy",
      "terror",
      "terrorist",
      "attack",
      "shooting",
      "explosion",
      "crash",
      "crashed",
      "died",
      "death",
      "deaths",
      "killed",
      "fatal",
      "missing",
      "hijack",
      "kidnap",
      "war",
      "airstrike",
      "coup",
      "evacuated",
      "state of emergency",
    ],
  },
  {
    level: "sensitive",
    terms: [
      "allegation",
      "alleged",
      "accused",
      "lawsuit",
      "legal action",
      "sues",
      "investigation",
      "fraud",
      "scam",
      "data breach",
      "cyber attack",
      "cyberattack",
      "ransomware",
      "sanction",
      "travel ban",
      "restrictions",
      "quarantine",
      "outbreak",
      "recall",
      "redundancies",
      "job cuts",
      "profit warning",
      "strike",
      "industrial action",
      "unrest",
      "protest",
      "arrested",
    ],
  },
];

function normaliseForMatching(value: string) {
  return ` ${value.toLowerCase().replace(/[^a-z0-9&+]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function countMatches(haystack: string, terms: string[]) {
  let matches = 0;

  for (const term of terms) {
    const needle = ` ${term.toLowerCase().replace(/[^a-z0-9&+]+/g, " ").replace(/\s+/g, " ").trim()} `;

    if (needle.trim() && haystack.includes(needle)) {
      matches += 1;
    }
  }

  return matches;
}

function roundConfidence(value: number) {
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
}

/**
 * Classifies an article from its title and summary.
 *
 * @param sourceDefaultTopicSlugs Topics the source always contributes, for
 *   example a cruise trade title. These are added at a modest confidence so a
 *   specialist publication still tags correctly when the wording is thin.
 * @param knownCompanies Supplier names already on Travel Xchange, so an
 *   article can be linked to the supplier page it is about.
 */
export function classifyArticle(
  title: string,
  summary: string,
  sourceDefaultTopicSlugs: string[] = [],
  knownCompanies: Array<{ id: string; name: string }> = [],
): Classification {
  // The headline is the strongest signal, so it is weighted by appearing twice.
  const haystack = normaliseForMatching(`${title} ${title} ${summary}`);
  const titleHaystack = normaliseForMatching(title);
  const scores = new Map<string, number>();

  for (const rule of topicRules) {
    const matches = countMatches(haystack, rule.terms);

    if (matches === 0) {
      continue;
    }

    const titleBonus = countMatches(titleHaystack, rule.terms) > 0 ? 0.15 : 0;
    // Diminishing returns: three matching terms is confident, ten is not
    // three times more confident than that.
    const score = rule.weight * (1 + Math.log2(matches)) + titleBonus;
    scores.set(rule.slug, Math.max(scores.get(rule.slug) ?? 0, score));
  }

  for (const slug of sourceDefaultTopicSlugs) {
    if (!slug) {
      continue;
    }

    scores.set(slug, Math.max(scores.get(slug) ?? 0, 0.45));
  }

  const topics = [...scores.entries()]
    .map(([slug, score]) => ({ confidence: roundConfidence(score), slug }))
    .filter((topic) => topic.confidence >= 0.2)
    .sort((a, b) => b.confidence - a.confidence || a.slug.localeCompare(b.slug))
    // A story that matches everything has really matched nothing useful.
    .slice(0, 5);

  let sensitivity: Sensitivity = "routine";

  for (const rule of sensitivityRules) {
    if (countMatches(haystack, rule.terms) > 0) {
      sensitivity = rule.level;
      break;
    }
  }

  const matchedCompanyIds = knownCompanies
    .filter((company) => {
      const name = company.name?.trim();

      if (!name || name.length < 3) {
        return false;
      }

      return haystack.includes(normaliseForMatching(name).trimEnd());
    })
    .map((company) => company.id);

  return {
    confidence: topics.length > 0 ? topics[0].confidence : 0,
    matchedCompanyIds,
    sensitivity,
    topics,
  };
}

/**
 * Decides whether an article may publish without a human looking at it.
 *
 * Auto-publication needs all three of: the source switched on for it, a
 * trusted source, and a routine story classified with reasonable confidence.
 * Anything touching collapse, safety, legal risk or regulation always waits
 * for a moderator, whatever the source settings say.
 */
export function requiresModeration(input: {
  sensitivity: Sensitivity;
  confidence: number;
  autoPublish: boolean;
  trustLevel: "low" | "standard" | "high";
}) {
  if (input.sensitivity !== "routine") {
    return true;
  }

  if (!input.autoPublish) {
    return true;
  }

  if (input.trustLevel === "low") {
    return true;
  }

  const threshold = input.trustLevel === "high" ? 0.4 : 0.55;

  return input.confidence < threshold;
}
