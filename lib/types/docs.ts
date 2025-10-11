export const ALL_DOCS = [
  "prd.md","frontend.md","backend.md","state-management.md","database-schema.md",
  "api.md","devops.md","testingplan.md","codedocumentation.md",
  "performanceoptimization.md","userflow.md","thirdpartylibraries.md","readme.md",
] as const;

export type DocType = typeof ALL_DOCS[number];

export interface FinalizeBlock {
  mode: "parallel";
  docs: DocType[];
  notes?: string;
}

export interface DocJobInput {
  documentType: DocType;
  transcript: string; // ledger later
}