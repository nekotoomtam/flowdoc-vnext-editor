import {
  safeCreateVNextRuntimeSession,
} from "@flowdoc/vnext-core"
import productReportMinimalFixture from "@flowdoc/vnext-core/fixtures/product-report-vnext-minimal.flowdoc.json"
import {
  cloneCoreReadBindingFailures,
  type ActiveCoreReadRevision,
  type CoreAdapterReadRequest,
  type CoreAdapterReadResult,
  type CoreAdapterSnapshot,
  type CoreAdapterSnapshotSourceKind,
  type CoreEditorNodeSummary,
  type CoreEditorSeed,
  type CoreReadEnvelopePurpose,
  type CoreReadBindingFailure,
  type CoreReadTransportEnvelope,
} from "./coreTypes"
import { createCoreRuntimeEditorSeed } from "./coreRuntimeSeedMapper"

export type CoreFixtureSource = "core-product-report-minimal" | "frontend-placeholder"

interface FixtureContentNode {
  id: string
  label: string
  type: "heading" | "paragraph" | "table"
}

const FIXTURE_CONTENT_NODES: FixtureContentNode[] = [
  {
    id: "report-title",
    label: "Product Health Report",
    type: "heading",
  },
  {
    id: "executive-summary",
    label: "Current product health is stable, with export readiness waiting on exact layout confirmation.",
    type: "paragraph",
  },
  {
    id: "revenue-table",
    label: "Quarterly revenue by segment",
    type: "table",
  },
  {
    id: "risk-note",
    label: "Layout diagnostics are visible here before WYSIWYG editing is enabled.",
    type: "paragraph",
  },
  {
    id: "customer-signals",
    label: "Customer signals remain positive, but support review notes point to workflow clarity gaps.",
    type: "paragraph",
  },
  {
    id: "adoption-heading",
    label: "Adoption Snapshot",
    type: "heading",
  },
  {
    id: "adoption-summary",
    label: "New template usage is climbing while repeat editor sessions remain sensitive to scroll stability.",
    type: "paragraph",
  },
  {
    id: "adoption-table",
    label: "Weekly adoption and repeat-use trend",
    type: "table",
  },
  {
    id: "layout-heading",
    label: "Layout Readiness",
    type: "heading",
  },
  {
    id: "layout-summary",
    label: "The editor can preview paper structure, but exact pagination remains a core-owned contract.",
    type: "paragraph",
  },
  {
    id: "layout-warning",
    label: "Any visual page grouping in this frontend fixture is only a scroll stress estimate.",
    type: "paragraph",
  },
  {
    id: "operations-heading",
    label: "Operational Notes",
    type: "heading",
  },
  {
    id: "operations-table",
    label: "Open risks and next controls",
    type: "table",
  },
  {
    id: "operations-summary",
    label: "The next work block should harden selection, paper geometry, and read-only core binding.",
    type: "paragraph",
  },
  {
    id: "qa-heading",
    label: "QA Targets",
    type: "heading",
  },
  {
    id: "qa-scroll",
    label: "Scroll should remain owned by the canvas across top, middle, and bottom page positions.",
    type: "paragraph",
  },
  {
    id: "qa-click",
    label: "Clicking visible blocks should keep paper selection, outline, inspector, and status bar aligned.",
    type: "paragraph",
  },
  {
    id: "qa-zoom",
    label: "A4, Letter, zoom in, zoom out, and reset must not collapse the page stack.",
    type: "paragraph",
  },
  {
    id: "handoff-heading",
    label: "Next Handoff",
    type: "heading",
  },
  {
    id: "next-steps",
    label: "Next: bind read-only core envelopes, then introduce command policy and mutation recovery.",
    type: "paragraph",
  },
]

const DEFAULT_DOCUMENT_ID = "placeholder-document"
const DEFAULT_PACKAGE_VERSION = 2
const DEFAULT_DOCUMENT_VERSION = 3
const UNKNOWN_TRANSPORT_DOCUMENT_ID = "unknown-document"
export const CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID = "product-report-vnext-minimal"

const CORE_READ_TRANSPORT_SOURCE_KINDS: CoreAdapterSnapshotSourceKind[] = [
  "api",
  "fixture",
  "job-result",
  "local-draft",
  "mutation-result",
]

