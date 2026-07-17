/**
 * Shared types for institution content scripts.
 *
 * Each institution lives in src/extension/institutions/<name>.ts and must:
 *   1. Listen for the EXTRACT_STATEMENT message.
 *   2. Call sendResponse with an ExtractionResult on success,
 *      or { success: false, error: string } on failure.
 */

export interface ExtractionResult {
  success: true;
  /** Raw CSV string with header row */
  data: string;
  /** Suggested filename, e.g. "AmexJP_1234_2025-07_Statement.csv" */
  filename: string;
  /** Google Drive folder name to upload into */
  folderName: string;
}

export interface ExtractionError {
  success: false;
  error: string;
}

export type ExtractionResponse = ExtractionResult | ExtractionError;

/** Payload sent from popup → content script */
export interface ExtractPayload {
  includeStatementSuffix: boolean;
}
