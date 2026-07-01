export type LayoutStatus = "fresh" | "stale" | "updating" | "blocked" | "unknown"

export interface EditorLayoutStatus {
  exactLayoutStatus: LayoutStatus
  liveLayoutStatus: LayoutStatus
}

export function createLayoutStatus(): EditorLayoutStatus {
  return {
    exactLayoutStatus: "unknown",
    liveLayoutStatus: "unknown",
  }
}
