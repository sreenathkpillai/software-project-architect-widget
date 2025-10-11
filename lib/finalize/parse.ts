import { ALL_DOCS, DocType, FinalizeBlock } from "@/lib/types/docs";

const START = "===FINALIZE===";
const END = "===/FINALIZE===";

export class FinalizeError extends Error {
  name = "FinalizeError";
}

export function extractFinalizeInner(text: string): string | null {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s === -1 || e === -1 || e <= s) return null;
  const inner = text.slice(s + START.length, e).trim();
  return inner || null;
}

export function parseFinalize(inner: string): FinalizeBlock {
  const lines = inner.split("\n").map(l => l.trim()).filter(Boolean);
  const kv = new Map<string,string>();
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    kv.set(line.slice(0,i).trim().toLowerCase(), line.slice(i+1).trim());
  }
  const mode = kv.get("mode");
  const docsRaw = kv.get("docs");
  const notes = kv.get("notes")?.replace(/^"|"$/g, "");

  if (mode?.toLowerCase() !== "parallel") throw new FinalizeError("Unsupported or missing mode");
  if (!docsRaw) throw new FinalizeError("Missing docs list");

  // tolerate leading text before '['
  const arrStr = docsRaw.slice(docsRaw.indexOf("["));
  let docs: unknown;
  try { docs = JSON.parse(arrStr); } catch { throw new FinalizeError("Invalid docs JSON list"); }
  if (!Array.isArray(docs) || docs.some(d => typeof d !== "string")) {
    throw new FinalizeError("Docs must be an array of strings");
  }

  const allowed = new Set(ALL_DOCS);
  const seen = new Set<string>();
  const clean: DocType[] = [];
  for (const d of docs as string[]) {
    if (!allowed.has(d as DocType)) throw new FinalizeError(`Unknown doc: ${d}`);
    if (seen.has(d)) throw new FinalizeError(`Duplicate doc: ${d}`);
    seen.add(d); clean.push(d as DocType);
  }
  return { mode: "parallel", docs: clean, notes };
}