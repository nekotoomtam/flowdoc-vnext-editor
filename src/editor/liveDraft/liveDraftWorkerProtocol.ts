import type { FlowDocTextEngineLiveDraftNormalizedResultV1 } from "@flowdoc/text-engine-rust-wasm/worker"
import type { CoreLiveDraftOneBlockLayoutResultV1 } from "../../core/coreAdapter"

export const FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION = 1 as const
export const FLOWDOC_LIVE_DRAFT_EXACTNESS_STATES = [
  "draft-updating",
  "draft-current",
  "draft-approximate",
  "draft-blocked",
  "published-exact",
  "stale",
] as const

export type FlowDocLiveDraftExactnessState = typeof FLOWDOC_LIVE_DRAFT_EXACTNESS_STATES[number]

export interface FlowDocLiveDraftRequestIdentityV1 {
  documentId: string
  structureRevision: number
  draftSnapshotFingerprint: string
  canonicalFormCandidateFingerprint: string
  assetRegistryFingerprint: string
  measurementProfileId: string
  fontManifestFingerprint: string
  wasmSha256: string
  layoutPipelineVersion: string
  requestId: string
  requestRevision: number
}

export interface FlowDocLiveDraftInitializeRequestV1 {
  protocolVersion: typeof FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION
  type: "live-draft.initialize"
  measurementProfileId: string
  wasmSha256: string
  wasmBytes: ArrayBuffer
  fonts: Array<{
    fontId: string
    sha256: string
    bytes: ArrayBuffer
  }>
}

export interface FlowDocLiveDraftLayoutRequestV1 {
  protocolVersion: typeof FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION
  type: "live-draft.layout"
  identity: FlowDocLiveDraftRequestIdentityV1
  smokeRow: {
    rowId: string
    fixtureId: string
    scenarioId: string
    text: string
    fontId: string
    fontSha256: string
  }
  coreLayout?: {
    availableWidthPt: number
    fontSizePt: number
    lineHeightPt: number
    pageBodyHeightPt: number
    styleKey: string
    cacheAction: "retain" | "clear-before"
  }
}

export interface FlowDocLiveDraftFormLayoutRequestV1 {
  protocolVersion: typeof FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION
  type: "live-draft.form-layout"
  identity: FlowDocLiveDraftRequestIdentityV1
  textBlock: {
    textBlockId: string
    fieldKey: string
    text: string
    fontId: string
    fontSha256: string
  }
  coreLayout: NonNullable<FlowDocLiveDraftLayoutRequestV1["coreLayout"]>
}

export interface FlowDocLiveDraftCancelRequestV1 {
  protocolVersion: typeof FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION
  type: "live-draft.cancel"
  requestId: string
  requestRevision: number
}

export type FlowDocLiveDraftWorkerRequestV1 =
  | FlowDocLiveDraftInitializeRequestV1
  | FlowDocLiveDraftLayoutRequestV1
  | FlowDocLiveDraftFormLayoutRequestV1
  | FlowDocLiveDraftCancelRequestV1

export interface FlowDocLiveDraftWorkerResultV1 {
  protocolVersion: typeof FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION
  type: "live-draft.result"
  exactness: "draft-current"
  identity: FlowDocLiveDraftRequestIdentityV1
  smokeRow: FlowDocLiveDraftLayoutRequestV1["smokeRow"]
  measurement: FlowDocTextEngineLiveDraftNormalizedResultV1
  coreLayout?: CoreLiveDraftOneBlockLayoutResultV1
  durationMs: number
}

export interface FlowDocLiveDraftFormResultV1 {
  protocolVersion: typeof FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION
  type: "live-draft.form-result"
  exactness: "draft-current"
  identity: FlowDocLiveDraftRequestIdentityV1
  textBlock: FlowDocLiveDraftFormLayoutRequestV1["textBlock"]
  coreLayout: CoreLiveDraftOneBlockLayoutResultV1
  durationMs: number
}

export interface FlowDocLiveDraftWorkerBlockedV1 {
  protocolVersion: typeof FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION
  type: "live-draft.blocked"
  exactness: "draft-blocked"
  requestId: string | null
  requestRevision: number | null
  message: string
}

export interface FlowDocLiveDraftWorkerDiagnosticsV1 {
  protocolVersion: typeof FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION
  type: "live-draft.diagnostics"
  status: "initialized"
  durationMs: number
  engineIdentity: {
    runtime: "browser-worker-wasm"
    measurementProfileId: string
    wasmSha256: string
    boundaryVersion: string
    fontSha256ById: Readonly<Record<string, string>>
    importsWasm: true
    executesRustybuzz: true
    executesIcu4x: true
  }
}

