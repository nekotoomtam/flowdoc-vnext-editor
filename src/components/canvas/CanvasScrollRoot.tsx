import { useCallback, useEffect, useRef, type ReactNode } from "react"
import {
  createViewportScrollRootFacts,
  type ViewportPageBox,
  type ViewportScrollRootFacts,
} from "../../editor/viewport/viewportMeasurement"

const VIEWPORT_SCROLL_SETTLE_MS = 80

export interface CanvasScrollRootProps {
  children: ReactNode
  measurementKey: string
  onViewportFactsChange: (facts: ViewportScrollRootFacts) => void
}

function readCanvasScrollRootFacts(root: HTMLElement): ViewportScrollRootFacts {
  const rootRect = root.getBoundingClientRect()
  const pageBoxes: ViewportPageBox[] = Array.from(root.querySelectorAll<HTMLElement>("[data-page-id]"))
    .map((page) => {
      const pageRect = page.getBoundingClientRect()

      return {
        bottom: pageRect.bottom - rootRect.top,
        id: page.dataset.pageId ?? "",
        top: pageRect.top - rootRect.top,
      }
    })

  return createViewportScrollRootFacts({
    contentHeight: root.scrollHeight,
    contentWidth: root.scrollWidth,
    pageBoxes,
    scrollLeft: root.scrollLeft,
    scrollTop: root.scrollTop,
    viewportHeight: root.clientHeight,
    viewportWidth: root.clientWidth,
  })
}

export function CanvasScrollRoot({
  children,
  measurementKey,
  onViewportFactsChange,
}: CanvasScrollRootProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  const scrollSettleTimer = useRef<number | null>(null)

  const emitViewportFacts = useCallback(() => {
    if (!rootRef.current) return
    onViewportFactsChange(readCanvasScrollRootFacts(rootRef.current))
  }, [onViewportFactsChange])

  const clearScrollSettleTimer = useCallback(() => {
    if (scrollSettleTimer.current === null) return
    window.clearTimeout(scrollSettleTimer.current)
    scrollSettleTimer.current = null
  }, [])

  const scheduleSettledScrollFacts = useCallback(() => {
    clearScrollSettleTimer()
    scrollSettleTimer.current = window.setTimeout(() => {
      scrollSettleTimer.current = null
      emitViewportFacts()
    }, VIEWPORT_SCROLL_SETTLE_MS)
  }, [clearScrollSettleTimer, emitViewportFacts])

  useEffect(() => {
    emitViewportFacts()
  }, [emitViewportFacts, measurementKey])

  useEffect(() => {
    window.addEventListener("resize", scheduleSettledScrollFacts)
    return () => {
      window.removeEventListener("resize", scheduleSettledScrollFacts)
      clearScrollSettleTimer()
    }
  }, [clearScrollSettleTimer, scheduleSettledScrollFacts])

  return (
    <section
      className="canvas-scroll-root"
      aria-label="Document canvas"
      onScroll={scheduleSettledScrollFacts}
      ref={rootRef}
    >
      {children}
    </section>
  )
}
