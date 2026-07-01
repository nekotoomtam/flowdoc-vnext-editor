import {
  cloneCoreReadBindingFailures,
  type CoreAdapterReadRequest,
  type CoreAdapterReadResult,
  type CoreAdapterSnapshot,
  type CoreAdapterSnapshotSourceKind,
  type CoreEditorNodeSummary,
  type CoreEditorSeed,
  type CoreReadBindingFailure,
} from "./coreTypes"

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
  fixtureDocumentId?: string
  requireDiagnostics?: boolean
  requireRenderProjection?: boolean
  simulateCoreUnavailable?: boolean
  simulateInvalidEnvelope?: boolean
  simulateMissingDiagnostics?: boolean
  simulateMissingRenderProjection?: boolean
  sourceKind?: CoreAdapterSnapshotSourceKind
}

export interface LoadInitialCoreSnapshotOptions {
  createdAt?: number
}

function createCoreReadFailure(
  failure: CoreReadBindingFailure,
): CoreReadBindingFailure {
  return { ...failure }
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

export function loadReadOnlyCoreSnapshot(
  options: LoadReadOnlyCoreSnapshotOptions = {},
): CoreAdapterReadResult {
  const request = createReadRequest(options)

  if (options.simulateCoreUnavailable) {
    const failures = [
      createCoreReadFailure({
        code: "core-unavailable",
        documentId: request.documentId,
        message: "The read-only core snapshot is unavailable.",
      }),
    ]

    return {
      envelope: createReadResultEnvelope(request, null, failures),
      request,
      snapshot: null,
    }
  }

  if (options.simulateInvalidEnvelope) {
    const failures = [
      createCoreReadFailure({
        code: "invalid-envelope",
        documentId: request.documentId,
        message: "The read-only core result envelope is invalid.",
      }),
    ]

    return {
      envelope: createReadResultEnvelope(request, null, failures),
      request,
      snapshot: null,
    }
  }

  const seed = createFixtureEditorSeed({
    documentId: options.fixtureDocumentId ?? request.documentId,
  })
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
    coreRevision: `fixture:${documentRevision}`,
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
