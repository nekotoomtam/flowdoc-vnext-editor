import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import {
  canApplyCoreDerivedResultToEnvelope,
  getCoreDerivedApplyBlockReason,
} from "../editor/coreBinding/revisionGuards"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const projectRoot = dirname(repoRoot)
const sourceRoot = join(projectRoot, "src")

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(entryPath)
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : []
  })
}

function read(path: string): string {
  return readFileSync(path, "utf8")
}

describe("core read binding working set", () => {
  it("keeps envelope, read model, capabilities, and render projection revision-aligned", () => {
    const workingSet = loadInitialCoreWorkingSet({
      createdAt: 100,
      renderProjectionKind: "live",
    })
    const revision = workingSet.envelope.documentRevision

    expect(workingSet.envelope).toMatchObject({
      coreRevision: `fixture:${revision}`,
      createdAt: 100,
      documentId: workingSet.document.id,
      documentRevision: revision,
      documentVersion: workingSet.document.documentVersion,
      packageVersion: workingSet.document.packageVersion,
      schemaVersion: workingSet.document.packageVersion,
      snapshotRevision: revision,
      sourceKind: "fixture",
      status: "fresh",
    })
    expect(workingSet.readModel.sourceRevision).toBe(revision)
    expect(workingSet.capabilities.sourceRevision).toBe(revision)
    expect(workingSet.renderProjection?.sourceRevision).toBe(revision)
    expect(workingSet.renderProjection).toMatchObject({
      kind: "live",
      stale: false,
    })
    expect(workingSet.renderProjection?.pageCount).toBeGreaterThan(0)
    expect(workingSet.renderProjection?.nodeToBlockIds["qa-scroll"]).toHaveLength(1)
    expect(workingSet.renderProjection?.nodeToBlockIds["qa-scroll"][0]).toMatch(
      /^preview-page-\d+:block:qa-scroll$/u,
    )
  })

  it("blocks core-derived results that drift by base revision, source revision, or stale flags", () => {
    const workingSet = loadInitialCoreWorkingSet({
      createdAt: 100,
    })
    const envelope = workingSet.envelope

    expect(canApplyCoreDerivedResultToEnvelope({
      baseRevision: envelope.documentRevision,
      documentId: envelope.documentId,
      sourceRevision: envelope.documentRevision,
    }, envelope)).toBe(true)
    expect(getCoreDerivedApplyBlockReason({
      baseRevision: envelope.documentRevision - 1,
      documentId: envelope.documentId,
      sourceRevision: envelope.documentRevision,
    }, envelope)).toBe("base-revision-mismatch")
    expect(getCoreDerivedApplyBlockReason({
      baseRevision: envelope.documentRevision,
      documentId: "other-document",
      sourceRevision: envelope.documentRevision,
    }, envelope)).toBe("document-mismatch")
    expect(getCoreDerivedApplyBlockReason({
      baseRevision: envelope.documentRevision,
      documentId: envelope.documentId,
      sourceRevision: envelope.documentRevision - 1,
    }, envelope)).toBe("revision-mismatch")
    expect(getCoreDerivedApplyBlockReason({
      baseRevision: envelope.documentRevision,
      documentId: envelope.documentId,
      sourceRevision: envelope.documentRevision,
      stale: true,
    }, envelope)).toBe("cache-stale")
    expect(getCoreDerivedApplyBlockReason({
      baseRevision: envelope.documentRevision,
      documentId: envelope.documentId,
      sourceRevision: envelope.documentRevision,
    }, {
      ...envelope,
      status: "partial",
    })).toBe("envelope-not-fresh")
  })

  it("does not import direct core source files from frontend source", () => {
    const blockedPosixPath = ["flowdoc-vnext-core", "src"].join("/")
    const blockedWindowsPath = ["flowdoc-vnext-core", "src"].join("\\")
    const offenders = sourceFiles(sourceRoot)
      .filter((file) => {
        const source = read(file)
        return source.includes(blockedPosixPath) || source.includes(blockedWindowsPath)
      })
      .map((file) => relative(projectRoot, file))

    expect(offenders).toEqual([])
  })
})
