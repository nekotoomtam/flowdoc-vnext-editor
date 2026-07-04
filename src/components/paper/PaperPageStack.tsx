import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react"
import { PaperPage } from "./PaperPage"
import type { NodeReorderDirection } from "../../editor/commands/commandTypes"
import type { CanvasReorderInteraction } from "../../editor/interaction/canvasReorderDragSession"
import { scrollCanvasReorderRootAtPointer } from "../../editor/interaction/canvasReorderAutoScroll"
import { hitTestCanvasReorderTarget } from "../../editor/interaction/canvasReorderHitTest"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderPageSummary } from "../../editor/render/renderTypes"
import { hitTestCanvasNodeTarget } from "../../editor/selection/hitTest"

interface PointerDragSession {
  dragging: boolean
  nodeId: string
  pointerId: number
  startX: number
  startY: number
}

interface AutoScrollSession {
  frameId: number | null
  pointerY: number
  root: HTMLElement
}

const POINTER_DRAG_THRESHOLD_PX = 6

export interface PaperPageStackProps {
  canvasReorderDrag: CanvasReorderInteraction
  onKeyboardReorderNode: (nodeId: string, direction: NodeReorderDirection) => void
  onSelectNode: (nodeId: string, source: "canvas") => void
  pageCount: number
  pages: RenderPageSummary[]
  paper: PaperModel
  selectedNodeId: string | null
}

export function PaperPageStack({
  canvasReorderDrag,
  onKeyboardReorderNode,
  onSelectNode,
  pageCount,
  pages,
  paper,
  selectedNodeId,
}: PaperPageStackProps) {
  const pointerDragSessionRef = useRef<PointerDragSession | null>(null)
  const suppressNextClickRef = useRef(false)
  const autoScrollSessionRef = useRef<AutoScrollSession | null>(null)

  const stopAutoScroll = useCallback(() => {
    const session = autoScrollSessionRef.current
    if (session?.frameId !== null && session?.frameId !== undefined) {
      window.cancelAnimationFrame(session.frameId)
    }
    autoScrollSessionRef.current = null
  }, [])

  const runAutoScroll = useCallback(() => {
    const session = autoScrollSessionRef.current
    if (!session) return

    scrollCanvasReorderRootAtPointer(session.root, session.pointerY)
    session.frameId = window.requestAnimationFrame(runAutoScroll)
  }, [])

  const updateAutoScroll = useCallback((stackElement: HTMLElement, pointerY: number) => {
    const root = stackElement.closest<HTMLElement>(".canvas-scroll-root")
    if (!root) return

    const currentSession = autoScrollSessionRef.current
    if (currentSession) {
      currentSession.pointerY = pointerY
      currentSession.root = root
      return
    }

    const session: AutoScrollSession = {
      frameId: null,
      pointerY,
      root,
    }
    autoScrollSessionRef.current = session
    session.frameId = window.requestAnimationFrame(runAutoScroll)
  }, [runAutoScroll])

  useEffect(() => stopAutoScroll, [stopAutoScroll])

  const handleCanvasClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      event.preventDefault()
      event.stopPropagation()
      return
    }

    const hit = hitTestCanvasNodeTarget(
      event.currentTarget,
      event.target,
      event.clientX,
      event.clientY,
    )
    if (hit.nodeId) onSelectNode(hit.nodeId, "canvas")
  }, [onSelectNode])

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const hit = hitTestCanvasNodeTarget(
      event.currentTarget,
      event.target,
      event.clientX,
      event.clientY,
    )
    if (!hit.nodeId) return

    const started = canvasReorderDrag.onDragStart(hit.nodeId, {
      x: event.clientX,
      y: event.clientY,
    })
    if (!started) return

    pointerDragSessionRef.current = {
      dragging: false,
      nodeId: hit.nodeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    onSelectNode(hit.nodeId, "canvas")
  }, [canvasReorderDrag, onSelectNode])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const session = pointerDragSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return

    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY)
    if (!session.dragging && distance < POINTER_DRAG_THRESHOLD_PX) return

    session.dragging = true
    updateAutoScroll(event.currentTarget, event.clientY)
    const target = event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY)
    const hit = hitTestCanvasReorderTarget(
      event.currentTarget,
      target,
      event.clientX,
      event.clientY,
    )
    if (!hit.nodeId || !hit.placement) return

    event.preventDefault()
    canvasReorderDrag.onDragOver(hit.nodeId, hit.placement, {
      x: event.clientX,
      y: event.clientY,
    })
  }, [canvasReorderDrag])

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const session = pointerDragSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return

    pointerDragSessionRef.current = null
    stopAutoScroll()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!session.dragging) {
      canvasReorderDrag.onDragEnd()
      return
    }

    suppressNextClickRef.current = true
    const target = event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY)
    const hit = hitTestCanvasReorderTarget(
      event.currentTarget,
      target,
      event.clientX,
      event.clientY,
    )
    if (!hit.nodeId || !hit.placement) {
      canvasReorderDrag.onDragEnd()
      return
    }

    event.preventDefault()
    canvasReorderDrag.onDrop(hit.nodeId, hit.placement, {
      x: event.clientX,
      y: event.clientY,
    })
  }, [canvasReorderDrag])

  const handlePointerCancel = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const session = pointerDragSessionRef.current
    if (session?.pointerId === event.pointerId) {
      pointerDragSessionRef.current = null
    }
    stopAutoScroll()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    canvasReorderDrag.onDragEnd()
  }, [canvasReorderDrag])

  return (
    <div
      className="paper-page-stack"
      aria-label="Preview page stack"
      data-reorder-active={canvasReorderDrag.dragState.status === "dragging" ? "true" : "false"}
      onClick={handleCanvasClick}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {pages.map((page) => (
        <PaperPage
          canvasReorderDrag={canvasReorderDrag}
          key={page.id}
          onKeyboardReorderNode={onKeyboardReorderNode}
          page={page}
          pageCount={pageCount}
          paper={paper}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  )
}
