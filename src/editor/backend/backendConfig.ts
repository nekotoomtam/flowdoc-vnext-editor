import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID } from "../../core/coreAdapter"

export const DEFAULT_FLOWDOC_BACKEND_URL = "http://127.0.0.1:4011"
export const DEFAULT_FLOWDOC_DOCUMENT_ID = CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID

export function resolveFlowDocBackendBaseUrl(configuredUrl: string | undefined): string {
  const trimmed = configuredUrl?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_FLOWDOC_BACKEND_URL
}

export function resolveFlowDocDocumentId(configuredDocumentId: string | undefined): string {
  const trimmed = configuredDocumentId?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_FLOWDOC_DOCUMENT_ID
}
