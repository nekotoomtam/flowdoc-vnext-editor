import { PaperPage } from "./PaperPage"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderPageSummary } from "../../editor/render/renderTypes"

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
  return (
    <div className="paper-page-stack" aria-label="Preview page stack">
      {pages.map((page) => (
        <PaperPage
          key={page.id}
          page={page}
          pageCount={pageCount}
          paper={paper}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      ))}
    </div>
  )
}
