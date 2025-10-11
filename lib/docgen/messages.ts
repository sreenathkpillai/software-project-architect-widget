export function buildDocOverride(documentType: string) {
  return [
    "# DOCUMENT GENERATION MODE",
    `documentType: ${documentType}`,
    "Behavior: Generate the document only; do not ask questions.",
    "Output: One save_specification_document tool call containing the entire document; include skip_technical_summary=true."
  ].join("\n");
}

export function buildContextFromTranscript(transcript: string) {
  return "## CONTEXT (authoritative; latest wins)\n" + transcript;
}
// Later: buildContextFromLedger(slice: LedgerSlice)