import type { EditorLayoutStatus } from "./layoutStatus"

export function markLiveLayoutStale(status: EditorLayoutStatus): EditorLayoutStatus {
  return {
    ...status,
    liveLayoutStatus: "stale",
  }
}
