import pLimit from "p-limit";
import { DocType } from "@/lib/types/docs";
import { buildDocOverride, buildContextFromTranscript } from "@/lib/docgen/messages";
import { Ledger, formatLedgerSliceForContext } from "@/lib/ledger";

type GenCfg = {
  openai: any;            // your client
  systemPrompt: string;   // the unified SYSTEM_PROMPT string
  model: string;          // "gpt-5"
  concurrency?: number;   // 4–6 recommended
  temperature?: number;   // 0.2
  top_p?: number;         // 0.95
  max_tokens?: number;    // 3000–3500
};

export async function fanOutDocGeneration(input: {
  docs: DocType[],
  transcript: string,
  useLedger?: boolean,
  ledger?: Ledger
}, cfg: GenCfg) {
  const {
    openai, systemPrompt, model,
    concurrency = 5, temperature = 0.2, top_p = 0.95, max_tokens = 3300
  } = cfg;

  const limit = pLimit(concurrency);
  const tasks = input.docs.map(doc => limit(async () => {
    // Build context based on ledger or transcript
    let contextContent: string;
    if (input.useLedger && input.ledger) {
      contextContent = formatLedgerSliceForContext(input.ledger, doc);
      console.log(`[Fanout] Using ledger slice for ${doc}`);
    } else {
      contextContent = buildContextFromTranscript(input.transcript);
      console.log(`[Fanout] Using transcript for ${doc}`);
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildDocOverride(doc) },
      { role: "user", content: contextContent }
    ];

    const resp = await openai.chat.completions.create({
      model, temperature, top_p, max_tokens,
      tool_choice: { type: "function", function: { name: "save_specification_document" } },
      tools: [
        {
          type: "function" as const,
          function: {
            name: "save_specification_document",
            description: "Save software architecture specifications",
            parameters: {
              type: "object",
              properties: {
                filename: { type: "string" },
                content: { type: "string" },
                document_type: { type: "string" },
                description: { type: "string" },
                next_steps: { type: "string" },
                skip_technical_summary: { type: "boolean" }
              },
              required: ["filename", "content", "document_type", "description"]
            }
          }
        }
      ],
      messages
    });

    // Validate: exactly one tool call, correct name, no free-text
    const toolCalls = resp?.choices?.[0]?.message?.tool_calls ?? [];
    if (toolCalls.length !== 1 || toolCalls[0]?.function?.name !== "save_specification_document") {
      throw new Error("Invalid output: expected single save_specification_document tool call");
    }
    const hasProse = !!resp?.choices?.[0]?.message?.content?.trim();
    if (hasProse) throw new Error("Invalid output: prose outside tool call");

    return { documentType: doc, status: "ok", raw: resp };
  }));

  const settled = await Promise.allSettled(tasks);
  // Optional single retry for transient failures
  // (left out for brevity—Claude can add a retry-once wrapper)
  return settled;
}