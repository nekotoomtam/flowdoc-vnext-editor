export type RuntimeDocumentMigrationStatusKind =
  | "idle"
  | "pending"
  | "applied"
  | "replayed"
  | "stale"
  | "rejected"
  | "failed"

export interface RuntimeDocumentMigrationStatus {
  message: string
  requestId: string | null
  revision: number | null
  status: RuntimeDocumentMigrationStatusKind
}

export const IDLE_DOCUMENT_MIGRATION_STATUS: RuntimeDocumentMigrationStatus = {
  message: "",
  requestId: null,
  revision: null,
  status: "idle",
}
