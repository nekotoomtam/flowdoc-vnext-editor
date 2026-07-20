import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createVNextPublishedStructureMappingProfileV1 } from "@flowdoc/vnext-core"
import { describe, expect, it, vi } from "vitest"
import type { PublishedPreviewGenerationInteraction } from "../app/usePublishedPreviewGeneration"
import type { PreviewTestInputInteraction } from "../app/usePreviewTestInput"
import { PreviewTestInputView } from "../components/preview/PreviewTestInputView"
import { createTestInputFormState } from "../editor/preview/testInputFormState"
import {
  applyTestInputJsonCommand,
  createTestInputJsonDiagnostics,
  createTestInputJsonState,
} from "../editor/preview/testInputJsonState"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"
import { projectExactPreviewLifecycle } from "../editor/preview/exactPreviewLifecycle"

const hash = (seed: string) => `sha256:${seed.repeat(64).slice(0, 64)}`
const profile = createVNextPublishedStructureMappingProfileV1({
  mappingProfileId: "mapping:published-preview-qa",
  mappingProfileVersion: 1,
  owner: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
  sourceContract: {
    sourceContractId: "source:published-preview-qa",
    sourceContractVersion: 1,
    schemaFingerprint: hash("1"),
  },
  target: {
    dataContractId: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractId,
    dataContractFingerprint:
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractFingerprint,
  },
  execution: {
    kind: "named-adapter",
    adapterId: "adapter:published-preview-qa",
    adapterVersion: 1,
    implementationFingerprint: hash("2"),
  },
})
const mappingProfiles = [{ label: "Published Preview QA", profile }]

function input(mode: "form" | "json"): PreviewTestInputInteraction {
  const initial = createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
  const withPayload = applyTestInputJsonCommand(
    initial,
    REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
    mappingProfiles,
    { kind: "json.text.set", payloadText: '{"records":[]}' },
  ).state
  const json = applyTestInputJsonCommand(
    withPayload,
    REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
    mappingProfiles,
    {
      kind: "mapping-profile.select",
      selection: {
        mappingProfileId: profile.mappingProfileId,
        mappingProfileVersion: profile.mappingProfileVersion,
        profileFingerprint: profile.profileFingerprint,
      },
    },
  ).state
  return {
    mode,
    form: {
      state: createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE),
      lastIssue: null,
      addCollectionItem: vi.fn(),
      removeCollectionItem: vi.fn(),
      reset: vi.fn(),
      setCollectionIncluded: vi.fn(),
      setCollectionItemImage: vi.fn(),
      setCollectionItemKey: vi.fn(),
      setCollectionItemValue: vi.fn(),
      setDocumentImage: vi.fn(),
      setDocumentValue: vi.fn(),
      getSelectedFile: vi.fn(() => null),
    },
    json: {
      state: json,
      diagnostics: createTestInputJsonDiagnostics(
        json,
        REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
        mappingProfiles,
      ),
      lastIssue: null,
      mappingProfiles,
      clearPayload: vi.fn(),
      reset: vi.fn(),
      selectFile: vi.fn(async () => undefined),
      selectMappingProfile: vi.fn(),
      setPayloadText: vi.fn(),
    },
    resetActive: vi.fn(),
    setMode: vi.fn(),
  }
}

function preview(
  stale = false,
  target: "draft" | "published" = "published",
): PublishedPreviewGenerationInteraction {
  const lifecycle = projectExactPreviewLifecycle({
    activity: "idle",
    error: null,
    operationState: "completed",
    phase: "completed",
    stale,
  })
  return {
    target,
    phase: "completed",
    activity: "idle",
    receipt: {
      admissionId: "admission:qa",
      status: "ready-with-warnings",
      lane: "adapted",
      structure: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
      dataContract: {
        dataContractId: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractId,
        dataContractFingerprint:
          REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractFingerprint,
        publishedStructureFingerprint: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.structureFingerprint,
      },
      instance: {
        contractVersion: 1,
        kind: "document-instance",
        instanceId: "instance:qa",
        revision: 0,
        structureVersion: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
      },
      inputFingerprint: hash("3"),
      canonicalInputFingerprint: hash("4"),
      mappingProfile: {
        mappingProfileId: profile.mappingProfileId,
        mappingProfileVersion: profile.mappingProfileVersion,
        profileFingerprint: profile.profileFingerprint,
      },
      diagnostics: {
        contentFree: true,
        issues: [],
        warnings: [
          {
            severity: "warning",
            code: "value-defaulted",
            path: "document.wardName",
            message: "A published default was applied.",
          },
          {
            severity: "warning",
            code: "empty-collection",
            path: "collections.requirements",
            message: "The collection did not contain any items.",
          },
        ],
        summary: {
          errorCount: 0,
          warningCount: 2,
          scalarValueCount: 17,
          collectionSnapshotCount: 1,
          collectionItemCount: 18,
          mediaAssetCount: 7,
          defaultAppliedCount: 0,
        },
        diagnosticsFingerprint: hash("5"),
      },
      execution: {
        mapping: "executed",
        runtimeValidation: "run-valid",
        materialization: "not-run",
        resolution: "not-run",
        measurement: "not-run",
        pagination: "not-run",
        artifact: "not-run",
      },
      contracts: {
        canonicalBusinessDataExposed: false,
        rawPayloadRetained: false,
        productionBinding: false,
      },
      receiptFingerprint: hash("6"),
    },
    operation: {
      operationId: "operation:qa",
      exportRequestId: "request:qa",
      artifactId: "artifact:qa",
      documentId: "instance:qa",
      documentRevision: 0,
      state: "completed",
      acceptedAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:01.000Z",
      terminalStatus: "completed",
      stopReason: null,
      pageCount: 10,
      byteLength: 1_417_544,
    },
    stale,
    error: null,
    lifecycle,
    canGenerate: true,
    artifactUrl: stale ? null : "/api/pdf-export-local/pdf-exports/operation%3Aqa/download",
    generate: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    download: vi.fn(),
  }
}

