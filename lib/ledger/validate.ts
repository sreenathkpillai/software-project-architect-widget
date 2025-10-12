import { Ledger, DocType } from "./types";

export type ValidationResult =
  | { ok: true }
  | { ok: false; missing: string[]; hints: string[] };

/**
 * Validate that a document slice has the required information
 * before generating the document
 */
export function validateDocSlice(ledger: Ledger, doc: DocType): ValidationResult {
  // Define required keys for each document type
  const requirements: Record<DocType, string[]> = {
    "prd.md": ["audience", "mustFeatures", "goals"],
    "frontend.md": ["uiStack", "platform"],
    "backend.md": ["architecture", "auth"],
    "state-management.md": ["rules"],
    "database-schema.md": ["schema"],
    "api.md": ["endpoints"],
    "devops.md": ["pipeline", "environments"],
    "testingplan.md": ["testTypes", "coverage"],
    "codedocumentation.md": ["structure"],
    "performanceoptimization.md": ["targets"],
    "userflow.md": ["flows"],
    "thirdpartylibraries.md": ["libraries"],
    "readme.md": ["summary", "stack"]
  };

  const required = requirements[doc] || [];
  const have = ledger.answersByDoc[doc] || {};
  const missing = required.filter(key => !have[key] || have[key].length === 0);

  // Check for specific density (presence of technical details)
  const hints: string[] = [];
  const allAnswers = Object.values(have).flat().join("\n");

  switch (doc) {
    case "api.md":
      if (!allAnswers.match(/\/[a-z0-9\/_-]+/i)) {
        hints.push("API endpoints should include at least one route like /api/v1/...");
      }
      break;

    case "performanceoptimization.md":
      if (!allAnswers.match(/\b(\d+\s*(?:fps|ms|mb|s|%)|<\s*\d+\s*ms)\b/i)) {
        hints.push("Performance targets should include numeric units (e.g., 60 FPS, <100ms).");
      }
      break;

    case "database-schema.md":
      if (!allAnswers.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/)) {
        hints.push("Database schema should include table names (e.g., User, Product).");
      }
      break;

    case "frontend.md":
      if (!allAnswers.match(/\b(react|vue|angular|svelte|next|nuxt)\b/i)) {
        hints.push("Frontend should specify a UI framework (e.g., React, Vue, Angular).");
      }
      break;

    case "backend.md":
      if (!allAnswers.match(/\b(node|python|java|go|rust|ruby|php|c#)\b/i)) {
        hints.push("Backend should specify a programming language or runtime.");
      }
      break;
  }

  if (missing.length > 0 || hints.length > 0) {
    return { ok: false, missing, hints };
  }

  return { ok: true };
}

/**
 * Get a summary of ledger completeness
 */
export function getLedgerCompleteness(ledger: Ledger): {
  totalDocs: number;
  docsWithAnswers: number;
  totalKeys: number;
  keysWithAnswers: number;
  completenessPercent: number;
} {
  const allDocs = Object.keys(ledger.answersByDoc) as DocType[];
  const docsWithAnswers = allDocs.filter(doc => {
    const answers = ledger.answersByDoc[doc];
    return answers && Object.keys(answers).length > 0;
  });

  let totalKeys = 0;
  let keysWithAnswers = 0;

  allDocs.forEach(doc => {
    const answers = ledger.answersByDoc[doc] || {};
    const keys = Object.keys(answers);
    totalKeys += 10; // Approximate expected keys per doc
    keysWithAnswers += keys.length;
  });

  return {
    totalDocs: allDocs.length,
    docsWithAnswers: docsWithAnswers.length,
    totalKeys,
    keysWithAnswers,
    completenessPercent: Math.round((keysWithAnswers / totalKeys) * 100)
  };
}

/**
 * Check if ledger is ready for document generation
 */
export function isLedgerReadyForGeneration(ledger: Ledger): boolean {
  const completeness = getLedgerCompleteness(ledger);

  // Need at least 60% completeness to generate documents
  return completeness.completenessPercent >= 60;
}