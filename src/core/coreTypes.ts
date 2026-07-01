export interface CoreEditorDocumentSummary {
  id: string
  title: string
  packageVersion: number
  documentVersion: number
}

export interface CoreDiagnosticsSummary {
  artifactStatus: string
  exactLayoutStatus: string
  generationStatus: string
  graphIssueCount: number
  keyDataStatus: string
}

export interface CoreEditorSectionSummary {
  id: string
  label: string
}

export interface CoreEditorZoneSummary {
  id: string
  label: string
  sectionId: string
}

export interface CoreEditorNodeSummary {
  childIds: string[]
  id: string
  label: string
  parentId: string | null
  sectionId: string | null
  type: string
  zoneId: string | null
}

export interface CoreEditorSeed {
  diagnostics: CoreDiagnosticsSummary
  document: CoreEditorDocumentSummary
  nodes: CoreEditorNodeSummary[]
  sections: CoreEditorSectionSummary[]
  zones: CoreEditorZoneSummary[]
}