const document = { id: "qa", title: "69C QA", packageVersion: 3, documentVersion: 4 }

describe("PDF-EXPORT-REALDOC-E.5.6 Published Preview UI", () => {
  it("renders a content-free mapped receipt and the exact completed PDF", () => {
    const markup = renderToStaticMarkup(createElement(PreviewTestInputView, {
      document,
      interaction: input("json"),
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      publishedPreview: preview(),
    }))

    expect(markup).toContain("Generate again")
    expect(markup).toContain("Exact PDF ready")
    expect(markup).toContain("10 pages")
    expect(markup).toContain("Mapped result")
    expect(markup).toContain("Result diagnostics")
    expect(markup).toContain("1 of 2")
    expect(markup).toContain("value-defaulted")
    expect(markup).toContain("run-valid")
    expect(markup).toContain("operation%3Aqa/download")
    expect(markup).not.toContain("canonicalBusinessData")
  })

  it("hides the old artifact after edits and exposes the Form JSON draft separately", () => {
    const staleMarkup = renderToStaticMarkup(createElement(PreviewTestInputView, {
      document,
      interaction: input("json"),
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      publishedPreview: preview(true),
    }))
    expect(staleMarkup).toContain("Stale result")
    expect(staleMarkup).not.toContain("<iframe")
    expect(staleMarkup).not.toContain("Download")

    const formMarkup = renderToStaticMarkup(createElement(PreviewTestInputView, {
      document,
      interaction: input("form"),
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      publishedPreview: preview(true),
    }))
    expect(formMarkup).toContain("Form data JSON")
    expect(formMarkup).toContain("Draft, not validated")
    expect(formMarkup).toContain("draft-not-validated")
  })

  it("keeps Draft and Published as explicit targets and labels Draft artifacts honestly", () => {
    const markup = renderToStaticMarkup(createElement(PreviewTestInputView, {
      document,
      interaction: input("json"),
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      publishedPreview: preview(false, "draft"),
      previewTarget: "draft",
      previewTargetAvailability: { draft: true, published: true },
      onSelectPreviewTarget: vi.fn(),
    }))
    expect(markup).toContain('aria-label="Preview target"')
    expect(markup).toContain("Draft Preview · 10 pages")
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain(">Published</button>")
  })

  it("exposes cancellation while work is active and locks target switching", () => {
    const interaction = preview()
    interaction.phase = "running"
    interaction.operation = { ...interaction.operation!, state: "processing", terminalStatus: null }
    interaction.artifactUrl = null
    interaction.lifecycle = projectExactPreviewLifecycle({
      activity: "idle",
      error: null,
      operationState: "processing",
      phase: "running",
      stale: false,
    })
    const markup = renderToStaticMarkup(createElement(PreviewTestInputView, {
      document,
      interaction: input("json"),
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      publishedPreview: interaction,
      previewTargetAvailability: { draft: true, published: true },
    }))

    expect(markup).toContain("Generating exact PDF")
    expect(markup).toContain(">Cancel<")
    expect(markup).not.toContain(">Download<")
    expect(markup).toContain('disabled=""')
  })

  it("renders a friendly retry action without leaking transport error codes", () => {
    const interaction = preview()
    interaction.phase = "failed"
    interaction.operation = null
    interaction.artifactUrl = null
    interaction.error = "admission-failed"
    interaction.lifecycle = projectExactPreviewLifecycle({
      activity: "idle",
      error: "admission-failed",
      operationState: null,
      phase: "failed",
      stale: false,
    })
    const markup = renderToStaticMarkup(createElement(PreviewTestInputView, {
      document,
      interaction: input("json"),
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      publishedPreview: interaction,
    }))

    expect(markup).toContain("Mapping or validation could not be completed")
    expect(markup).toContain("Retry preview")
    expect(markup).not.toContain("admission-failed")
  })
})