const CORE_READ_ENVELOPE_PURPOSES: CoreReadEnvelopePurpose[] = [
  "initial-load",
  "refresh",
  "job-result",
  "local-draft",
]

function createFixtureContentNode(node: FixtureContentNode): CoreEditorNodeSummary {
  return {
    childIds: [],
    id: node.id,
    label: node.label,
    parentId: "zone-main",
    sectionId: "section-1",
    type: node.type,
    zoneId: "zone-main",
  }
}

interface CreateFixtureEditorSeedOptions {
  documentId?: string
}

function createFixtureEditorSeed(options: CreateFixtureEditorSeedOptions = {}): CoreEditorSeed {
  return {
    document: {
      id: options.documentId ?? DEFAULT_DOCUMENT_ID,
      title: "FlowDoc vNext Editor",
      packageVersion: DEFAULT_PACKAGE_VERSION,
      documentVersion: DEFAULT_DOCUMENT_VERSION,
    },
    diagnostics: {
      artifactStatus: "unknown",
      exactLayoutStatus: "unknown",
      generationStatus: "unknown",
      graphIssueCount: 0,
      keyDataStatus: "unknown",
    },
    sections: [
      {
        id: "section-1",
        label: "Section 1",
      },
    ],
    zones: [
      {
        id: "zone-main",
        label: "Main",
        sectionId: "section-1",
      },
    ],
    nodes: [
      {
        childIds: ["section-1"],
        id: "root",
        label: "Document",
        parentId: null,
        sectionId: null,
        type: "document",
        zoneId: null,
      },
      {
        childIds: ["zone-main"],
        id: "section-1",
        label: "Section 1",
        parentId: "root",
        sectionId: "section-1",
        type: "section",
        zoneId: null,
      },
      {
        childIds: FIXTURE_CONTENT_NODES.map((node) => node.id),
        id: "zone-main",
        label: "Main content",
        parentId: "section-1",
        sectionId: "section-1",
        type: "zone",
        zoneId: "zone-main",
      },
      ...FIXTURE_CONTENT_NODES.map(createFixtureContentNode),
    ],
  }
}

export function loadInitialEditorSeed(): CoreEditorSeed {
  return createFixtureEditorSeed()
}

export interface LoadReadOnlyCoreSnapshotOptions {
  baseRevision?: number | null
  createdAt?: number
  documentId?: string
  fixtureSource?: CoreFixtureSource
  fixtureDocumentId?: string
  requireDiagnostics?: boolean
  requireRenderProjection?: boolean
  simulateCoreUnavailable?: boolean
  simulateInvalidEnvelope?: boolean
  simulateMissingDiagnostics?: boolean
  simulateMissingRenderProjection?: boolean
  sourceKind?: CoreAdapterSnapshotSourceKind
}

export interface LoadReadOnlyCoreSnapshotFromPackageOptions {
  baseRevision?: number | null
  createdAt?: number
  documentId: string
  requireDiagnostics?: boolean
  requireRenderProjection?: boolean
  simulateMissingDiagnostics?: boolean
  simulateMissingRenderProjection?: boolean
  sourceKind?: CoreAdapterSnapshotSourceKind
}

export interface LoadInitialCoreSnapshotOptions {
  createdAt?: number
}

export type CoreReadTransportEnvelopeValidation =
  | {
      envelope: CoreReadTransportEnvelope
      status: "accepted"
    }
  | {
      failure: CoreReadBindingFailure
      request: CoreAdapterReadRequest
      status: "blocked"
    }

function createCoreReadFailure(
  failure: CoreReadBindingFailure,
): CoreReadBindingFailure {
  return { ...failure }
}

function corePackageIssueMessage(
  issues: Array<{ message: string; path: string }>,
): string {
  return issues.map((issue) => `[${issue.path}] ${issue.message}`).join("; ")
}

function createCoreEditorSeedFromPackage(
  packageValue: unknown,
  options: {
    documentId: string
    source: "canonical-vnext-package" | "fixture"
  },
): CoreEditorSeed | CoreReadBindingFailure {
  const result = safeCreateVNextRuntimeSession(packageValue, {
    source: options.source,
  })

  if (!result.ok) {
    return createCoreReadFailure({
      code: "invalid-envelope",
      documentId: options.documentId,
      message: corePackageIssueMessage(result.issues),
    })
  }

  return createCoreRuntimeEditorSeed(result.session)
}

