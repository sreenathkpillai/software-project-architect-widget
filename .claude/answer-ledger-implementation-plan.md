# Answer Ledger Implementation Plan

## Product/Tech Brief

**Goal**: Reduce latency and improve reliability by replacing full chat history with a deterministic Answer Ledger (lossless, structured).

**Context**: You already run the full questioning flow (avg ~16s per Q) and then parallelize 13 doc generations. This change primarily optimizes the general flow (smaller context → faster reasoning and fewer drifts) and also benefits doc-gen by giving precise, consistent inputs.

**Non-goals**: Change model, alter the unified prompt's voice, or modify your parallelization step (it stays as implemented).

## User Story

As the Architect app,
I want to maintain a compact, lossless Answer Ledger during the entire Q&A,
so that when generating documents (in parallel) I can pass a small, authoritative state (latest-wins) that preserves all decisions and identifiers without the bloat and noise of full transcripts—keeping quality while cutting latency and risk of drift.

## Acceptance Criteria

1. **Ledger build**: For every assistant question and user answer, the system updates a per-session Answer Ledger with:
   - `answersByDoc[doc][key] = string[]` (normalized bullets, latest-wins)
   - `decisionsByDoc[doc][key] = string[]` (background/auto decisions)
   - `unresolvedByDoc[doc] = string[]` (explicit gaps)
   - glossary updates (product name, roles, route/table IDs, enums)

2. **Lossless for identifiers & targets**: Endpoints, table/column names, enums, role names, numbers/units (e.g., 60 FPS, <100ms, /api/v1/matches) are preserved verbatim in bullets.

3. **Deterministic latest-wins**: If a doc/key gets multiple answers, the most recent replaces the previous.

4. **Doc-gen input**: At FINALIZE, each of the 13 parallel doc calls can use either:
   - Ledger-only, or
   - Ledger + last N (15–25) turns (toggleable, defaults to ledger-only once stable).

5. **Validator**: Before each doc call, a validator ensures required sections (per doc) and a minimal "specifics density" (presence of IDs/numbers where expected). If a doc slice fails validation and Q&A isn't finished, ask a targeted follow-up; if Q&A is finished, allow doc-gen to gap-fill.

6. **Telemetry**: Emit counters for: tokens saved (est.), keys updated, collisions (latest-wins), validator passes/fails.

7. **No change in voice/style**: Using the same unified SYSTEM_PROMPT + minimal doc-phase override yields docs equal or better than transcript-based runs.

## Data Model

```typescript
// lib/ledger/types.ts
export const ALL_DOCS = [
  "prd.md","frontend.md","backend.md","state-management.md","database-schema.md",
  "api.md","devops.md","testingplan.md","codedocumentation.md",
  "performanceoptimization.md","userflow.md","thirdpartylibraries.md","readme.md",
] as const;
export type DocType = typeof ALL_DOCS[number];

export type Ledger = {
  glossary: {
    productName?: string;
    roles?: string[];
    routes?: Record<string, string>; // e.g., "/api/v1/matches": "createMatch"
    tables?: Record<string, string>; // e.g., "Match": "matches"
    enums?: Record<string, string[]>;
  };
  global: {
    audience?: string;
    goals?: string[];
    monetization?: string;
    platforms?: string[];
    stack?: string[];
    constraints?: string[];
    nfr?: string[]; // global non-functionals
  };
  answersByDoc: Record<DocType, Record<string, string[]>>;
  decisionsByDoc: Record<DocType, Record<string, string[]>>;
  unresolvedByDoc: Record<DocType, string[]>;
  provenance: Record<string, { lastAnswerAt: string; turns?: number[] }>;
};
```

## Implementation Components

### 1. Question Classifier (Deterministic)
Map each assistant question → {doc, key}. Keep it simple: a small set of regex/keyword rules (~30–50 rules).

```typescript
// lib/ledger/classifier.ts
type Hit = { doc: DocType; key: string };

export function classifyQuestion(q: string): Hit | null {
  const t = q.toLowerCase();

  // PRD
  if (/\b(target audience|who is it for)\b/.test(t)) return { doc: "prd.md", key: "audience" };
  if (/\b(must[- ]?have|mvp features|core features)\b/.test(t)) return { doc: "prd.md", key: "mustFeatures" };
  // ... more rules
}
```

### 2. Answer Normalization (Lossless bullets)
Split on common delimiters, trim, keep numbers/IDs, drop filler.

