/**
 * Normalize user answers into structured bullet points
 * Preserves identifiers, numbers, and technical details
 */
export function normalizeAnswer(raw: string): string[] {
  if (!raw) return [];

  return raw
    // Split on common delimiters
    .split(/\n|;|•|- |\u2022|\r/g)
    // Trim whitespace
    .map(s => s.trim())
    // Filter out empty strings
    .filter(Boolean)
    // Remove leading numbering or asterisks
    .map(s => s.replace(/^(\d+\.|\*\s*|\-\s*)/, ""))
    // Clean up common formatting
    .map(s => {
      // Remove quotes if the entire string is quoted
      if (s.startsWith('"') && s.endsWith('"')) {
        s = s.slice(1, -1);
      }
      if (s.startsWith("'") && s.endsWith("'")) {
        s = s.slice(1, -1);
      }
      return s.trim();
    })
    // Filter out common filler words when they're standalone
    .filter(s => {
      const lower = s.toLowerCase();
      return !['yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'thank you'].includes(lower);
    })
    // Final filter for non-empty
    .filter(s => s.length > 0);
}

/**
 * Extract specific identifiers from text
 * Useful for glossary promotion
 */
export function extractIdentifiers(text: string) {
  const identifiers = {
    routes: [] as string[],
    tables: [] as string[],
    numbers: [] as string[],
    enums: [] as string[]
  };

  // Extract routes (e.g., /api/v1/users, /auth/login)
  const routeRegex = /\/[a-z0-9\/_\-]+/gi;
  const routes = text.match(routeRegex) || [];
  identifiers.routes = [...new Set(routes)];

  // Extract potential table names (PascalCase words)
  const tableRegex = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g;
  const tables = text.match(tableRegex) || [];
  // Filter out common non-table words
  const commonWords = new Set(['The', 'This', 'That', 'These', 'Those', 'A', 'An', 'And', 'Or', 'But', 'If', 'When', 'Where', 'How', 'Why', 'What']);
  identifiers.tables = tables.filter(t => !commonWords.has(t));

  // Extract numbers with units (e.g., 60fps, 100ms, 5MB)
  const numberRegex = /\b\d+(?:\.\d+)?(?:\s*(?:fps|ms|s|mb|gb|kb|%|px|rem|em))\b/gi;
  const numbers = text.match(numberRegex) || [];
  identifiers.numbers = [...new Set(numbers)];

  // Extract potential enum values (UPPER_CASE or UPPER-CASE)
  const enumRegex = /\b[A-Z][A-Z_\-]+[A-Z]\b/g;
  const enums = text.match(enumRegex) || [];
  identifiers.enums = [...new Set(enums)];

  return identifiers;
}

/**
 * Clean option letters from answers (A), B), C: etc.)
 */
export function cleanOptionLetters(text: string): string {
  return text
    .replace(/^[A-Za-z]\)\s*/, '') // Remove A) B) etc at start
    .replace(/^[A-Za-z]:\s*/, '')  // Remove A: B: etc at start
    .replace(/^\([A-Za-z]\)\s*/, '') // Remove (A) (B) etc at start
    .trim();
}