function createCoreFixtureEditorSeed(): CoreEditorSeed | CoreReadBindingFailure {
  return createCoreEditorSeedFromPackage(productReportMinimalFixture, {
    documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
    source: "fixture",
  })
}

function createReadRequest(options: LoadReadOnlyCoreSnapshotOptions = {}): CoreAdapterReadRequest {
  return {
    baseRevision: options.baseRevision ?? null,
    documentId: options.documentId ?? DEFAULT_DOCUMENT_ID,
    requestedAt: options.createdAt ?? Date.now(),
    requireDiagnostics: options.requireDiagnostics ?? true,
    requireRenderProjection: options.requireRenderProjection ?? true,
    sourceKind: options.sourceKind ?? "fixture",
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function isCoreAdapterSnapshotSourceKind(
  value: unknown,
): value is CoreAdapterSnapshotSourceKind {
  return CORE_READ_TRANSPORT_SOURCE_KINDS.includes(value as CoreAdapterSnapshotSourceKind)
}

function isCoreReadEnvelopePurpose(value: unknown): value is CoreReadEnvelopePurpose {
  return CORE_READ_ENVELOPE_PURPOSES.includes(value as CoreReadEnvelopePurpose)
}

function isRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function hasPackageValue(record: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(record, "packageValue")
    && record.packageValue !== undefined
    && record.packageValue !== null
}

function transportRequestFromInput(
  input: unknown,
  failure: CoreReadBindingFailure,
): CoreAdapterReadRequest {
  const record = isRecord(input) ? input : {}
  const sourceKind = isCoreAdapterSnapshotSourceKind(record.sourceKind)
    ? record.sourceKind
    : "api"
  const requestedAt = isTimestamp(record.receivedAt)
    ? record.receivedAt
    : isTimestamp(record.requestedAt)
      ? record.requestedAt
      : Date.now()
  const baseRevision = record.baseRevision === null || isRevision(record.baseRevision)
    ? record.baseRevision
    : null
  const documentId =
    failure.expectedDocumentId
    ?? failure.documentId
    ?? nonEmptyString(record.documentId)
    ?? UNKNOWN_TRANSPORT_DOCUMENT_ID

  return createReadRequest({
    baseRevision,
    createdAt: requestedAt,
    documentId,
    sourceKind,
  })
}

function rejectedTransportEnvelope(
  input: unknown,
  failure: CoreReadBindingFailure,
): CoreReadTransportEnvelopeValidation {
  return {
    failure,
    request: transportRequestFromInput(input, failure),
    status: "blocked",
  }
}

export function validateCoreReadTransportEnvelope(
  input: unknown,
): CoreReadTransportEnvelopeValidation {
  if (!isRecord(input)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      message: "The core read transport envelope must be an object.",
    }))
  }

  const envelopeId = nonEmptyString(input.envelopeId)
  if (!envelopeId) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId: nonEmptyString(input.documentId),
      message: "The core read transport envelope requires envelopeId.",
    }))
  }

  const documentId = nonEmptyString(input.documentId)
  if (!documentId) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      message: "The core read transport envelope requires documentId.",
    }))
  }

  if (!isCoreAdapterSnapshotSourceKind(input.sourceKind)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-source-kind",
      documentId,
      message: "The core read transport envelope sourceKind is not supported.",
    }))
  }

  if (!isCoreReadEnvelopePurpose(input.purpose)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId,
      message: "The core read transport envelope purpose is not supported.",
    }))
  }

  const baseRevision = input.baseRevision
  if (baseRevision !== null && !isRevision(baseRevision)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId,
      message: "The core read transport envelope baseRevision must be a non-negative integer or null.",
    }))
  }

  if (input.purpose !== "initial-load" && baseRevision === null) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId,
      message: "The core read transport envelope requires baseRevision outside initial load.",
    }))
  }

  if (!isTimestamp(input.requestedAt) || !isTimestamp(input.receivedAt)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId,
      message: "The core read transport envelope requires numeric requestedAt and receivedAt.",
    }))
  }

  if (!hasPackageValue(input)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "missing-package",
      documentId,
      message: "The core read transport envelope requires packageValue.",
    }))
  }

  return {
    envelope: {
      baseRevision,
      documentId,
      envelopeId,
      packageValue: input.packageValue,
      purpose: input.purpose,
      receivedAt: input.receivedAt,
      requestedAt: input.requestedAt,
      sourceKind: input.sourceKind,
    },
    status: "accepted",
  }
}

