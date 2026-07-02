import {
  type CoreAdapterReadResult,
  type CoreAdapterSnapshot,
  type CoreAdapterSnapshotSourceKind,
  type CoreEditorNodeSummary,
  type CoreEditorSeed,
  type CoreReadBindingFailure,
  type CoreReadEnvelopePurpose,
} from "./coreTypes"
import {
  createCoreEditorSeedFromPackage,
  type CorePackageReadDependencies,
} from "./corePackageRead"
import {
  createBlockedReadResult,
  createCoreReadFailure,
  createReadRequest,
  createReadResultFromSeed,
} from "./coreReadResult"
import { loadReadOnlyCoreSnapshotFromEnvelope } from "./coreReadTransport"

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

const DEFAULT_PACKAGE_VERSION = 2
const DEFAULT_DOCUMENT_VERSION = 3
export const CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID = "product-report-vnext-minimal"

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

export interface LoadReadOnlyCoreSnapshotFromCoreFixtureTransportOptions {
  baseRevision?: number | null
  createdAt?: number
  documentId?: string
  envelopeId?: string
  purpose?: CoreReadEnvelopePurpose
}

export interface LoadInitialCoreSnapshotOptions {
  createdAt?: number
}

export interface CoreFixtureReadDependencies extends CorePackageReadDependencies {
  productReportMinimalFixture: unknown
}

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
      id: options.documentId ?? "placeholder-document",
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

function createCoreFixtureEditorSeed(
  dependencies: CoreFixtureReadDependencies,
): CoreEditorSeed | CoreReadBindingFailure {
  return createCoreEditorSeedFromPackage(dependencies.productReportMinimalFixture, {
    documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
    source: "fixture",
  }, dependencies)
}

export function loadReadOnlyCoreSnapshot(
  options: LoadReadOnlyCoreSnapshotOptions = {},
  dependencies: CoreFixtureReadDependencies,
): CoreAdapterReadResult {
  const request = createReadRequest(options)
  const fixtureSource = options.fixtureSource ?? "frontend-placeholder"

  if (options.simulateCoreUnavailable) {
    return createBlockedReadResult(request, [
      createCoreReadFailure({
        code: "core-unavailable",
        documentId: request.documentId,
        message: "The read-only core snapshot is unavailable.",
      }),
    ])
  }

  if (options.simulateInvalidEnvelope) {
    return createBlockedReadResult(request, [
      createCoreReadFailure({
        code: "invalid-envelope",
        documentId: request.documentId,
        message: "The read-only core result envelope is invalid.",
      }),
    ])
  }

  const seedOrFailure = fixtureSource === "core-product-report-minimal"
    ? createCoreFixtureEditorSeed(dependencies)
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

export function loadReadOnlyCoreSnapshotFromCoreFixtureTransportEnvelope(
  options: LoadReadOnlyCoreSnapshotFromCoreFixtureTransportOptions = {},
  dependencies: CoreFixtureReadDependencies,
): CoreAdapterReadResult {
  const receivedAt = options.createdAt ?? Date.now()
  const baseRevision = options.baseRevision ?? null
  const purpose = options.purpose ?? (baseRevision === null ? "initial-load" : "refresh")
  const documentId = options.documentId ?? CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID

  return loadReadOnlyCoreSnapshotFromEnvelope({
    baseRevision,
    documentId,
    envelopeId: options.envelopeId ?? `core-fixture:${documentId}:${purpose}:${receivedAt}`,
    packageValue: dependencies.productReportMinimalFixture,
    purpose,
    receivedAt,
    requestedAt: receivedAt,
    sourceKind: "fixture",
  }, undefined, dependencies)
}

export function loadInitialCoreSnapshot(
  options: LoadInitialCoreSnapshotOptions = {},
  dependencies: CoreFixtureReadDependencies,
): CoreAdapterSnapshot {
  const result = loadReadOnlyCoreSnapshot({
    createdAt: options.createdAt,
  }, dependencies)

  if (!result.snapshot) {
    throw new Error("Initial fixture core snapshot is unavailable.")
  }

  return result.snapshot
}
