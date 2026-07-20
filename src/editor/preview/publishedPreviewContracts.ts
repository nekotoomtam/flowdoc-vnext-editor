import {
  ImageAssetRegistryV1Schema,
  VNextPublishedStructureMappingProfileV1Schema,
  type ImageAssetRegistryV1,
  type VNextPublishedStructureTestInputProjectionV1,
  type VNextPublishedStructureMappingProfileV1,
} from "../../core/coreAdapter"
import type { LocalPdfExportDocumentPin } from "../pdfExport/localPdfExportContracts"

const SHA256 = /^sha256:[a-f0-9]{64}$/u

export interface PublishedPreviewMappingOption {
  label: string
  profile: VNextPublishedStructureMappingProfileV1
}

export interface PublishedPreviewContext {
  source: "flowdoc-backend-docgen-local-published-preview"
  contractVersion: 1
  kind: "docgen-local-published-preview-context"
  status: "ready"
  authoring: LocalPdfExportDocumentPin
  projection: VNextPublishedStructureTestInputProjectionV1
  mappingProfiles: PublishedPreviewMappingOption[]
  admission: {
    contractVersion: 1
    kind: "docgen-local-admission-template"
    structure: VNextPublishedStructureTestInputProjectionV1["owner"]
    assets: ImageAssetRegistryV1
  }
  limits: { adaptedPayloadMaxUtf8Bytes: number }
  contracts: {
    trustedBackendProjection: true
    trustedBackendProfiles: true
    exactPublishedStructureVersion: true
    businessValuesIncluded: false
    rawPayloadIncluded: false
    executableMapperIncluded: false
    productionBinding: false
  }
  contextFingerprint: string
}

