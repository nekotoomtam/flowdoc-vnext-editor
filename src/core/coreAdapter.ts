import {
  VNEXT_CORE_VERSION_CAPABILITY_CONTRACT,
  InlineNodeV4TargetSchema,
  inspectVNextPackageVersionCapability,
  safeCreateVNextReadOnlyRuntimeSessionV4,
  safeCreateVNextRuntimeSession,
  type VNextCoreVersionCapabilityContract,
  type VNextPackageVersionInspection,
  type InlineNodeV4Target,
  type VNextPublishedStructureTestInputProjectionV1,
  type VNextTestInputCollectionItemFieldProjectionV1,
  type VNextTestInputDocumentFieldProjectionV1,
  type VNextTestInputValueConstraintsV1,
  type VNextTestInputValueTypeV1,
} from "@flowdoc/vnext-core"
import productReportMinimalFixture from "@flowdoc/vnext-core/fixtures/product-report-vnext-minimal.flowdoc.json"
import type {
  ActiveCoreReadRevision,
  CoreAdapterReadResult,
  CoreAdapterSnapshot,
} from "./coreTypes"
import {
  CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
  loadInitialCoreSnapshot as loadInitialCoreSnapshotFromFixture,
  loadInitialEditorSeed,
  loadReadOnlyCoreSnapshot as loadReadOnlyCoreSnapshotFromFixture,
  loadReadOnlyCoreSnapshotFromCoreFixtureTransportEnvelope as loadReadOnlyCoreSnapshotFromFixtureTransportEnvelope,
  type CoreFixtureReadDependencies,
  type CoreFixtureSource,
  type LoadInitialCoreSnapshotOptions,
  type LoadReadOnlyCoreSnapshotFromCoreFixtureTransportOptions,
  type LoadReadOnlyCoreSnapshotOptions,
} from "./coreFixtureRead"
import {
  loadReadOnlyCoreSnapshotFromPackage as loadReadOnlyCoreSnapshotFromPackageValue,
  type LoadReadOnlyCoreSnapshotFromPackageOptions,
} from "./corePackageRead"
import {
  loadReadOnlyCoreSnapshotFromEnvelope as loadReadOnlyCoreSnapshotFromTransportEnvelope,
  validateCoreReadTransportEnvelope,
  type CoreReadTransportEnvelopeValidation,
} from "./coreReadTransport"

const coreReadDependencies: CoreFixtureReadDependencies = {
  createRuntimeSession: safeCreateVNextRuntimeSession,
  createReadOnlyRuntimeSessionV4: safeCreateVNextReadOnlyRuntimeSessionV4,
  productReportMinimalFixture,
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export {
  CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
  loadInitialEditorSeed,
  validateCoreReadTransportEnvelope,
  type CoreFixtureSource,
  type CoreReadTransportEnvelopeValidation,
  type LoadInitialCoreSnapshotOptions,
  type LoadReadOnlyCoreSnapshotFromCoreFixtureTransportOptions,
  type LoadReadOnlyCoreSnapshotFromPackageOptions,
  type LoadReadOnlyCoreSnapshotOptions,
  type VNextPublishedStructureTestInputProjectionV1,
  type VNextTestInputCollectionItemFieldProjectionV1,
  type VNextTestInputDocumentFieldProjectionV1,
  type VNextTestInputValueConstraintsV1,
  type VNextTestInputValueTypeV1,
}

export function loadReadOnlyCoreSnapshot(
  options: LoadReadOnlyCoreSnapshotOptions = {},
): CoreAdapterReadResult {
  return loadReadOnlyCoreSnapshotFromFixture(options, coreReadDependencies)
}

export function loadReadOnlyCoreSnapshotFromPackage(
  packageValue: unknown,
  options: LoadReadOnlyCoreSnapshotFromPackageOptions,
): CoreAdapterReadResult {
  return loadReadOnlyCoreSnapshotFromPackageValue(packageValue, options, coreReadDependencies)
}

export function loadReadOnlyCoreSnapshotFromEnvelope(
  envelopeValue: unknown,
  active?: ActiveCoreReadRevision,
): CoreAdapterReadResult {
  return loadReadOnlyCoreSnapshotFromTransportEnvelope(envelopeValue, active, coreReadDependencies)
}

export function loadReadOnlyCoreSnapshotFromCoreFixtureTransportEnvelope(
  options: LoadReadOnlyCoreSnapshotFromCoreFixtureTransportOptions = {},
): CoreAdapterReadResult {
  return loadReadOnlyCoreSnapshotFromFixtureTransportEnvelope(options, coreReadDependencies)
}

export function loadInitialCoreSnapshot(
  options: LoadInitialCoreSnapshotOptions = {},
): CoreAdapterSnapshot {
  return loadInitialCoreSnapshotFromFixture(options, coreReadDependencies)
}

export function getCoreVersionCapabilityContract(): VNextCoreVersionCapabilityContract {
  return cloneJson(VNEXT_CORE_VERSION_CAPABILITY_CONTRACT)
}

export function inspectCorePackageVersionCapability(value: unknown): VNextPackageVersionInspection {
  return inspectVNextPackageVersionCapability(value)
}

export type CoreInlineNodeV4Target = InlineNodeV4Target

export type CoreInlineNodeV4TargetListParseResult =
  | { children: CoreInlineNodeV4Target[]; status: "valid" }
  | { reason: string; status: "invalid" }

export function parseCoreInlineNodeV4TargetList(
  value: unknown,
): CoreInlineNodeV4TargetListParseResult {
  if (!Array.isArray(value)) return { reason: "Inline children must be an array.", status: "invalid" }
  const children: CoreInlineNodeV4Target[] = []
  for (let index = 0; index < value.length; index += 1) {
    const parsed = InlineNodeV4TargetSchema.safeParse(value[index])
    if (!parsed.success) {
      return {
        reason: `Inline child ${index} is invalid: ${parsed.error.issues[0]?.message ?? "unknown issue"}`,
        status: "invalid",
      }
    }
    children.push(parsed.data)
  }
  return { children, status: "valid" }
}
