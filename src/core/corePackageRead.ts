import type { CoreRuntimeSessionForSeed } from "./coreRuntimeSeedMapper"
import { createCoreRuntimeEditorSeed } from "./coreRuntimeSeedMapper"
import {
  type CoreAdapterReadResult,
  type CoreAdapterSnapshotSourceKind,
  type CoreEditorSeed,
  type CoreReadBindingFailure,
} from "./coreTypes"
import {
  createBlockedReadResult,
  createCoreReadFailure,
  createReadRequest,
  createReadResultFromSeed,
} from "./coreReadResult"

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

type CoreRuntimeSessionSource = "canonical-vnext-package" | "fixture"

interface CoreRuntimePackageIssue {
  message: string
  path: string
}

type CoreRuntimeSessionResult =
  | {
      ok: true
      session: CoreRuntimeSessionForSeed
    }
  | {
      issues: CoreRuntimePackageIssue[]
      ok: false
    }

export interface CorePackageReadDependencies {
  createRuntimeSession: (
    value: unknown,
    options: { source?: CoreRuntimeSessionSource },
  ) => CoreRuntimeSessionResult
}

function corePackageIssueMessage(issues: CoreRuntimePackageIssue[]): string {
  return issues.map((issue) => `[${issue.path}] ${issue.message}`).join("; ")
}

export function createCoreEditorSeedFromPackage(
  packageValue: unknown,
  options: {
    documentId: string
    source: CoreRuntimeSessionSource
  },
  dependencies: CorePackageReadDependencies,
): CoreEditorSeed | CoreReadBindingFailure {
  const result = dependencies.createRuntimeSession(packageValue, {
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

export function loadReadOnlyCoreSnapshotFromPackage(
  packageValue: unknown,
  options: LoadReadOnlyCoreSnapshotFromPackageOptions,
  dependencies: CorePackageReadDependencies,
): CoreAdapterReadResult {
  const request = createReadRequest({
    ...options,
    sourceKind: options.sourceKind ?? "api",
  })
  const seedOrFailure = createCoreEditorSeedFromPackage(packageValue, {
    documentId: request.documentId,
    source: request.sourceKind === "fixture" ? "fixture" : "canonical-vnext-package",
  }, dependencies)

  if ("code" in seedOrFailure) {
    return createBlockedReadResult(request, [seedOrFailure])
  }

  return createReadResultFromSeed(request, seedOrFailure, {
    simulateMissingDiagnostics: options.simulateMissingDiagnostics,
    simulateMissingRenderProjection: options.simulateMissingRenderProjection,
  })
}
