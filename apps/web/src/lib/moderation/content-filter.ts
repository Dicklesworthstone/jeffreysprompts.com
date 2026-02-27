export interface ContentSignal {
  score: number;
  reason: string;
}

export interface ContentScanResult {
  signals: ContentSignal[];
  normalized: string;
  urlCount: number;
  uppercaseRatio: number;
  repeatedCharRuns: number;
}

const SPAM_TERMS = [
  "free money",
  "work from home",
  "guaranteed",
  "click here",
  "buy now",
  "limited offer",
  "winner",
  "promo code",
  "crypto",
  "bitcoin",
  "airdrop",
];

function normalizeContent(content: string): string {
  return content.replace(/\s+/g, " ").trim();
}

function countUrls(content: string): number {
  return (content.match(/\bhttps?:\/\/[^\s]+/gi) || []).length;
}

function calcUppercaseRatio(content: string): number {
  const letters = content.replace(/[^a-zA-Z]+/g, "");
  if (!letters) return 0;
  const upper = letters.replace(/[^A-Z]+/g, "").length;
  return upper / letters.length;
}

function maxRepeatedCharRuns(content: string): number {
  let maxRun = 0;
  let currentRun = 0;
  let lastChar = "";

  for (const char of content) {
    if (char === lastChar) {
      currentRun += 1;
    } else {
      currentRun = 1;
      lastChar = char;
    }
    if (currentRun > maxRun) {
      maxRun = currentRun;
    }
  }

  return maxRun;
}

function detectSpamTerms(content: string): ContentSignal[] {
  const signals: ContentSignal[] = [];
  for (const term of SPAM_TERMS) {
    // Escape special regex characters in term if any
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, "i");
    if (regex.test(content)) {
      signals.push({ score: 0.15, reason: `Contains spam term: "${term}"` });
    }
  }
  return signals;
}

export function scanContent(rawContent: string): ContentScanResult {
  const normalized = normalizeContent(rawContent);
  const urlCount = countUrls(normalized);
  const uppercaseRatio = calcUppercaseRatio(normalized);
  const repeatedCharRuns = maxRepeatedCharRuns(normalized);

  const signals: ContentSignal[] = [];

  if (urlCount >= 3) {
    signals.push({ score: 0.35, reason: "Contains many links" });
  } else if (urlCount === 2) {
    signals.push({ score: 0.2, reason: "Contains multiple links" });
  } else if (urlCount === 1) {
    signals.push({ score: 0.1, reason: "Contains a link" });
  }

  if (uppercaseRatio >= 0.6 && normalized.length > 40) {
    signals.push({ score: 0.2, reason: "Excessive capitalization" });
  }

  if (repeatedCharRuns >= 6) {
    signals.push({ score: 0.2, reason: "Repeated characters detected" });
  }

  signals.push(...detectSpamTerms(normalized));

  return {
    signals,
    normalized,
    urlCount,
    uppercaseRatio,
    repeatedCharRuns,
  };
}
