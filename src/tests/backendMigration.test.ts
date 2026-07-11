import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import activeFixture from "@flowdoc/vnext-core/fixtures/product-report-vnext-minimal.flowdoc.json"
import targetFixture from "@flowdoc/vnext-core/fixtures/product-report-v4-migrated-minimal.flowdoc.json"
import {
  canRetryBackendMigrationRequest,
  createBackendMigrationRequest,
} from "../editor/backend/backendMigrationRequests"
import {
  createBackendDocumentReadResult,
  createFlowDocBackendClient,
  type BackendMigrationRequest,
  type BackendMigrationResultEnvelope,
} from "../editor/backend/backendTransport"
import { loadFrontendCoreWorkingSetFromTransportEnvelope } from "../editor/coreBinding/workingSetFactory"
import { createInitialEditorStateFromWorkingSet } from "../editor/runtime/editorState"
import { applyRuntimeBackendMigrationResult } from "../editor/runtime/runtimeBackendMigration"

const DOCUMENT_ID = "product-report-vnext-minimal"

function activeState(sourceKind: "api" | "fixture" = "api") {
  return createInitialEditorStateFromWorkingSet(loadFrontendCoreWorkingSetFromTransportEnvelope({
    baseRevision: 3,
    documentId: DOCUMENT_ID,
    envelopeId: "active-read:3",
    packageValue: activeFixture,
    purpose: "initial-load",
    receivedAt: 120,
    requestedAt: 100,
    sourceKind,
    sourceRevision: 3,
  }))
}

function request(): BackendMigrationRequest {
  return {
    baseRevision: 3,
    documentId: DOCUMENT_ID,
    reason: "editor-explicit-version-upgrade",
    requestId: "migration-request-1",
    source: "editor",
  }
}

function result(
  status: BackendMigrationResultEnvelope["status"] = "applied",
  idempotency: BackendMigrationResultEnvelope["idempotency"] = "new",
): BackendMigrationResultEnvelope {
  return {
    baseRevision: 3,
    documentId: DOCUMENT_ID,
    idempotency,
    issues: status === "applied" ? [] : [{
      code: status === "stale" ? "revision-stale" : "migration-blocked",
      message: status === "stale" ? "document revision is stale" : "migration was blocked",
      path: status === "stale" ? "baseRevision" : "",
      severity: "error",
    }],
    receivedAt: 150,
    requestId: "migration-request-1",
    requestedAt: 140,
    revision: status === "applied" ? 4 : 3,
    sourceSnapshot: status === "applied" ? {
      retainedAt: "2026-07-11T00:00:00.000Z",
      sourceRevision: 3,
      targetRevision: 4,
    } : null,
    status,
    summary: status === "applied" ? {
      changeCount: 4,
      errorCount: 0,
      normalizedTextBlockCount: 1,
      warningCount: 0,
    } : null,
    target: status === "applied" ? { packageVersion: 3, documentVersion: 4 } : null,
  }
}

function targetRead(revision = 4) {
  return createBackendDocumentReadResult({
    documentId: DOCUMENT_ID,
    packageValue: targetFixture,
    revision,
    status: "found",
    updatedAt: "2026-07-11T00:00:00.000Z",
  }, {
    receivedAt: 180,
    requestedAt: 160,
    statusCode: 200,
  })
}

describe("explicit backend document migration", () => {
  it("builds migration intent only from a fresh active backend document", () => {
    expect(createBackendMigrationRequest(activeState(), {
      reason: "explicit-upgrade",
      requestId: "migration-request-1",
    })).toEqual({
      request: {
        baseRevision: 3,
        documentId: DOCUMENT_ID,
        reason: "explicit-upgrade",
        requestId: "migration-request-1",
        source: "editor",
      },
      status: "ready",
    })
    expect(createBackendMigrationRequest(activeState("fixture"), {
      requestId: "migration-request-2",
    })).toEqual({ reason: "not-backend-document", status: "blocked" })
    expect(canRetryBackendMigrationRequest(activeState(), request())).toBe(true)
    expect(canRetryBackendMigrationRequest(activeState(), {
      ...request(),
      baseRevision: 2,
    })).toBe(false)
  })

  it("applies a verified target read as a v4 read-only runtime", () => {
    const state = activeState()
    const applied = applyRuntimeBackendMigrationResult(state, request(), result(), targetRead())

    expect(applied).toMatchObject({ status: "applied", reason: null })
    expect(applied.state.core.envelope).toMatchObject({
      documentRevision: 4,
      documentVersion: 4,
      packageVersion: 3,
      sourceKind: "api",
    })
    expect(applied.state.seed.document.runtimeMode).toBe("partial")
    expect(applied.state.core.capabilities.global).toMatchObject({
      canCommitMutation: false,
      canRequestLiveLayout: false,
    })
  })

  it("accepts an idempotent replay only after verifying the retained target read", () => {
    expect(applyRuntimeBackendMigrationResult(
      activeState(),
      request(),
      result("applied", "replayed"),
      targetRead(),
    )).toMatchObject({
      status: "replayed",
      state: { seed: { document: { runtimeMode: "partial" } } },
    })
  })

  it("keeps runtime state unchanged for stale, rejected, and mismatched target reads", () => {
    const state = activeState()
    const stale = applyRuntimeBackendMigrationResult(state, request(), result("stale", null), null)
    const rejected = applyRuntimeBackendMigrationResult(state, request(), result("rejected", null), null)
    const mismatchedRead = applyRuntimeBackendMigrationResult(state, request(), result(), targetRead(5))

    expect(stale).toMatchObject({ status: "stale", reason: "revision-stale" })
    expect(rejected).toMatchObject({ status: "rejected", reason: "migration-blocked" })
    expect(mismatchedRead).toMatchObject({
      status: "blocked-stale",
      reason: "target-read-revision-mismatch",
    })
    expect(stale.state).toBe(state)
    expect(rejected.state).toBe(state)
    expect(mismatchedRead.state).toBe(state)
  })

  it("posts explicit intent to the backend migration route", async () => {
    const migrationResult = result()
    const client = createFlowDocBackendClient({
      baseUrl: "http://backend.test/",
      fetchImpl: async (input, init) => {
        expect(input).toBe(
          `http://backend.test/documents/${DOCUMENT_ID}/migrations/package-v3-document-v4`,
        )
        expect(init).toMatchObject({
          method: "POST",
          headers: { "content-type": "application/json" },
        })
        expect(JSON.parse(init?.body ?? "{}")).toEqual(request())
        return {
          json: async () => migrationResult,
          ok: true,
          status: 200,
        }
      },
    })

    await expect(client.migrateDocument(request())).resolves.toEqual(migrationResult)
  })

  it("publishes the explicit migration ownership and result boundary", () => {
    const doc = readFileSync(new URL("../../docs/MIGRATION_INTENT_WORKFLOW.md", import.meta.url), "utf8")

    for (const section of [
      "## Execution Flow",
      "## Result States",
      "## PASS",
      "## FAIL / BLOCKER",
      "## RISK",
      "## UNKNOWN",
      "## Intentionally Not Changed",
      "## Next Recommended Direction",
    ]) {
      expect(doc).toContain(section)
    }
    expect(doc).toContain("Package reads never trigger migration automatically")
    expect(doc).toContain("v4 partial-operation working-set replacement")
  })
})