export interface PublishedPreviewAdmissionReceipt {
  admissionId: string
  status: "ready" | "ready-with-warnings"
  lane: "direct" | "adapted"
  structure: VNextPublishedStructureTestInputProjectionV1["owner"]
  dataContract: {
    dataContractId: string
    dataContractFingerprint: string
    publishedStructureFingerprint: string
  }
  instance: {
    contractVersion: 1
    kind: "document-instance"
    instanceId: string
    revision: number
    structureVersion: VNextPublishedStructureTestInputProjectionV1["owner"]
  }
  inputFingerprint: string
  canonicalInputFingerprint: string
  canonicalContentFingerprint: string
  mappingProfile: {
    mappingProfileId: string
    mappingProfileVersion: number
    profileFingerprint: string
  } | null
  diagnostics: {
    contentFree: true
    issues: Array<{ severity: "error"; code: string; path: string; message: string }>
    warnings: Array<{ severity: "warning"; code: string; path: string; message: string }>
    summary: {
      errorCount: number
      warningCount: number
      scalarValueCount: number
      collectionSnapshotCount: number
      collectionItemCount: number
      mediaAssetCount: number
      defaultAppliedCount: number
    }
    diagnosticsFingerprint: string
  }
  execution: {
    mapping: "not-required" | "executed"
    runtimeValidation: "run-valid"
    materialization: "not-run"
    resolution: "not-run"
    measurement: "not-run"
    pagination: "not-run"
    artifact: "not-run"
  }
  contracts: {
    canonicalBusinessDataExposed: false
    durablePersistence: boolean
    rawPayloadRetained: false
    productionBinding: false
  }
  receiptFingerprint: string
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function bounded(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512
}

function revision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function count(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function exactOwner(left: unknown, right: VNextPublishedStructureTestInputProjectionV1["owner"]): boolean {
  return record(left)
    && exactKeys(left, ["structureId", "structureVersionId", "versionOrdinal"])
    && left.structureId === right.structureId
    && left.structureVersionId === right.structureVersionId
    && left.versionOrdinal === right.versionOrdinal
}

function projectionConstraintFact(value: unknown): boolean {
  if (!record(value)) return false
  if (value.status === "metadata-unavailable") {
    return exactKeys(value, ["status", "reason"])
      && value.reason === "not-represented-by-generation-data-contract"
  }
  if (value.status === "not-applicable") return exactKeys(value, ["status"])
  if (value.status === "absent") {
    return exactKeys(value, ["status", "source"]) && value.source === "collection-item-contract"
  }
  if (value.status === "unsupported") {
    return exactKeys(value, ["status", "source", "reason"])
      && value.source === "collection-item-contract"
      && value.reason === "published-static-media-owner-not-bound"
  }
  if (value.status !== "available") return false
  if (exactKeys(value, ["status", "source", "values"])) {
    return value.source === "generation-data-contract"
      && Array.isArray(value.values)
      && value.values.every((item) => typeof item === "string")
  }
  if (exactKeys(value, ["status", "source", "format"])) {
    return value.source === "generation-data-contract" && typeof value.format === "string"
  }
  return exactKeys(value, ["status", "source", "value"])
    && value.source === "collection-item-contract"
}

function projectionConstraints(value: unknown): boolean {
  return record(value)
    && exactKeys(value, ["required", "defaultValue", "allowedValues", "valueFormat"])
    && projectionConstraintFact(value.required)
    && projectionConstraintFact(value.defaultValue)
    && projectionConstraintFact(value.allowedValues)
    && projectionConstraintFact(value.valueFormat)
}

function projectionPlacement(value: unknown): boolean {
  if (!record(value) || !exactKeys(value, ["status", "placementCount", "firstPlacement"])) return false
  if (value.status === "unplaced") return value.placementCount === 0 && value.firstPlacement === null
  if (value.status !== "placed" || !count(value.placementCount) || value.placementCount < 1 || !record(value.firstPlacement)) {
    return false
  }
  const first = value.firstPlacement
  if (!exactKeys(first, [
    "sectionId", "sectionIndex", "zoneId", "zoneRole", "nodeId", "placementId", "placementKind",
    "documentOrder", "path", "context",
  ]) || !record(first.context)) return false
  const contextKeys = first.context.kind === "document-field"
    ? ["kind"]
    : ["kind", "collectionFieldKey"]
  return bounded(first.sectionId)
    && count(first.sectionIndex)
    && bounded(first.zoneId)
    && bounded(first.zoneRole)
    && bounded(first.nodeId)
    && bounded(first.placementId)
    && bounded(first.placementKind)
    && count(first.documentOrder)
    && typeof first.path === "string"
    && exactKeys(first.context, contextKeys)
    && (first.context.kind === "document-field"
      || first.context.kind === "collection-repeat" && bounded(first.context.collectionFieldKey)
      || first.context.kind === "collection-item-template" && bounded(first.context.collectionFieldKey))
}

function projectionImageRequirement(value: unknown): boolean {
  return value === null || record(value)
    && exactKeys(value, [
      "valueKind", "assetRegistry", "referencedAssetMustExist", "publishedAssetFallback",
    ])
    && value.valueKind === "image-asset-ref"
    && value.assetRegistry === "instance-media-snapshot-v1"
    && value.referencedAssetMustExist === true
    && value.publishedAssetFallback === "unsupported-without-static-media-owner-binding"
}

function projectionItemField(value: unknown): boolean {
  return record(value)
    && exactKeys(value, [
      "scope", "collectionFieldKey", "key", "label", "valueType", "canonicalTarget", "placement",
      "constraints", "imageAssetInput",
    ])
    && value.scope === "collection-item-field"
    && bounded(value.collectionFieldKey)
    && bounded(value.key)
    && bounded(value.label)
    && bounded(value.valueType)
    && value.canonicalTarget === "table-collection-snapshot-v1"
    && projectionPlacement(value.placement)
    && projectionConstraints(value.constraints)
    && projectionImageRequirement(value.imageAssetInput)
}

function projectionCollection(value: unknown): boolean {
  if (!record(value)
    || !exactKeys(value, ["canonicalTarget", "repeat", "itemIdentity", "itemFields"])
    || value.canonicalTarget !== "table-collection-snapshot-v1"
    || !record(value.repeat)
    || !exactKeys(value.repeat, ["supported", "itemOrder", "minimumItems", "maximumItems"])
    || value.repeat.supported !== true
    || value.repeat.itemOrder !== "snapshot-array-order"
    || !projectionConstraintFact(value.repeat.minimumItems)
    || !projectionConstraintFact(value.repeat.maximumItems)
    || !record(value.itemIdentity)
    || !exactKeys(value.itemIdentity, ["key", "required", "uniqueness"])
    || value.itemIdentity.key !== "itemKey"
    || value.itemIdentity.required !== true
    || value.itemIdentity.uniqueness !== "within-collection"
    || !Array.isArray(value.itemFields)) return false
  return value.itemFields.every(projectionItemField)
}

function projectionField(value: unknown): boolean {
  return record(value)
    && exactKeys(value, [
      "scope", "key", "label", "valueType", "canonicalTarget", "placement", "constraints",
      "imageAssetInput", "collection",
    ])
    && value.scope === "document-field"
    && bounded(value.key)
    && bounded(value.label)
    && bounded(value.valueType)
    && (value.canonicalTarget === "instance-data-snapshot-v1"
      || value.canonicalTarget === "table-collection-snapshot-v1")
    && projectionPlacement(value.placement)
    && projectionConstraints(value.constraints)
    && projectionImageRequirement(value.imageAssetInput)
    && (value.collection === null || projectionCollection(value.collection))
}

function exactProjection(value: Record<string, unknown>): value is Record<string, unknown> & VNextPublishedStructureTestInputProjectionV1 {
  if (!exactKeys(value, [
    "source", "contractVersion", "kind", "status", "owner", "structureFingerprint", "dataContract",
    "tableContracts", "groups", "fields", "summary", "execution", "contracts", "projectionFingerprint", "issues",
  ])
    || value.source !== "vnext-published-structure-test-input-projection"
    || value.contractVersion !== 1
    || value.kind !== "published-structure-test-input-projection"
    || value.status !== "ready"
    || !SHA256.test(String(value.structureFingerprint))
    || !SHA256.test(String(value.projectionFingerprint))
    || !Array.isArray(value.issues)
    || value.issues.length !== 0
    || !record(value.dataContract)
    || !exactKeys(value.dataContract, [
      "dataContractId", "dataContractFingerprint", "fieldContractId", "collectionItemContractId",
    ])
    || !bounded(value.dataContract.dataContractId)
    || !SHA256.test(String(value.dataContract.dataContractFingerprint))
    || !bounded(value.dataContract.fieldContractId)
    || value.dataContract.collectionItemContractId !== null && !bounded(value.dataContract.collectionItemContractId)
    || !Array.isArray(value.tableContracts)
    || !value.tableContracts.every((item) => record(item)
      && exactKeys(item, [
        "tableId", "tableDefinitionId", "tableDefinitionFingerprint", "bindingContractId",
        "bindingContractFingerprint", "collectionFieldKeys",
      ])
      && bounded(item.tableId)
      && bounded(item.tableDefinitionId)
      && SHA256.test(String(item.tableDefinitionFingerprint))
      && bounded(item.bindingContractId)
      && SHA256.test(String(item.bindingContractFingerprint))
      && Array.isArray(item.collectionFieldKeys)
      && item.collectionFieldKeys.every(bounded))
    || !Array.isArray(value.groups)
    || !value.groups.every((group) => record(group)
      && (group.kind === "section"
        ? exactKeys(group, ["kind", "groupId", "sectionId", "sectionIndex", "fieldKeys"])
          && bounded(group.groupId) && bounded(group.sectionId) && count(group.sectionIndex)
        : group.kind === "unplaced" && exactKeys(group, ["kind", "groupId", "fieldKeys"])
          && group.groupId === "unplaced")
      && Array.isArray(group.fieldKeys)
      && group.fieldKeys.every(bounded))
    || !Array.isArray(value.fields)
    || !value.fields.every(projectionField)
    || !record(value.summary)
    || !exactKeys(value.summary, [
      "documentFieldCount", "placedDocumentFieldCount", "unplacedDocumentFieldCount", "collectionFieldCount",
      "collectionItemFieldCount", "placedCollectionItemFieldCount", "imageFieldCount", "unavailableConstraintFactCount",
    ])
    || !Object.values(value.summary).every(count)
    || !record(value.execution)
    || !exactKeys(value.execution, [
      "valueCollection", "snapshotCreation", "validation", "materialization", "resolution", "artifact",
    ])
    || !Object.values(value.execution).every((item) => item === "not-run")
    || !record(value.contracts)
    || !exactKeys(value.contracts, [
      "uiNeutral", "oneDocumentValuePerFieldKey", "presentationPlacementControlsInputIdentity",
      "authoredFallbackPromotedToGenerationDefault", "businessValuesAccepted", "productionBinding",
    ])
    || value.contracts.uiNeutral !== true
    || value.contracts.oneDocumentValuePerFieldKey !== true
    || value.contracts.presentationPlacementControlsInputIdentity !== false
    || value.contracts.authoredFallbackPromotedToGenerationDefault !== false
    || value.contracts.businessValuesAccepted !== false
    || value.contracts.productionBinding !== false) return false
  return true
}

function contentFreeDiagnostics(value: unknown): value is PublishedPreviewAdmissionReceipt["diagnostics"] {
  if (!record(value)
    || !exactKeys(value, ["contentFree", "issues", "warnings", "summary", "diagnosticsFingerprint"])
    || value.contentFree !== true
    || !Array.isArray(value.issues)
    || !Array.isArray(value.warnings)
    || !record(value.summary)
    || !exactKeys(value.summary, [
      "errorCount", "warningCount", "scalarValueCount", "collectionSnapshotCount", "collectionItemCount",
      "mediaAssetCount", "defaultAppliedCount",
    ])
    || !Object.values(value.summary).every(count)
    || !SHA256.test(String(value.diagnosticsFingerprint))) return false
  const issueShape = (item: unknown, severity: "error" | "warning") => record(item)
    && (exactKeys(item, ["source", "severity", "code", "path", "message"])
      || exactKeys(item, ["source", "severity", "code", "path", "message", "detailCode"]))
    && bounded(item.source)
    && item.severity === severity
    && bounded(item.code)
    && typeof item.path === "string"
    && bounded(item.message)
    && (item.detailCode === undefined || bounded(item.detailCode))
  return value.issues.every((item) => issueShape(item, "error"))
    && value.warnings.every((item) => issueShape(item, "warning"))
}

export function parsePublishedPreviewContextEnvelope(value: unknown): PublishedPreviewContext | null {
  if (!record(value) || !exactKeys(value, ["status", "context"]) || value.status !== "ready" || !record(value.context)) {
    return null
  }
  const context = value.context
  if (!exactKeys(context, [
    "source", "contractVersion", "kind", "status", "authoring", "projection", "mappingProfiles",
    "admission", "limits", "contracts", "contextFingerprint",
  ])) return null
  if (
    context.source !== "flowdoc-backend-docgen-local-published-preview"
    || context.contractVersion !== 1
    || context.kind !== "docgen-local-published-preview-context"
    || context.status !== "ready"
    || !SHA256.test(String(context.contextFingerprint))
    || !record(context.authoring)
    || !exactKeys(context.authoring, ["documentId", "documentRevision"])
    || !bounded(context.authoring.documentId)
    || !revision(context.authoring.documentRevision)
    || !record(context.projection)
    || !exactProjection(context.projection)
  ) return null
  const projection = context.projection
  if (
    projection.source !== "vnext-published-structure-test-input-projection"
    || projection.status !== "ready"
    || projection.contracts?.businessValuesAccepted !== false
    || projection.contracts?.productionBinding !== false
    || !record(context.admission)
    || !exactKeys(context.admission, ["contractVersion", "kind", "structure", "assets"])
    || context.admission.contractVersion !== 1
    || context.admission.kind !== "docgen-local-admission-template"
    || !exactOwner(context.admission.structure, projection.owner)
  ) return null
  const assets = ImageAssetRegistryV1Schema.safeParse(context.admission.assets)
  if (!assets.success || !Array.isArray(context.mappingProfiles)) return null
  const mappingProfiles: PublishedPreviewMappingOption[] = []
  for (const option of context.mappingProfiles) {
    if (!record(option) || !exactKeys(option, ["label", "profile"]) || !bounded(option.label)) return null
    const parsed = VNextPublishedStructureMappingProfileV1Schema.safeParse(option.profile)
    if (!parsed.success
      || !exactOwner(parsed.data.owner, projection.owner)
      || parsed.data.target.dataContractId !== projection.dataContract.dataContractId
      || parsed.data.target.dataContractFingerprint !== projection.dataContract.dataContractFingerprint) return null
    mappingProfiles.push({ label: option.label, profile: parsed.data })
  }
  if (
    !record(context.limits)
    || !exactKeys(context.limits, ["adaptedPayloadMaxUtf8Bytes"])
    || context.limits.adaptedPayloadMaxUtf8Bytes !== 1024 * 1024
    || !record(context.contracts)
    || !exactKeys(context.contracts, [
      "trustedBackendProjection", "trustedBackendProfiles", "exactPublishedStructureVersion",
      "businessValuesIncluded", "rawPayloadIncluded", "executableMapperIncluded", "productionBinding",
    ])
    || context.contracts.trustedBackendProjection !== true
    || context.contracts.trustedBackendProfiles !== true
    || context.contracts.exactPublishedStructureVersion !== true
    || context.contracts.businessValuesIncluded !== false
    || context.contracts.rawPayloadIncluded !== false
    || context.contracts.executableMapperIncluded !== false
    || context.contracts.productionBinding !== false
  ) return null
  return {
    ...(context as unknown as PublishedPreviewContext),
    mappingProfiles,
    admission: {
      contractVersion: 1,
      kind: "docgen-local-admission-template",
      structure: projection.owner,
      assets: assets.data,
    },
  }
}

export function parsePublishedPreviewAdmissionEnvelope(
  value: unknown,
  context: PublishedPreviewContext,
  selectedProfile: VNextPublishedStructureMappingProfileV1 | null,
): PublishedPreviewAdmissionReceipt | null {
  if (!record(value)
    || !exactKeys(value, ["status", "admission"])
    || (value.status !== "created" && value.status !== "replayed")
    || !record(value.admission)) return null
  const receipt = value.admission
  if (
    !exactKeys(receipt, [
      "source", "contractVersion", "kind", "admissionId", "status", "lane", "scope", "structure",
      "dataContract", "instance", "inputFingerprint", "canonicalInputFingerprint", "canonicalContentFingerprint",
      "mappingProfile", "assets",
      "diagnostics", "nextStep", "execution", "contracts", "receiptFingerprint",
    ])
    || receipt.source !== "flowdoc-backend-docgen-local-admission"
    || receipt.contractVersion !== 1
    || receipt.kind !== "docgen-local-admission-receipt"
    || !bounded(receipt.admissionId)
    || (receipt.status !== "ready" && receipt.status !== "ready-with-warnings")
    || receipt.lane !== (selectedProfile == null ? "direct" : "adapted")
    || !record(receipt.scope)
    || !exactKeys(receipt.scope, ["tenantId", "principalId"])
    || !bounded(receipt.scope.tenantId)
    || !bounded(receipt.scope.principalId)
    || !exactOwner(receipt.structure, context.projection.owner)
    || !record(receipt.dataContract)
    || !exactKeys(receipt.dataContract, [
      "dataContractId", "dataContractFingerprint", "publishedStructureFingerprint",
    ])
    || receipt.dataContract.dataContractId !== context.projection.dataContract.dataContractId
    || receipt.dataContract.dataContractFingerprint !== context.projection.dataContract.dataContractFingerprint
    || receipt.dataContract.publishedStructureFingerprint !== context.projection.structureFingerprint
    || !record(receipt.instance)
    || !exactKeys(receipt.instance, [
      "contractVersion", "kind", "instanceId", "revision", "structureVersion",
    ])
    || receipt.instance.contractVersion !== 1
    || receipt.instance.kind !== "document-instance"
    || !bounded(receipt.instance.instanceId)
    || !revision(receipt.instance.revision)
    || !exactOwner(receipt.instance.structureVersion, context.projection.owner)
    || !SHA256.test(String(receipt.inputFingerprint))
    || !SHA256.test(String(receipt.canonicalInputFingerprint))
    || !SHA256.test(String(receipt.canonicalContentFingerprint))
    || (selectedProfile == null
      ? receipt.mappingProfile !== null
      : !record(receipt.mappingProfile)
        || !exactKeys(receipt.mappingProfile, [
          "mappingProfileId", "mappingProfileVersion", "profileFingerprint",
        ])
        || receipt.mappingProfile.mappingProfileId !== selectedProfile.mappingProfileId
        || receipt.mappingProfile.mappingProfileVersion !== selectedProfile.mappingProfileVersion
        || receipt.mappingProfile.profileFingerprint !== selectedProfile.profileFingerprint)
    || !record(receipt.assets)
    || !exactKeys(receipt.assets, ["registryFingerprint", "assetCount", "verifiedByteCount"])
    || !SHA256.test(String(receipt.assets.registryFingerprint))
    || !count(receipt.assets.assetCount)
    || !count(receipt.assets.verifiedByteCount)
    || !contentFreeDiagnostics(receipt.diagnostics)
    || receipt.nextStep !== "materialization"
    || !record(receipt.execution)
    || !exactKeys(receipt.execution, [
      "mapping", "runtimeValidation", "materialization", "resolution", "measurement", "pagination", "artifact",
    ])
    || receipt.execution.mapping !== (selectedProfile == null ? "not-required" : "executed")
    || receipt.execution.runtimeValidation !== "run-valid"
    || receipt.execution.materialization !== "not-run"
    || receipt.execution.resolution !== "not-run"
    || receipt.execution.measurement !== "not-run"
    || receipt.execution.pagination !== "not-run"
    || receipt.execution.artifact !== "not-run"
    || !record(receipt.contracts)
    || !exactKeys(receipt.contracts, [
      "backendOwnedInstance", "exactPublishedStructureVersion", "trustedMapperOnly", "exactAssetBytesVerified",
      "rawPayloadRetained", "canonicalBusinessDataExposed", "durablePersistence", "workerEnqueued",
      "productionBinding",
    ])
    || receipt.contracts.backendOwnedInstance !== true
    || receipt.contracts.exactPublishedStructureVersion !== true
    || receipt.contracts.trustedMapperOnly !== true
    || receipt.contracts.exactAssetBytesVerified !== true
    || receipt.contracts.canonicalBusinessDataExposed !== false
    || receipt.contracts.rawPayloadRetained !== false
    || typeof receipt.contracts.durablePersistence !== "boolean"
    || receipt.contracts.workerEnqueued !== false
    || receipt.contracts.productionBinding !== false
    || !SHA256.test(String(receipt.receiptFingerprint))
  ) return null
  return {
    admissionId: receipt.admissionId,
    status: receipt.status,
    lane: receipt.lane,
    structure: receipt.structure,
    dataContract: receipt.dataContract,
    instance: receipt.instance,
    inputFingerprint: receipt.inputFingerprint,
    canonicalInputFingerprint: receipt.canonicalInputFingerprint,
    canonicalContentFingerprint: receipt.canonicalContentFingerprint,
    mappingProfile: receipt.mappingProfile,
    diagnostics: receipt.diagnostics,
    execution: receipt.execution,
    contracts: {
      canonicalBusinessDataExposed: false,
      durablePersistence: receipt.contracts.durablePersistence,
      rawPayloadRetained: false,
      productionBinding: false,
    },
    receiptFingerprint: receipt.receiptFingerprint,
  } as PublishedPreviewAdmissionReceipt
}
