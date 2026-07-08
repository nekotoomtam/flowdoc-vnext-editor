import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { resolveFlowDocLayoutQaEnabled } from "../editor/config/editorFeatureConfig"
import { createRenderProjectionLayoutQaSummary } from "../editor/render/renderProjectionLayoutQa"
import type { RenderPageSummary } from "../editor/render/renderTypes"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const projectRoot = dirname(repoRoot)

function readSource(...segments: string[]): string {
  return readFileSync(join(projectRoot, ...segments), "utf8")
}

function pageFixture(input: {
  estimatedContentHeightPx: number
  flowCapacityPx: number
  id: string
  overflowStatus: RenderPageSummary["overflowStatus"]
}): RenderPageSummary {
  return {
    estimatedContentHeightPx: input.estimatedContentHeightPx,
    flowCapacityPx: input.flowCapacityPx,
    id: input.id,
    nodeIds: [],
    nodes: [],
    overflowStatus: input.overflowStatus,
    pageNumber: Number(input.id.replace("page-", "")),
  }
}

describe("layout QA feature config", () => {
  it("keeps layout QA disabled unless explicitly enabled", () => {
    expect(resolveFlowDocLayoutQaEnabled(undefined)).toBe(false)
    expect(resolveFlowDocLayoutQaEnabled("")).toBe(false)
    expect(resolveFlowDocLayoutQaEnabled("false")).toBe(false)
    expect(resolveFlowDocLayoutQaEnabled("0")).toBe(false)
    expect(resolveFlowDocLayoutQaEnabled(" true ")).toBe(true)
    expect(resolveFlowDocLayoutQaEnabled("1")).toBe(true)
    expect(resolveFlowDocLayoutQaEnabled("YES")).toBe(true)
    expect(resolveFlowDocLayoutQaEnabled("on")).toBe(true)
  })

  it("summarizes render projection fit and overflow pages for QA", () => {
    const summary = createRenderProjectionLayoutQaSummary([
      pageFixture({
        estimatedContentHeightPx: 100,
        flowCapacityPx: 200,
        id: "page-1",
        overflowStatus: "fits",
      }),
      pageFixture({
        estimatedContentHeightPx: 240,
        flowCapacityPx: 200,
        id: "page-2",
        overflowStatus: "single-node-overflow",
      }),
      pageFixture({
        estimatedContentHeightPx: 300,
        flowCapacityPx: 200,
        id: "page-3",
        overflowStatus: "multi-node-overflow",
      }),
    ])

    expect(summary).toEqual({
      fitPageCount: 1,
      maxEstimatedFillPercent: 150,
      multiNodeOverflowPageCount: 1,
      overflowPageCount: 2,
      pageCount: 3,
      singleNodeOverflowPageCount: 1,
    })
  })

  it("wires layout QA into the status bar only through the feature flag", () => {
    const appSource = readSource("src", "app", "EditorApp.tsx")
    const shellSource = readSource("src", "app", "EditorShell.tsx")
    const statusSource = readSource("src", "components", "shell", "StatusBar.tsx")

    expect(appSource).toContain("VITE_FLOWDOC_LAYOUT_QA")
    expect(appSource).toContain("resolveFlowDocLayoutQaEnabled")
    expect(shellSource).toContain("layoutQaEnabled")
    expect(shellSource).toContain("createRenderProjectionLayoutQaSummary")
    expect(shellSource).toContain("layoutQaEnabled")
    expect(statusSource).toContain("layoutQaSummary ?")
    expect(statusSource).toContain("Layout QA:")
    expect(statusSource).toContain("Max fill:")
  })
})
