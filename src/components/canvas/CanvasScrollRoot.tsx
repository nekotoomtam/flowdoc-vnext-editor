import type { ReactNode } from "react"

export interface CanvasScrollRootProps {
  children: ReactNode
}

export function CanvasScrollRoot({ children }: CanvasScrollRootProps) {
  return (
    <section className="canvas-scroll-root" aria-label="Document canvas">
      {children}
    </section>
  )
}
