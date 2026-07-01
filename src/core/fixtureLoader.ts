import { loadInitialEditorSeed } from "./coreAdapter"
import type { CoreEditorSeed } from "./coreTypes"

export function loadPlaceholderFixture(): CoreEditorSeed {
  return loadInitialEditorSeed()
}
