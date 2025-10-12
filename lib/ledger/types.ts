export const ALL_DOCS = [
  "prd.md",
  "frontend.md",
  "backend.md",
  "state-management.md",
  "database-schema.md",
  "api.md",
  "devops.md",
  "testingplan.md",
  "codedocumentation.md",
  "performanceoptimization.md",
  "userflow.md",
  "thirdpartylibraries.md",
  "readme.md",
] as const;

export type DocType = typeof ALL_DOCS[number];

export type Ledger = {
  // Glossary of important identifiers
  glossary: {
    productName?: string;
    roles?: string[];
    routes?: Record<string, string>; // e.g., "/api/v1/matches": "createMatch"
    tables?: Record<string, string>; // e.g., "Match": "matches"
    enums?: Record<string, string[]>;
  };

  // Global context that applies across documents
  global: {
    audience?: string;
    goals?: string[];
    monetization?: string;
    platforms?: string[];
    stack?: string[];
    constraints?: string[];
    nfr?: string[]; // global non-functionals
  };

  // Answers organized by document and key
  answersByDoc: Record<DocType, Record<string, string[]>>;

  // Background decisions made by AI
  decisionsByDoc: Record<DocType, Record<string, string[]>>;

  // Unresolved questions or gaps
  unresolvedByDoc: Record<DocType, string[]>;

  // Tracking when answers were given
  provenance: Record<string, { lastAnswerAt: string; turns?: number[] }>;
};

// Initialize an empty ledger
export function createEmptyLedger(): Ledger {
  const ledger: Ledger = {
    glossary: {},
    global: {},
    answersByDoc: {} as Record<DocType, Record<string, string[]>>,
    decisionsByDoc: {} as Record<DocType, Record<string, string[]>>,
    unresolvedByDoc: {} as Record<DocType, string[]>,
    provenance: {}
  };

  // Initialize empty objects for each doc type
  ALL_DOCS.forEach(doc => {
    ledger.answersByDoc[doc] = {};
    ledger.decisionsByDoc[doc] = {};
    ledger.unresolvedByDoc[doc] = [];
  });

  return ledger;
}