export type FlowDocLiveDraftWorkerResponseV1 =
  | FlowDocLiveDraftWorkerResultV1
  | FlowDocLiveDraftFormResultV1
  | FlowDocLiveDraftWorkerBlockedV1
  | FlowDocLiveDraftWorkerDiagnosticsV1

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function hasValidIdentity(value: unknown): value is FlowDocLiveDraftRequestIdentityV1 {
  if (!isRecord(value)) return false
  return typeof value.documentId === "string"
    && Number.isSafeInteger(value.structureRevision)
    && typeof value.draftSnapshotFingerprint === "string"
    && typeof value.canonicalFormCandidateFingerprint === "string"
    && typeof value.assetRegistryFingerprint === "string"
    && typeof value.measurementProfileId === "string"
    && typeof value.fontManifestFingerprint === "string"
    && typeof value.wasmSha256 === "string"
    && typeof value.layoutPipelineVersion === "string"
    && typeof value.requestId === "string"
    && Number.isSafeInteger(value.requestRevision)
}

function hasValidCoreLayout(value: unknown): value is NonNullable<FlowDocLiveDraftLayoutRequestV1["coreLayout"]> {
  return isRecord(value)
    && isPositiveFiniteNumber(value.availableWidthPt)
    && isPositiveFiniteNumber(value.fontSizePt)
    && isPositiveFiniteNumber(value.lineHeightPt)
    && isPositiveFiniteNumber(value.pageBodyHeightPt)
    && typeof value.styleKey === "string"
    && value.styleKey.trim().length > 0
    && (value.cacheAction === "retain" || value.cacheAction === "clear-before")
}

export function parseFlowDocLiveDraftWorkerRequestV1(value: unknown): FlowDocLiveDraftWorkerRequestV1 | null {
  if (!isRecord(value) || value.protocolVersion !== FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION) return null
  if (value.type === "live-draft.initialize") {
    if (
      typeof value.measurementProfileId !== "string"
      || typeof value.wasmSha256 !== "string"
      || !(value.wasmBytes instanceof ArrayBuffer)
      || !Array.isArray(value.fonts)
    ) return null
    return value as unknown as FlowDocLiveDraftInitializeRequestV1
  }
  if (value.type === "live-draft.cancel") {
    if (typeof value.requestId !== "string" || !Number.isSafeInteger(value.requestRevision)) return null
    return value as unknown as FlowDocLiveDraftCancelRequestV1
  }
  if (value.type === "live-draft.form-layout") {
    if (!hasValidIdentity(value.identity) || !isRecord(value.textBlock) || !hasValidCoreLayout(value.coreLayout)) return null
    const textBlock = value.textBlock
    if (
      typeof textBlock.textBlockId !== "string"
      || textBlock.textBlockId.trim().length === 0
      || typeof textBlock.fieldKey !== "string"
      || textBlock.fieldKey.trim().length === 0
      || typeof textBlock.text !== "string"
      || textBlock.text.length === 0
      || typeof textBlock.fontId !== "string"
      || typeof textBlock.fontSha256 !== "string"
    ) return null
    return value as unknown as FlowDocLiveDraftFormLayoutRequestV1
  }
  if (value.type !== "live-draft.layout" || !hasValidIdentity(value.identity) || !isRecord(value.smokeRow)) return null
  const identity = value.identity
  const row = value.smokeRow
  const coreLayout = value.coreLayout
  if (
    typeof row.rowId !== "string"
    || typeof row.fixtureId !== "string"
    || typeof row.scenarioId !== "string"
    || typeof row.text !== "string"
    || typeof row.fontId !== "string"
    || typeof row.fontSha256 !== "string"
  ) return null
  if (coreLayout != null && !hasValidCoreLayout(coreLayout)) return null
  return value as unknown as FlowDocLiveDraftLayoutRequestV1
}

export function isFlowDocLiveDraftResultCurrentV1(input: {
  current: FlowDocLiveDraftRequestIdentityV1
  result: FlowDocLiveDraftWorkerResultV1 | FlowDocLiveDraftFormResultV1
}): boolean {
  const current = input.current
  const result = input.result.identity
  return current.documentId === result.documentId
    && current.structureRevision === result.structureRevision
    && current.draftSnapshotFingerprint === result.draftSnapshotFingerprint
    && current.canonicalFormCandidateFingerprint === result.canonicalFormCandidateFingerprint
    && current.assetRegistryFingerprint === result.assetRegistryFingerprint
    && current.measurementProfileId === result.measurementProfileId
    && current.fontManifestFingerprint === result.fontManifestFingerprint
    && current.wasmSha256 === result.wasmSha256
    && current.layoutPipelineVersion === result.layoutPipelineVersion
    && current.requestId === result.requestId
    && current.requestRevision === result.requestRevision
}
