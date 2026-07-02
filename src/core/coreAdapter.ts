import {
  safeCreateVNextRuntimeSession,
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
  productReportMinimalFixture,
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
