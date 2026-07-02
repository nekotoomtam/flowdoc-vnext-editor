import { useCallback, type MouseEvent } from "react"
import { PaperPage } from "./PaperPage"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderPageSummary } from "../../editor/render/renderTypes"
import { hitTestCanvasNodeTarget } from "../../editor/selection/hitTest"

export interface PaperPageStackProps {
  onSelectNode: (nodeId: string, source: "canvas") => void
  pageCount: number
  pages: RenderPageSummary[]
  paper: PaperModel
  selectedNodeId: string | null
}

export function PaperPageStack({
  onSelectNode,
  pageCount,
  pages,
  paper,
  selectedNodeId,
}: PaperPageStackProps) {
  const handleCanvasClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const hit = hitTestCanvasNodeTarget(
      event.currentTarget,
      event.target,
      event.clientX,
      event.clientY,
    )
    if (hit.nodeId) onSelectNode(hit.nodeId, "canvas")
  }, [onSelectNode])

  return (
    <div className="paper-page-stack" aria-label="Preview page stack" onClick={handleCanvasClick}>
      {pages.map((page) => (
        <PaperPage
          key={page.id}
          page={page}
          pageCount={pageCount}
          paper={paper}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  )
}