function createReadResultEnvelope(
  request: CoreAdapterReadRequest,
  snapshot: CoreAdapterSnapshot | null,
  failures: CoreReadBindingFailure[],
): CoreAdapterReadResult["envelope"] {
  return {
    baseRevision: request.baseRevision,
    coreRevision: snapshot?.coreRevision ?? null,
    documentId: request.documentId,
    documentRevision: snapshot?.seed.document.documentVersion ?? null,
    failures: cloneCoreReadBindingFailures(failures),
    receivedAt: request.requestedAt,
    snapshotRevision: snapshot?.snapshotRevision ?? null,
    sourceKind: request.sourceKind,
    status: snapshot?.status ?? "blocked",
  }
}

function createBlockedReadResult(
  request: CoreAdapterReadRequest,
  failures: CoreReadBindingFailure[],
): CoreAdapterReadResult {
  return {
    envelope: createReadResultEnvelope(request, null, failures),
    request,
    snapshot: null,
  }
}

function createCoreRevision(
  request: CoreAdapterReadRequest,
  seed: CoreEditorSeed,
): string {
  const documentRevision = seed.document.documentVersion

  if (request.sourceKind === "fixture") {
    return `fixture:${documentRevision}`
  }

  return `${request.sourceKind}:${seed.document.id}:${documentRevision}`
}

function createReadResultFromSeed(
  request: CoreAdapterReadRequest,
  seed: CoreEditorSeed,
  options: Pick<
    LoadReadOnlyCoreSnapshotOptions,
    "simulateMissingDiagnostics" | "simulateMissingRenderProjection"
  > = {},
): CoreAdapterReadResult {
  const documentRevision = seed.document.documentVersion
  const failures: CoreReadBindingFailure[] = []

  if (request.documentId !== seed.document.id) {
    failures.push(createCoreReadFailure({
      code: "document-mismatch",
      documentId: seed.document.id,
      expectedDocumentId: request.documentId,
      message: "The core snapshot document does not match the requested document.",
      sourceRevision: documentRevision,
    }))
  }

  if (request.baseRevision !== null && request.baseRevision !== documentRevision) {
    failures.push(createCoreReadFailure({
      baseRevision: request.baseRevision,
      code: "revision-stale",
      documentId: seed.document.id,
      message: "The core snapshot does not match the requested base revision.",
      sourceRevision: documentRevision,
    }))
  }

  if (options.simulateMissingDiagnostics && request.requireDiagnostics) {
    failures.push(createCoreReadFailure({
      code: "missing-diagnostics",
      documentId: seed.document.id,
      message: "The core snapshot did not include diagnostics.",
      sourceRevision: documentRevision,
    }))
  }

  if (options.simulateMissingRenderProjection && request.requireRenderProjection) {
    failures.push(createCoreReadFailure({
      code: "missing-render-projection",
      documentId: seed.document.id,
      message: "The core snapshot did not include a render projection seed.",
      sourceRevision: documentRevision,
    }))
  }

  const isBlocked = failures.some((failure) => (
    failure.code === "document-mismatch" || failure.code === "revision-stale"
  ))
  const status = isBlocked
    ? "blocked"
    : failures.length > 0
      ? "partial"
      : "fresh"

  const snapshot: CoreAdapterSnapshot = {
    coreRevision: createCoreRevision(request, seed),
    createdAt: request.requestedAt,
    failures: cloneCoreReadBindingFailures(failures),
    layoutGeneration: null,
    measurementProfileId: null,
    renderProjectionAvailable: !options.simulateMissingRenderProjection,
    schemaVersion: seed.document.packageVersion,
    seed,
    snapshotRevision: documentRevision,
    sourceKind: request.sourceKind,
    status,
  }

  return {
    envelope: createReadResultEnvelope(request, snapshot, failures),
    request,
    snapshot,
  }
}

