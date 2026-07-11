import { getCoreVersionCapabilityContract } from "../../core/coreAdapter"

export interface EditorVersionPair {
  documentVersion: number
  packageVersion: number
}

export const EDITOR_BACKEND_VERSION_CAPABILITY_CONTRACT_VERSION = 4 as const

export type EditorBackendMutationOperationKind =
  | "node.delete"
  | "node.duplicate"
  | "node.reorder"
  | "text-block.rich-inline.replace"

export interface EditorMutationOperationSupport {
  operationKinds: EditorBackendMutationOperationKind[]
  pair: EditorVersionPair
}

export interface EditorVersionCapabilityIssue {
  code: string
  message: string
  path: string
  severity: "error"
}

export type EditorVersionCapabilityStatus =
  | "checking"
  | "compatible"
  | "invalid-response"
  | "unavailable"
  | "unsupported"

export interface EditorBackendVersionCapabilityEnvelope {
  active: EditorVersionPair
  contractVersion: number
  documentReadPairs: EditorVersionPair[]
  migrationPersistence: "available" | "not-wired"
  migrationBaseRevisionRequired: true
  migrationSourceSnapshotRetention: boolean
  migrationPlanSource: EditorVersionPair
  migrationPlanTarget: EditorVersionPair
  migrationTarget: EditorVersionPair
  mutationPairs: EditorVersionPair[]
  mutationOperations: EditorMutationOperationSupport[]
  service: "flowdoc-vnext-backend"
}

