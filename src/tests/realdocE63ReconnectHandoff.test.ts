import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.6.3 Editor reconnect handoff", () => {
  it("documents the strict content-free reconnect and stale-result boundary", () => {
    const doc = read("../../docs/REALDOC_CROSS_REPO_LIFECYCLE.md")

    for (const section of [
      "## Session Reconnect Record",
      "## Exact Resume",
      "## Stale Result Rejection",
      "## Cancellation Reconciliation",
      "## Accepted Evidence",
      "## Explicitly Not Changed",
      "## Next Decision",
    ]) expect(doc).toContain(section)
    expect(doc).toContain("Form values, collections, JSON payload text")
    expect(doc).toContain("749,929-byte 69C JSON")
    expect(doc).toContain("10-page, 1,417,544-byte artifact")
    expect(doc).toContain("390 x 844")
    expect(doc).toContain("Production remains NO-GO")
  })

  it("keeps the persisted record content-free and restores the latest target", () => {
    const reconnect = read("../editor/preview/exactPreviewReconnect.ts")
    const generation = read("../app/usePublishedPreviewGeneration.ts")
    const qa = read("../components/preview/PublishedPreviewQaPage.tsx")

    expect(reconnect).toContain("sessionStorageOnly: true")
    expect(reconnect).toContain("formValuesStored: false")
    expect(reconnect).toContain("rawJsonPayloadStored: false")
    expect(reconnect).toContain("canonicalBusinessDataStored: false")
    expect(reconnect).toContain("EXACT_PREVIEW_RECONNECT_TARGET_STORAGE_KEY")
    expect(generation).toContain('setActivity("reconnecting")')
    expect(generation).toContain("createExactPreviewInputIdentityV1")
    expect(qa).toContain('readExactPreviewReconnectTargetV1() ?? "draft"')
  })
})
