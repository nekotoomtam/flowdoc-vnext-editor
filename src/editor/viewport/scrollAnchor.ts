import type { ViewportAnchor, ViewportAnchorAlign, ViewportAnchorKind } from "./viewportTypes"

export function createScrollAnchor(
  targetId: string,
  reason: string,
  kind: ViewportAnchorKind = "node",
  align: ViewportAnchorAlign = "center",
): ViewportAnchor {
  return {
    align,
    id: `manual-anchor-${kind}-${targetId}`,
    kind,
    offset: 0,
    reason,
    targetId,
  }
}
