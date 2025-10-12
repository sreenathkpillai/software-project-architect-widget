import { Ledger, DocType } from "./types";
import { classifyQuestion } from "./classifier";
import { normalizeAnswer, extractIdentifiers, cleanOptionLetters } from "./normalize";

/**
 * Ingest a Q&A pair into the ledger
 * Latest-wins: newer answers overwrite older ones for the same doc/key
 */
export function ingestQA(
  ledger: Ledger,
  question: string,
  answer: string,
  turnId: number,
  isoTime: string
): void {
  // Classify the question to determine doc and key
  const hit = classifyQuestion(question);
  if (!hit) {
    console.log(`[Ledger] Could not classify question: "${question.slice(0, 50)}..."`);
    return;
  }

  // Clean and normalize the answer
  const cleanAnswer = cleanOptionLetters(answer);
  const bullets = normalizeAnswer(cleanAnswer);

  if (bullets.length === 0) {
    console.log(`[Ledger] Empty answer for ${hit.doc}/${hit.key}`);
    return;
  }

  // Store in ledger (latest-wins)
  if (!ledger.answersByDoc[hit.doc]) {
    ledger.answersByDoc[hit.doc] = {};
  }
  ledger.answersByDoc[hit.doc][hit.key] = bullets;

  // Update provenance
  const provKey = `${hit.doc}.${hit.key}`;
  ledger.provenance[provKey] = {
    lastAnswerAt: isoTime,
    turns: ledger.provenance[provKey]?.turns || []
  };
  ledger.provenance[provKey].turns?.push(turnId);

  // Extract and promote identifiers to glossary
  promoteIdentifiers(ledger, answer, hit.doc);

  console.log(`[Ledger] Ingested ${hit.doc}/${hit.key}: ${bullets.length} bullets`);
}

/**
 * Record a background decision made by the AI
 */
export function recordDecision(
  ledger: Ledger,
  doc: DocType,
  key: string,
  items: string[]
): void {
  if (!ledger.decisionsByDoc[doc]) {
    ledger.decisionsByDoc[doc] = {};
  }
  ledger.decisionsByDoc[doc][key] = items;
  console.log(`[Ledger] Recorded decision for ${doc}/${key}: ${items.length} items`);
}

/**
 * Record an unresolved question or gap
 */
export function recordUnresolved(
  ledger: Ledger,
  doc: DocType,
  prompt: string
): void {
  if (!ledger.unresolvedByDoc[doc]) {
    ledger.unresolvedByDoc[doc] = [];
  }
  ledger.unresolvedByDoc[doc].push(prompt);
  console.log(`[Ledger] Recorded unresolved for ${doc}: "${prompt.slice(0, 50)}..."`);
}

/**
 * Promote identifiers found in answers to the glossary
 */
function promoteIdentifiers(ledger: Ledger, answer: string, doc: DocType): void {
  const identifiers = extractIdentifiers(answer);

  // Promote routes
  if (identifiers.routes.length > 0) {
    if (!ledger.glossary.routes) {
      ledger.glossary.routes = {};
    }
    identifiers.routes.forEach(route => {
      ledger.glossary.routes![route] = ledger.glossary.routes![route] || "";
    });
  }

  // Promote tables (especially from database-schema answers)
  if (doc === "database-schema.md" && identifiers.tables.length > 0) {
    if (!ledger.glossary.tables) {
      ledger.glossary.tables = {};
    }
    identifiers.tables.forEach(table => {
      ledger.glossary.tables![table] = ledger.glossary.tables![table] || "";
    });
  }

  // Promote enums
  if (identifiers.enums.length > 0) {
    if (!ledger.glossary.enums) {
      ledger.glossary.enums = {};
    }
    identifiers.enums.forEach(enumVal => {
      // Store as key with empty array for now
      if (!ledger.glossary.enums![enumVal]) {
        ledger.glossary.enums![enumVal] = [];
      }
    });
  }
}

/**
 * Promote global context from answers
 */
export function promoteGlobalContext(ledger: Ledger): void {
  // Extract audience from PRD answers
  const audience = ledger.answersByDoc["prd.md"]?.audience?.[0];
  if (audience) {
    ledger.global.audience = audience;
  }

  // Extract goals from PRD answers
  const goals = ledger.answersByDoc["prd.md"]?.goals;
  if (goals && goals.length > 0) {
    ledger.global.goals = goals;
  }

  // Extract monetization from PRD answers
  const monetization = ledger.answersByDoc["prd.md"]?.monetization?.[0];
  if (monetization) {
    ledger.global.monetization = monetization;
  }

  // Extract platforms from frontend answers
  const platforms = ledger.answersByDoc["frontend.md"]?.platform;
  if (platforms && platforms.length > 0) {
    ledger.global.platforms = platforms;
  }

  // Extract tech stack from various sources
  const stack: string[] = [];

  // Frontend stack
  const uiStack = ledger.answersByDoc["frontend.md"]?.uiStack;
  if (uiStack) stack.push(...uiStack);

  // Backend stack
  const backendArch = ledger.answersByDoc["backend.md"]?.architecture;
  if (backendArch) stack.push(...backendArch);

  // Database
  const database = ledger.answersByDoc["backend.md"]?.database;
  if (database) stack.push(...database);

  if (stack.length > 0) {
    ledger.global.stack = [...new Set(stack)]; // Deduplicate
  }

  // Extract NFRs from performance answers
  const nfr = ledger.answersByDoc["performanceoptimization.md"]?.targets;
  if (nfr && nfr.length > 0) {
    ledger.global.nfr = nfr;
  }

  // Extract product name if mentioned
  const productNamePatterns = [
    /(?:called|named|product name[s]?\s+(?:is|are))\s+"([^"]+)"/i,
    /(?:called|named|product name[s]?\s+(?:is|are))\s+'([^']+)'/i,
    /^([A-Z][a-zA-Z0-9]+)(?:\s|$)/ // PascalCase at start
  ];

  for (const doc of Object.keys(ledger.answersByDoc) as DocType[]) {
    const answers = ledger.answersByDoc[doc];
    for (const bullets of Object.values(answers)) {
      for (const bullet of bullets) {
        for (const pattern of productNamePatterns) {
          const match = bullet.match(pattern);
          if (match && match[1]) {
            ledger.glossary.productName = match[1];
            break;
          }
        }
        if (ledger.glossary.productName) break;
      }
      if (ledger.glossary.productName) break;
    }
    if (ledger.glossary.productName) break;
  }
}