```typescript
// lib/ledger/normalize.ts
export function normalizeAnswer(raw: string): string[] {
  return raw
    .split(/\n|;|•|- |\u2022|\r/g)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^(\d+\.|\*\s*)/, "")); // drop leading numbering/asterisks
}
```

### 3. Ingestion (Latest-wins)
```typescript
// lib/ledger/ingest.ts
export function ingestQA(ledger: Ledger, question: string, answer: string, turnId: number, isoTime: string) {
  const hit = classifyQuestion(question);
  if (!hit) return;

  const bullets = normalizeAnswer(answer);
  ledger.answersByDoc[hit.doc] ??= {};
  ledger.answersByDoc[hit.doc][hit.key] = bullets; // latest wins (replace)
  ledger.provenance[`${hit.doc}.${hit.key}`] = { lastAnswerAt: isoTime, turns: [turnId] };
}
```

### 4. Validator (Pre-doc-gen)
Lightweight checks to catch obvious holes before calling GPT-5:

```typescript
// lib/ledger/validate.ts
export type ValidationResult = { ok: true } | { ok: false; missing: string[]; hints: string[] };

export function validateDocSlice(ledger: Ledger, doc: DocType): ValidationResult {
  const need: Record<DocType, string[]> = {
    "prd.md": ["mustFeatures","shouldFeatures","outOfScope","risks"],
    "api.md": ["endpoints","errors","rateLimits"],
    // ... more requirements
  };

  const have = ledger.answersByDoc[doc] ?? {};
  const missing = (need[doc] || []).filter(k => !have[k] || have[k].length === 0);

  return missing.length ? { ok: false, missing, hints: [] } : { ok: true };
}
```

### 5. Ledger Slice Builder
```typescript
// lib/ledger/buildSlice.ts
export function buildLedgerSlice(ledger: Ledger, doc: DocType) {
  return {
    documentType: doc,
    glossary: ledger.glossary,
    answers: ledger.answersByDoc[doc] || {},
    decisions: ledger.decisionsByDoc[doc] || {},
    unresolved: ledger.unresolvedByDoc[doc] || []
  };
}
```

## Integration Points

### During Q&A Loop
- After every assistant question → user answer, call `ingestQA(...)`
- If interrogator made implicit decision, call `recordDecision(...)`
- If question timed out/skipped, add `recordUnresolved(...)`
- Periodically call `promoteGlossary(...)`

### On FINALIZE (already implemented)
- Optionally run `validateDocSlice(...)` for each doc and log hints (non-blocking)
- Build doc messages using existing parallelizer, but replace full transcript with:

```
## CONTEXT (authoritative; latest wins)
<JSON.stringify(ledgerSliceForDoc, null, 2)>
```

### Toggle Path (Fast Rollback)
- Feature flag: `useLedgerForDocGen` (default ON after soak)
- If OFF, fall back to full transcript

## Testing Plan

1. **Classifier tests**: Q → {doc,key} mapping for 20–30 canonical patterns
2. **Normalization tests**: Multi-line answers produce expected bullet arrays; numbers/IDs preserved
3. **Ingestion tests**: Latest-wins replacement, provenance timestamps updated
4. **Glossary tests**: Routes/tables promotion works
5. **Validator tests**: Required keys missing → fails with helpful hints
6. **Golden doc smoke test**: Run one real PRD flow, compare ledger vs transcript docs

## Rollout & Migration

1. **Phase 0 (shadow)**: Build ledger alongside current flow; still pass full transcript to doc-gen
2. **Phase 1 (dual)**: Pass ledger + last 15–25 turns to doc-gen
3. **Phase 2 (ledger-only)**: Toggle `useLedgerForDocGen = true`
4. **Phase 3**: Expand classifier coverage

## Success Metrics

- Per-doc input token count ↓ 60–85%
- Wall-clock per doc ↓ 20–40% (model-dependent)
- "Specifics density" in outputs unchanged or improved
- Intervention rate (manual edits) stable or better

## Dev Tasks Checklist

- [ ] Create `lib/ledger/{types.ts,classifier.ts,normalize.ts,ingest.ts,validate.ts,buildSlice.ts}`
- [ ] Wire ingestion in Q&A loop after each user answer
- [ ] Promote glossary on a timer or after each ingestion
- [ ] Add validator logging (non-blocking) at FINALIZE
- [ ] Modify parallelizer to send ledger slices (feature-flagged)
- [ ] Add Jest tests per section above
- [ ] Telemetry for tokens saved, keys updated, collisions, validator results
- [ ] Add "Download Ledger JSON" debug button in dev builds