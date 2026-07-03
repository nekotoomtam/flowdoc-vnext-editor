export const DEFAULT_FLOWDOC_BACKEND_URL = "http://127.0.0.1:4011"

export function resolveFlowDocBackendBaseUrl(configuredUrl: string | undefined): string {
  const trimmed = configuredUrl?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_FLOWDOC_BACKEND_URL
}
