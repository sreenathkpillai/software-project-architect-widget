import { Ledger, DocType } from "./types";

/**
 * Build a ledger slice for a specific document
 * This is what gets sent to GPT-5 instead of the full transcript
 */
export function buildLedgerSlice(ledger: Ledger, doc: DocType) {
  return {
    documentType: doc,
    glossary: ledger.glossary,
    global: ledger.global,
    answers: ledger.answersByDoc[doc] || {},
    decisions: ledger.decisionsByDoc[doc] || {},
    unresolved: ledger.unresolvedByDoc[doc] || [],

    // Include related context from other docs if relevant
    relatedContext: getRelatedContext(ledger, doc)
  };
}

/**
 * Get related context from other documents that might be relevant
 */
function getRelatedContext(ledger: Ledger, doc: DocType): Record<string, any> {
  const related: Record<string, any> = {};

  switch (doc) {
    case "api.md":
      // API doc needs to know about database schema
      related.databaseTables = Object.keys(ledger.glossary.tables || {});
      related.authMethod = ledger.answersByDoc["backend.md"]?.auth?.[0];
      break;

    case "database-schema.md":
      // Database needs to know about features to model
      related.coreFeatures = ledger.answersByDoc["prd.md"]?.mustFeatures;
      related.userRoles = ledger.glossary.roles;
      break;

    case "frontend.md":
      // Frontend needs to know about API endpoints
      related.apiRoutes = Object.keys(ledger.glossary.routes || {});
      related.userFlows = ledger.answersByDoc["userflow.md"]?.flows;
      break;

    case "backend.md":
      // Backend needs to know about performance requirements
      related.performanceTargets = ledger.answersByDoc["performanceoptimization.md"]?.targets;
      related.integrations = ledger.answersByDoc["thirdpartylibraries.md"]?.services;
      break;

    case "state-management.md":
      // State management needs to know about UI components and API
      related.uiFramework = ledger.answersByDoc["frontend.md"]?.uiStack?.[0];
      related.apiEndpoints = Object.keys(ledger.glossary.routes || {});
      break;

    case "devops.md":
      // DevOps needs to know about stack choices
      related.techStack = ledger.global.stack;
      related.performanceTargets = ledger.answersByDoc["performanceoptimization.md"]?.targets;
      break;

    case "testingplan.md":
      // Testing needs to know about critical features and flows
      related.criticalFeatures = ledger.answersByDoc["prd.md"]?.mustFeatures;
      related.userFlows = ledger.answersByDoc["userflow.md"]?.flows;
      break;

    case "readme.md":
      // README needs overview of everything
      related.productName = ledger.glossary.productName;
      related.techStack = ledger.global.stack;
      related.coreFeatures = ledger.answersByDoc["prd.md"]?.mustFeatures;
      related.audience = ledger.global.audience;
      break;
  }

  return related;
}

/**
 * Format ledger slice as a string for GPT-5 context
 */
export function formatLedgerSliceForContext(ledger: Ledger, doc: DocType): string {
  const slice = buildLedgerSlice(ledger, doc);

  return `## CONTEXT (authoritative; latest wins)

### Document Type
${slice.documentType}

### Glossary
${JSON.stringify(slice.glossary, null, 2)}

### Global Context
${JSON.stringify(slice.global, null, 2)}

### Specific Answers for This Document
${JSON.stringify(slice.answers, null, 2)}

### Background Decisions
${JSON.stringify(slice.decisions, null, 2)}

### Unresolved Questions
${slice.unresolved.length > 0 ? slice.unresolved.join('\n') : 'None'}

### Related Context
${JSON.stringify(slice.relatedContext, null, 2)}

---
Note: Use this structured context to generate the ${doc} document. Fill any gaps with sensible defaults based on the project context.`;
}

/**
 * Estimate token savings from using ledger vs full transcript
 */
export function estimateTokenSavings(
  ledgerSlice: any,
  transcriptLength: number
): {
  ledgerTokens: number;
  transcriptTokens: number;
  savingsPercent: number;
} {
  // Rough estimate: 1 token per 4 characters
  const ledgerText = JSON.stringify(ledgerSlice);
  const ledgerTokens = Math.ceil(ledgerText.length / 4);
  const transcriptTokens = Math.ceil(transcriptLength / 4);

  const savingsPercent = Math.round(
    ((transcriptTokens - ledgerTokens) / transcriptTokens) * 100
  );

  return {
    ledgerTokens,
    transcriptTokens,
    savingsPercent
  };
}