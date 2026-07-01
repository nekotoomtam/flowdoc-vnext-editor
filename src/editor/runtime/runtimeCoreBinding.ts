import type { CoreEditorSeed } from "../../core/coreTypes"
import type { FrontendCoreWorkingSet } from "../coreBinding/workingSetTypes"

export function createEditorSeedFromWorkingSet(workingSet: FrontendCoreWorkingSet): CoreEditorSeed {
  const readModel = workingSet.readModel

  return {
    diagnostics: { ...workingSet.diagnostics },
    document: { ...workingSet.document },
    nodes: readModel.nodeOrder.map((nodeId) => ({
      ...readModel.nodeById[nodeId],
      childIds: [...(readModel.childrenById[nodeId] ?? [])],
    })),
    sections: Object.values(readModel.sectionById).map((section) => ({ ...section })),
    zones: Object.values(readModel.zoneById).map((zone) => ({ ...zone })),
  }
}
