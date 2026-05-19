export type LegalSection = {
  heading: string;
  body: string[];
  items?: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const legalRoutes = [
  { label: "Terms", href: "/legal/terms" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Cookies", href: "/legal/cookies" },
  { label: "Guidelines", href: "/legal/community-guidelines" },
  { label: "Acceptable use", href: "/legal/acceptable-use" },
  { label: "Advertiser terms", href: "/legal/advertiser-terms" },
  { label: "Job posting terms", href: "/legal/job-posting-terms" },
  { label: "Data request", href: "/legal/data-request" },
];

export const legalDocuments = {
  terms: {
    slug: "terms",
    title: "Terms and Conditions",
    description:
      "Starter platform terms for Travel Xchange members, suppliers, recruiters, trainers, advertisers, and partners.",
    lastUpdated: "19 May 2026",
    sections: [
      {
        heading: "Important MVP notice",
        body: [
          "These terms are a working draft for MVP testing. They help explain how Travel Xchange should operate, but they must be reviewed by a qualified legal adviser before the platform is launched publicly.",
          "By using the MVP, users agree to use Travel Xchange in a professional, lawful, and respectful way.",
        ],
      },
      {
        heading: "Who can use Travel Xchange",
        body: [
          "Travel Xchange is intended for people and organisations connected with the travel industry, including travel agents, suppliers, recruiters, trainers, advertisers, travel technology providers, and approved partners.",
          "Users must provide accurate account information and must not create an account for another person or company without permission.",
        ],
      },
      {
        heading: "Accounts and security",
        body: [
          "Users are responsible for keeping their login details safe and for activity carried out through their account.",
          "Travel Xchange may restrict, suspend, or remove an account if it appears to be misused, unsafe, fraudulent, or harmful to other members.",
        ],
      },
      {
        heading: "Member content",
        body: [
          "Users remain responsible for the posts, comments, messages, jobs, events, articles, adverts, and other content they submit.",
          "By submitting content, users give Travel Xchange permission to host, display, moderate, and distribute that content inside the platform as needed to provide the service.",
        ],
      },
      {
        heading: "Moderation",
        body: [
          "Travel Xchange may review, hide, remove, restrict, or report content that appears unlawful, unsafe, misleading, spam-like, abusive, or against the community rules.",
          "Moderation decisions may be logged so the platform owner can keep a record of safety and compliance actions.",
        ],
      },
      {
        heading: "Paid services",
        body: [
          "Paid memberships, job posts, adverts, sponsored placements, and training products are being introduced gradually. Prices, renewal terms, cancellation rules, and refund rules should be shown clearly before payment.",
          "Stripe is used for payment processing. Travel Xchange should not store full card details.",
        ],
      },
      {
        heading: "Changes to these terms",
        body: [
          "Travel Xchange may update these terms as the product develops. Where changes are important, users should be told in a clear and reasonable way.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    description:
      "How Travel Xchange expects to collect, use, protect, and manage personal data during the MVP.",
    lastUpdated: "19 May 2026",
    sections: [
      {
        heading: "Important MVP notice",
        body: [
          "This privacy policy is a starter draft for MVP testing. It is written in plain English so users can understand the intended data use. It must be reviewed before production launch.",
          "The platform is being designed with UK GDPR principles in mind, including transparency, purpose limitation, data minimisation, security, and user rights.",
        ],
      },
      {
        heading: "Who controls the data",
        body: [
          "Travel Xchange is the platform being developed by the project owner. A final company name, registered address, and privacy contact should be added before public launch.",
          "For MVP testing, privacy questions and data requests should be directed to the project owner.",
        ],
      },
      {
        heading: "Information we may collect",
        body: [
          "Travel Xchange may collect account details, profile details, company details, roles, verification status, posts, comments, groups, jobs, events, articles, messages, notifications, billing status, support questions, reports, and admin moderation records.",
          "The platform may also collect technical information such as device details, browser details, IP address, security logs, consent choices, and usage events needed to operate and protect the service.",
        ],
      },
      {
        heading: "Why we use information",
        body: [
          "We use information to create accounts, provide member profiles, run the feed, manage groups, show jobs and events, process support questions, send notifications, moderate content, prevent misuse, manage subscriptions, and improve the product.",
          "Some processing is needed to provide the service, some is needed for legal or security reasons, and some may rely on consent, such as optional analytics or marketing cookies.",
        ],
      },
      {
        heading: "Sharing information",
        body: [
          "Information may be shared with trusted service providers that help run the platform, such as Supabase for authentication and database services, Vercel for hosting, Stripe for payments, and email or notification tools added later.",
          "Public profile and company information may be visible to other users depending on profile settings and platform rules.",
        ],
      },
      {
        heading: "Retention",
        body: [
          "Personal data should only be kept for as long as needed for the purpose it was collected, platform security, legal records, dispute handling, accounting, or audit requirements.",
          "Retention periods will be refined before production launch as real operating processes are confirmed.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Depending on the circumstances, users may have rights to access, correct, delete, restrict, object to, or receive a copy of their personal data.",
          "The data request page explains how users can ask for help with these rights during the MVP.",
        ],
      },
      {
        heading: "Complaints",
        body: [
          "Users should contact Travel Xchange first so the project owner can try to resolve the issue. UK users can also contact the Information Commissioner's Office if they are unhappy with how personal data is handled.",
        ],
      },
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookie Policy",
    description:
      "How Travel Xchange expects to use cookies, browser storage, and similar technologies.",
    lastUpdated: "19 May 2026",
    sections: [
      {
        heading: "Important MVP notice",
        body: [
          "This cookie policy is a starter draft. The MVP currently uses a local cookie preference banner and basic browser storage so the future consent experience can be tested.",
          "Before production launch, the final cookie list should be checked against the tools actually installed on the live website.",
        ],
      },
      {
        heading: "What cookies and similar technologies are",
        body: [
          "Cookies and similar technologies can store information on a user's device or read information from that device. They may include cookies, local storage, pixels, tags, scripts, and analytics tools.",
        ],
      },
      {
        heading: "Necessary technologies",
        body: [
          "Necessary technologies help the website work, keep users logged in, protect security, remember consent choices, and support core platform features.",
          "These are treated as required because the website cannot operate properly without them.",
        ],
      },
      {
        heading: "Analytics technologies",
        body: [
          "Analytics technologies may help Travel Xchange understand page visits, product usage, errors, and performance.",
          "Optional analytics should only be used after the user has been given a clear choice.",
        ],
      },
      {
        heading: "Marketing technologies",
        body: [
          "Marketing technologies may be used later for advertising measurement, sponsored content reporting, newsletter sponsorship, or campaign performance.",
          "Marketing cookies and similar tools should not be activated unless the user has agreed where consent is required.",
        ],
      },
      {
        heading: "Changing your choice",
        body: [
          "Users can manage their cookie preference from the banner. A full account preference centre can be added in a later phase.",
        ],
      },
    ],
  },
  "community-guidelines": {
    slug: "community-guidelines",
    title: "Community Guidelines",
    description:
      "The behaviour standards for a professional travel trade community.",
    lastUpdated: "19 May 2026",
    sections: [
      {
        heading: "Professional purpose",
        body: [
          "Travel Xchange is designed for constructive travel industry discussion, networking, learning, recruitment, supplier updates, and professional support.",
          "Members should treat the platform as a trade environment, not a place for harassment, abuse, spam, or misleading promotion.",
        ],
      },
      {
        heading: "Respectful conduct",
        body: [
          "Members must not bully, harass, threaten, shame, or abuse other users.",
          "Disagreements are allowed, but they should stay professional and focused on the topic.",
        ],
      },
      {
        heading: "Accurate information",
        body: [
          "Travel claims, supplier updates, job posts, adverts, training claims, and commercial offers should be accurate and not misleading.",
          "Users should not impersonate another person, company, supplier, employer, trainer, or industry body.",
        ],
      },
      {
        heading: "Sensitive information",
        body: [
          "Members should not post confidential booking details, customer personal data, payment details, passport information, or private commercial information unless they have a lawful reason and permission to do so.",
        ],
      },
      {
        heading: "Reporting and moderation",
        body: [
          "Members can report content or behaviour that appears unsafe, unlawful, abusive, misleading, or against these guidelines.",
          "Moderators and admins may review reports and take proportionate action, including hiding content, warning users, suspending accounts, or banning accounts.",
        ],
      },
    ],
  },
  "acceptable-use": {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    description:
      "Rules that protect the platform, members, and professional travel trade data.",
    lastUpdated: "19 May 2026",
    sections: [
      {
        heading: "Using the platform safely",
        body: [
          "Users must not use Travel Xchange in a way that damages the platform, harms other users, breaks the law, or interferes with normal service operation.",
        ],
      },
      {
        heading: "Prohibited activity",
        body: [
          "Users must not upload malware, attempt unauthorised access, scrape data without permission, send spam, create fake accounts, evade moderation, or use the platform for fraud.",
        ],
        items: [
          "Illegal, abusive, hateful, threatening, or exploitative content",
          "Misleading travel offers, fake jobs, or false supplier claims",
          "Content that exposes private customer, member, or company data",
          "Automated scraping, credential sharing, or security testing without approval",
          "Attempts to bypass payments, subscriptions, verification, or moderation controls",
        ],
      },
      {
        heading: "Commercial promotion",
        body: [
          "Suppliers, recruiters, trainers, and advertisers may promote relevant travel trade products or opportunities in the correct areas of the platform.",
          "Promotion must be clear, accurate, and not disguised as independent member content where sponsorship should be disclosed.",
        ],
      },
      {
        heading: "Enforcement",
        body: [
          "Travel Xchange may remove content, restrict features, suspend accounts, or ban users where needed to protect the community and comply with legal duties.",
        ],
      },
    ],
  },
  "advertiser-terms": {
    slug: "advertiser-terms",
    title: "Advertiser Terms",
    description:
      "Starter terms for suppliers, recruiters, advertisers, and sponsors using paid placements.",
    lastUpdated: "19 May 2026",
    sections: [
      {
        heading: "Important MVP notice",
        body: [
          "These advertiser terms are a draft for MVP testing. Final pricing, inventory, approval rules, cancellation rules, and reporting commitments should be confirmed before paid campaigns are sold.",
        ],
      },
      {
        heading: "Advertiser responsibility",
        body: [
          "Advertisers are responsible for ensuring their adverts, claims, images, landing pages, prices, incentives, and promotions are lawful, accurate, and suitable for a professional travel trade audience.",
        ],
      },
      {
        heading: "Approval and moderation",
        body: [
          "Travel Xchange may review, reject, pause, remove, or request changes to adverts that appear misleading, unsafe, poor quality, unlawful, or inconsistent with the platform's professional purpose.",
        ],
      },
      {
        heading: "Sponsored content",
        body: [
          "Sponsored placements should be clearly labelled where needed so members can understand when content is paid or promoted.",
        ],
      },
      {
        heading: "Reporting",
        body: [
          "Advert analytics are currently placeholders. Future reports may include impressions, clicks, placements, campaign dates, and package performance.",
        ],
      },
      {
        heading: "Payment and cancellation",
        body: [
          "Final payment, renewal, cancellation, and refund rules will be added when paid advertising packages are activated.",
        ],
      },
    ],
  },
  "job-posting-terms": {
    slug: "job-posting-terms",
    title: "Job Posting Terms",
    description:
      "Rules for recruiters, suppliers, agencies, and employers posting travel industry roles.",
    lastUpdated: "19 May 2026",
    sections: [
      {
        heading: "Accurate job posts",
        body: [
          "Job posts must describe real opportunities and should include accurate information about the employer, role, location, remote or hybrid status, pay where available, requirements, and application process.",
        ],
      },
      {
        heading: "Fair recruitment",
        body: [
          "Recruiters and employers are responsible for complying with employment, equality, recruitment, advertising, and data protection rules that apply to their job postings and applicant handling.",
        ],
      },
      {
        heading: "No misleading roles",
        body: [
          "Travel Xchange should not be used for fake roles, misleading earnings claims, unlawful fees, pyramid-style recruitment, or opportunities that hide important conditions from applicants.",
        ],
      },
      {
        heading: "Applications and data",
        body: [
          "Applicant information should be handled lawfully, securely, and only for recruitment purposes unless the applicant has clearly agreed to another use.",
        ],
      },
      {
        heading: "Featured listings",
        body: [
          "Featured jobs, sponsored employers, and recruiter packages are placeholders in the MVP. Final commercial terms will be added before paid listings are sold.",
        ],
      },
    ],
  },
};

export const dataRequestRoute = {
  label: "Data request",
  href: "/legal/data-request",
};