export type EditorBackendVersionCapabilityResult =
  | {
      envelope: EditorBackendVersionCapabilityEnvelope
      issues: []
      status: "compatible"
      statusCode?: number
    }
  | {
      issues: EditorVersionCapabilityIssue[]
      status: "invalid-response" | "unavailable" | "unsupported"
      statusCode?: number
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function issue(code: string, path: string, message: string): EditorVersionCapabilityIssue {
  return { code, message, path, severity: "error" }
}

function pair(value: unknown): EditorVersionPair | null {
  if (!isRecord(value)) return null
  if (
    typeof value.packageVersion !== "number"
    || !Number.isInteger(value.packageVersion)
    || typeof value.documentVersion !== "number"
    || !Number.isInteger(value.documentVersion)
  ) {
    return null
  }
  return {
    packageVersion: value.packageVersion,
    documentVersion: value.documentVersion,
  }
}

function samePair(left: EditorVersionPair, right: EditorVersionPair): boolean {
  return left.packageVersion === right.packageVersion
    && left.documentVersion === right.documentVersion
}

function includesPair(pairs: readonly EditorVersionPair[], expected: EditorVersionPair): boolean {
  return pairs.some((candidate) => samePair(candidate, expected))
}

function pairList(value: unknown): EditorVersionPair[] | null {
  if (!isRecord(value) || value.status !== "available" || !Array.isArray(value.pairs)) return null
  const pairs = value.pairs.map(pair)
  return pairs.every((candidate) => candidate != null) ? pairs as EditorVersionPair[] : null
}

function mutationOperationSupport(value: unknown): EditorMutationOperationSupport[] | null {
  if (!isRecord(value) || !Array.isArray(value.operations)) return null
  const supported = new Set<EditorBackendMutationOperationKind>([
    "node.delete", "node.duplicate", "node.reorder", "text-block.rich-inline.replace",
  ])
  const entries = value.operations.map((entry): EditorMutationOperationSupport | null => {
    if (!isRecord(entry) || !Array.isArray(entry.operationKinds)) return null
    const operationPair = pair(entry.pair)
    if (!operationPair || !entry.operationKinds.every((kind) => supported.has(kind as EditorBackendMutationOperationKind))) {
      return null
    }
    return {
      operationKinds: [...entry.operationKinds] as EditorBackendMutationOperationKind[],
      pair: operationPair,
    }
  })
  return entries.every((entry) => entry != null) ? entries as EditorMutationOperationSupport[] : null
}

export function createUnavailableVersionCapabilityResult(
  statusCode?: number,
): EditorBackendVersionCapabilityResult {
  return {
    issues: [issue(
      "version-capability-unavailable",
      "",
      "Backend version capability reporting is unavailable.",
    )],
    status: "unavailable",
    ...(statusCode == null ? {} : { statusCode }),
  }
}

export function createBackendVersionCapabilityResult(
  value: unknown,
  options: { statusCode?: number } = {},
): EditorBackendVersionCapabilityResult {
  if (!isRecord(value)) {
    return {
      issues: [issue("invalid-version-capability", "", "Version capability response must be an object.")],
      status: "invalid-response",
      ...options,
    }
  }

  const backend = isRecord(value.backend) ? value.backend : null
  const core = isRecord(value.core) ? value.core : null
  const migrationPlan = backend != null && isRecord(backend.migrationPlan) ? backend.migrationPlan : null
  const migrationPersistence = backend != null && isRecord(backend.migrationPersistence)
    ? backend.migrationPersistence
    : null
  const active = pair(core?.active)
  const migrationTarget = pair(core?.migrationTarget)
  const documentReadPairs = pairList(backend?.documentRead)
  const mutationPairs = pairList(backend?.mutation)
  const mutationOperations = mutationOperationSupport(backend?.mutation)
  const migrationPlanSource = pair(migrationPlan?.source)
  const migrationPlanTarget = pair(migrationPlan?.target)
  const contractVersion = typeof value.contractVersion === "number" && Number.isInteger(value.contractVersion)
    ? value.contractVersion
    : null
  const persistenceStatus = migrationPersistence?.status === "available"
    || migrationPersistence?.status === "not-wired"
    ? migrationPersistence.status
    : null
  const sourceSnapshotRetention = typeof migrationPersistence?.sourceSnapshotRetention === "boolean"
    ? migrationPersistence.sourceSnapshotRetention
    : null

  const shapeIssues: EditorVersionCapabilityIssue[] = []
  if (value.service !== "flowdoc-vnext-backend") {
    shapeIssues.push(issue("invalid-version-capability", "service", "Version capability service is invalid."))
  }
  if (value.status !== "ready") {
    shapeIssues.push(issue("invalid-version-capability", "status", "Version capability status must be ready."))
  }
  if (contractVersion == null) {
    shapeIssues.push(issue("invalid-version-capability", "contractVersion", "Contract version must be an integer."))
  }
  if (!active) shapeIssues.push(issue("invalid-version-capability", "core.active", "Active version pair is invalid."))
  if (!migrationTarget) {
    shapeIssues.push(issue("invalid-version-capability", "core.migrationTarget", "Migration target pair is invalid."))
  }
  if (!documentReadPairs) {
    shapeIssues.push(issue("invalid-version-capability", "backend.documentRead", "Document read support is invalid."))
  }
  if (!mutationPairs) {
    shapeIssues.push(issue("invalid-version-capability", "backend.mutation", "Mutation support is invalid."))
  }
  if (!mutationOperations) {
    shapeIssues.push(issue("invalid-version-capability", "backend.mutation.operations", "Mutation operation support is invalid."))
  }
  if (!migrationPlanSource || !migrationPlanTarget || migrationPlan?.status !== "core-available") {
    shapeIssues.push(issue("invalid-version-capability", "backend.migrationPlan", "Migration plan support is invalid."))
  }
  if (!persistenceStatus) {
    shapeIssues.push(issue(
      "invalid-version-capability",
      "backend.migrationPersistence.status",
      "Migration persistence status is invalid.",
    ))
  }
  if (migrationPersistence?.baseRevisionRequired !== true) {
    shapeIssues.push(issue(
      "invalid-version-capability",
      "backend.migrationPersistence.baseRevisionRequired",
      "Migration persistence must require a base revision.",
    ))
  }
  if (sourceSnapshotRetention == null) {
    shapeIssues.push(issue(
      "invalid-version-capability",
      "backend.migrationPersistence.sourceSnapshotRetention",
      "Migration source snapshot retention status is required.",
    ))
  }
  if (shapeIssues.length > 0 || !active || !migrationTarget || !documentReadPairs || !mutationPairs || !mutationOperations
    || !migrationPlanSource || !migrationPlanTarget || !persistenceStatus || contractVersion == null
    || sourceSnapshotRetention == null) {
    return { issues: shapeIssues, status: "invalid-response", ...options }
  }

  const expected = getCoreVersionCapabilityContract()
  const expectedActive = { ...expected.active }
  const expectedTarget = { ...expected.migrationTarget }
  const compatibilityIssues: EditorVersionCapabilityIssue[] = []
  const activeMutation = mutationOperations.find((entry) => samePair(entry.pair, expectedActive))
  const targetMutation = mutationOperations.find((entry) => samePair(entry.pair, expectedTarget))
  if (contractVersion !== EDITOR_BACKEND_VERSION_CAPABILITY_CONTRACT_VERSION) {
    compatibilityIssues.push(issue(
      "version-contract-mismatch",
      "contractVersion",
      `Backend contract version ${contractVersion} does not match editor contract ${EDITOR_BACKEND_VERSION_CAPABILITY_CONTRACT_VERSION}.`,
    ))
  }
  if (!samePair(active, expectedActive) || !samePair(migrationTarget, expectedTarget)) {
    compatibilityIssues.push(issue(
      "version-pair-mismatch",
      "core",
      "Backend core version pairs do not match the editor core adapter.",
    ))
  }
  if (!includesPair(documentReadPairs, expectedActive) || !includesPair(mutationPairs, expectedActive)
    || !activeMutation
    || !["node.delete", "node.duplicate", "node.reorder"].every((kind) => activeMutation.operationKinds.includes(kind as EditorBackendMutationOperationKind))) {
    compatibilityIssues.push(issue(
      "active-version-unavailable",
      "backend",
      "Backend does not advertise active document read and mutation support.",
    ))
  }
  if (!includesPair(documentReadPairs, expectedTarget)) {
    compatibilityIssues.push(issue(
      "migration-target-read-unavailable",
      "backend.documentRead",
      "Backend does not advertise migration-target read support.",
    ))
  }
  if (!includesPair(mutationPairs, expectedTarget)
    || !targetMutation
    || targetMutation.operationKinds.length !== 4
    || !["node.delete", "node.duplicate", "node.reorder", "text-block.rich-inline.replace"]
      .every((kind) => targetMutation.operationKinds.includes(kind as EditorBackendMutationOperationKind))) {
    compatibilityIssues.push(issue(
      "migration-target-operation-mismatch",
      "backend.mutation.operations",
      "Backend migration target operation support does not match the editor integration contract.",
    ))
  }
  if (!samePair(migrationPlanSource, expectedActive) || !samePair(migrationPlanTarget, expectedTarget)) {
    compatibilityIssues.push(issue(
      "migration-pair-mismatch",
      "backend.migrationPlan",
      "Backend migration source/target pairs do not match the core contract.",
    ))
  }
  if (compatibilityIssues.length > 0) {
    return { issues: compatibilityIssues, status: "unsupported", ...options }
  }

  return {
    envelope: {
      active,
      contractVersion,
      documentReadPairs,
      migrationBaseRevisionRequired: true,
      migrationPersistence: persistenceStatus,
      migrationPlanSource,
      migrationPlanTarget,
      migrationTarget,
      migrationSourceSnapshotRetention: sourceSnapshotRetention,
      mutationPairs,
      mutationOperations,
      service: "flowdoc-vnext-backend",
    },
    issues: [],
    status: "compatible",
    ...options,
  }
}
