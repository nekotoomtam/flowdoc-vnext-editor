import type {
  CoreEditorNodeSummary,
  CoreEditorSectionSummary,
  CoreEditorSeed,
  CoreEditorZoneSummary,
} from "../../core/coreTypes"
import { createEditorView, type EditorView } from "../runtime/editorView"

export interface EditorReadModel extends EditorView {
  revision: number
  sourceRevision: number
}

export interface EditorReadModelOptions {
  revision?: number
  sourceRevision?: number
}

function cloneNodeSummary(node: CoreEditorNodeSummary): CoreEditorNodeSummary {
  return {
    ...node,
    capabilities: node.capabilities ? { ...node.capabilities } : node.capabilities,
    childIds: [...node.childIds],
    nearest: node.nearest ? { ...node.nearest } : node.nearest,
  }
}

function cloneSectionSummary(section: CoreEditorSectionSummary): CoreEditorSectionSummary {
  return { ...section }
}

function cloneZoneSummary(zone: CoreEditorZoneSummary): CoreEditorZoneSummary {
  return { ...zone }
}

function cloneSeedForReadModel(seed: CoreEditorSeed): CoreEditorSeed {
  return {
    diagnostics: { ...seed.diagnostics },
    document: { ...seed.document },
    nodes: seed.nodes.map(cloneNodeSummary),
    sections: seed.sections.map(cloneSectionSummary),
    zones: seed.zones.map(cloneZoneSummary),
  }
}

export function createEditorReadModel(
  seed: CoreEditorSeed,
  options: EditorReadModelOptions = {},
): EditorReadModel {
  const sourceRevision = options.sourceRevision ?? seed.document.documentVersion

  return {
    ...createEditorView(cloneSeedForReadModel(seed)),
    revision: options.revision ?? sourceRevision,
    sourceRevision,
  }
}
