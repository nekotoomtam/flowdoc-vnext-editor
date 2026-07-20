import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

interface SmokeEvidenceV1 {
  evidenceId: string
  status: string
  execution: Record<string, boolean | string>
  rows: Array<{
    status: string
    normalizedResult: {
      summary: { glyphCount: number; missingGlyphCount: number }
      breakByteOffsets: number[]
    }
  }>
  scope: Record<string, boolean>
}

describe("LIVE-DRAFT-XR-1 retained Browser Worker smoke", () => {
  it("retains two matched runtime rows without widening the product claim", () => {
    const evidence = JSON.parse(readFileSync(
      new URL("../fixtures/live-draft-xr1-browser-worker-smoke.v1.json", import.meta.url),
      "utf8",
    )) as SmokeEvidenceV1
    expect(evidence.evidenceId).toBe("live-draft-xr1-browser-worker-smoke-v1")
    expect(evidence.status).toBe("accepted-two-row-runtime-smoke")
    expect(evidence.execution).toMatchObject({
      realBrowserWorker: true,
      nodeNativeRustybuzz: true,
      nodeNativeIcu4x: true,
      workerWasmRustybuzz: true,
      workerWasmIcu4x: true,
    })
    expect(evidence.rows).toHaveLength(2)
    expect(evidence.rows.every((row) => (
      row.status === "matched"
      && row.normalizedResult.summary.glyphCount > 0
      && row.normalizedResult.summary.missingGlyphCount === 0
      && row.normalizedResult.breakByteOffsets.length > 1
    ))).toBe(true)
    expect(evidence.scope).toEqual({
      acceptedRowsOnly: true,
      crossRuntimeExactnessClaim: false,
      productionBinding: false,
      defaultMeasurerReplacement: false,
      formBinding: false,
      backendRequestPerKeystroke: false,
    })
  })
})