export function loadReadOnlyCoreSnapshot(
  options: LoadReadOnlyCoreSnapshotOptions = {},
): CoreAdapterReadResult {
  const request = createReadRequest(options)
  const fixtureSource = options.fixtureSource ?? "frontend-placeholder"

  if (options.simulateCoreUnavailable) {
    const failures = [
      createCoreReadFailure({
        code: "core-unavailable",
        documentId: request.documentId,
        message: "The read-only core snapshot is unavailable.",
      }),
    ]

    return createBlockedReadResult(request, failures)
  }

  if (options.simulateInvalidEnvelope) {
    const failures = [
      createCoreReadFailure({
        code: "invalid-envelope",
        documentId: request.documentId,
        message: "The read-only core result envelope is invalid.",
      }),
    ]

    return createBlockedReadResult(request, failures)
  }

  const seedOrFailure = fixtureSource === "core-product-report-minimal"
    ? createCoreFixtureEditorSeed()
    : createFixtureEditorSeed({
        documentId: options.fixtureDocumentId ?? request.documentId,
      })
  if ("code" in seedOrFailure) {
    return createBlockedReadResult(request, [seedOrFailure])
  }

  return createReadResultFromSeed(request, seedOrFailure, {
    simulateMissingDiagnostics: options.simulateMissingDiagnostics,
    simulateMissingRenderProjection: options.simulateMissingRenderProjection,
  })
}

export function loadReadOnlyCoreSnapshotFromPackage(
  packageValue: unknown,
  options: LoadReadOnlyCoreSnapshotFromPackageOptions,
): CoreAdapterReadResult {
  const request = createReadRequest({
    ...options,
    sourceKind: options.sourceKind ?? "api",
  })
  const seedOrFailure = createCoreEditorSeedFromPackage(packageValue, {
    documentId: request.documentId,
    source: request.sourceKind === "fixture" ? "fixture" : "canonical-vnext-package",
  })

  if ("code" in seedOrFailure) {
    return createBlockedReadResult(request, [seedOrFailure])
  }

  return createReadResultFromSeed(request, seedOrFailure, {
    simulateMissingDiagnostics: options.simulateMissingDiagnostics,
    simulateMissingRenderProjection: options.simulateMissingRenderProjection,
  })
}

export function loadReadOnlyCoreSnapshotFromEnvelope(
  envelopeValue: unknown,
  active?: ActiveCoreReadRevision,
): CoreAdapterReadResult {
  const validation = validateCoreReadTransportEnvelope(envelopeValue)

  if (validation.status === "blocked") {
    return createBlockedReadResult(validation.request, [validation.failure])
  }

  const envelope = validation.envelope
  const request = createReadRequest({
    baseRevision: envelope.baseRevision,
    createdAt: envelope.receivedAt,
    documentId: envelope.documentId,
    sourceKind: envelope.sourceKind,
  })

  if (active && active.documentId !== envelope.documentId) {
    return createBlockedReadResult(request, [
      createCoreReadFailure({
        code: "document-mismatch",
        documentId: envelope.documentId,
        expectedDocumentId: active.documentId,
        message: "The core read transport envelope does not match the active document.",
        sourceRevision: active.documentRevision,
      }),
    ])
  }

  if (
    active
    && envelope.purpose !== "initial-load"
    && envelope.baseRevision !== active.documentRevision
  ) {
    return createBlockedReadResult(request, [
      createCoreReadFailure({
        baseRevision: envelope.baseRevision,
        code: "revision-stale",
        documentId: envelope.documentId,
        message: "The core read transport envelope does not match the active revision.",
        sourceRevision: active.documentRevision,
      }),
    ])
  }

  return loadReadOnlyCoreSnapshotFromPackage(envelope.packageValue, {
    baseRevision: envelope.baseRevision,
    createdAt: envelope.receivedAt,
    documentId: envelope.documentId,
    sourceKind: envelope.sourceKind,
  })
}

export function loadInitialCoreSnapshot(
  options: LoadInitialCoreSnapshotOptions = {},
): CoreAdapterSnapshot {
  const result = loadReadOnlyCoreSnapshot({
    createdAt: options.createdAt,
  })

  if (!result.snapshot) {
    throw new Error("Initial fixture core snapshot is unavailable.")
  }

  return result.snapshot
}
