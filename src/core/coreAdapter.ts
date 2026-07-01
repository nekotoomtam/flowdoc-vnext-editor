import type { CoreAdapterSnapshot, CoreEditorNodeSummary, CoreEditorSeed } from "./coreTypes"

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

export function loadInitialEditorSeed(): CoreEditorSeed {
  return {
    document: {
      id: "placeholder-document",
      title: "FlowDoc vNext Editor",
      packageVersion: 2,
      documentVersion: 3,
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

export interface LoadInitialCoreSnapshotOptions {
  createdAt?: number
}

export function loadInitialCoreSnapshot(
  options: LoadInitialCoreSnapshotOptions = {},
): CoreAdapterSnapshot {
  const seed = loadInitialEditorSeed()
  const documentRevision = seed.document.documentVersion

  return {
    coreRevision: `fixture:${documentRevision}`,
    createdAt: options.createdAt ?? Date.now(),
    layoutGeneration: null,
    measurementProfileId: null,
    schemaVersion: seed.document.packageVersion,
    seed,
    snapshotRevision: documentRevision,
    sourceKind: "fixture",
    status: "fresh",
  }
}
