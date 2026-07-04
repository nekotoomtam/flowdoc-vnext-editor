import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { getPaperDocumentStackGeometry } from "../editor/paper/paperGeometry"
import { createPaperModel, setPaperZoom } from "../editor/paper/paperModel"
import { createCanvasRenderModel } from "../editor/render/canvasRenderModel"
import { createEditorCanvasRenderView } from "../editor/runtime/editorCanvasRenderView"
import { createInitialEditorStateFromWorkingSet } from "../editor/runtime/editorState"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const projectRoot = dirname(repoRoot)

function readSource(...segments: string[]): string {
  return readFileSync(join(projectRoot, ...segments), "utf8")
}

function createRuntimeState() {
  return createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
    createdAt: 100,
  }))
}

describe("render partition boundaries", () => {
  it("derives canvas geometry and measurement keys from the paper model", () => {
    const state = createRuntimeState()
    const paper = setPaperZoom(createPaperModel("Letter"), 0.75)
    const canvasRenderView = createEditorCanvasRenderView(state.view, paper)
    const renderModel = createCanvasRenderModel({
      document: state.core.document,
      pages: canvasRenderView.pages,
      paper,
    })
    const stackGeometry = getPaperDocumentStackGeometry(paper, canvasRenderView.pages.length)

    expect(renderModel).toMatchObject({
      documentTitle: state.core.document.title,
      pageCount: canvasRenderView.pages.length,
      paper,
      paperSizeLabel: `${paper.widthPx} x ${paper.heightPx}px`,
      stackGeometry,
      viewportMeasurementKey: `${paper.preset}:${paper.zoom}:${stackGeometry.stackHeightPx}:${canvasRenderView.pages.length}`,
    })
  })

  it("keeps selection-only commands from rebuilding the editor view", () => {
    const state = createRuntimeState()
    const selected = dispatchEditorRuntimeCommand(state, {
      kind: "selection.selectNode",
      reason: "render-partition-test",
      source: "canvas",
      target: {
        nodeId: "next-steps",
      },
    }).state

    expect(selected.selection.selectedNodeId).toBe("next-steps")
    expect(selected.view).toBe(state.view)
    expect(selected.core).toBe(state.core)
    expect(selected.paper).toBe(state.paper)
  })

  it("keeps canvas, page, block, and overlay rendering behind explicit components", () => {
    const shellSource = readSource("src", "app", "EditorShell.tsx")
    const surfaceSource = readSource("src", "components", "canvas", "CanvasSurface.tsx")
    const stageSource = readSource("src", "components", "canvas", "CanvasStage.tsx")
    const paperPageSource = readSource("src", "components", "paper", "PaperPage.tsx")
    const paperBlockSource = readSource("src", "components", "paper", "PaperBlock.tsx")

    expect(shellSource).toContain("createEditorCanvasRenderView")
    expect(shellSource).toContain("useMemo(() => createEditorCanvasRenderView(view, paper), [paper, view])")
    expect(shellSource).not.toContain("renderProjector")
    expect(shellSource).not.toContain("projectPreviewPages")

    expect(surfaceSource).toContain("createCanvasRenderModel")
    expect(surfaceSource).toContain("<CanvasStage")
    expect(surfaceSource).not.toContain("pages.map")
    expect(surfaceSource).not.toContain("paper-page-stack")

    expect(stageSource).toContain("<CanvasPageMeta")
    expect(stageSource).toContain("<PaperPageStack")
    expect(stageSource).toContain("<CanvasOverlayLayer")

    expect(paperPageSource).toContain("<PaperBlock")
    expect(paperPageSource).not.toContain("paper-block--")
    expect(paperBlockSource).toContain("memo(function PaperBlock")
    expect(paperBlockSource).toContain("function ColumnsPreview")
    expect(paperBlockSource).toContain("function TablePreview")
  })

  it("keeps paper surface previews content-sized instead of stretching cards across the page", () => {
    const editorCss = readSource("src", "styles", "editor.css")

    expect(editorCss).toContain("align-content: start")
    expect(editorCss).toContain("grid-auto-rows: max-content")
    expect(editorCss).toContain(".paper-columns-preview")
    expect(editorCss).toContain(".paper-table-preview")
  })
})
