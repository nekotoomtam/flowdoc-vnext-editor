import type {
  VNextPublishedStructureTestInputProjectionV1,
  VNextTestInputCollectionItemFieldProjectionV1,
  VNextTestInputDocumentFieldProjectionV1,
  VNextTestInputValueConstraintsV1,
  VNextTestInputValueTypeV1,
} from "../core/coreAdapter"

const unavailable = () => ({
  status: "metadata-unavailable" as const,
  reason: "not-represented-by-generation-data-contract" as const,
})

const notApplicable = () => ({ status: "not-applicable" as const })

function documentConstraints(valueType: VNextTestInputValueTypeV1): VNextTestInputValueConstraintsV1 {
  return {
    required: unavailable(),
    defaultValue: valueType === "collection" ? notApplicable() : unavailable(),
    allowedValues: valueType === "enum" ? unavailable() : notApplicable(),
    valueFormat: valueType === "date" ? unavailable() : notApplicable(),
  }
}

function itemConstraints(required: boolean): VNextTestInputValueConstraintsV1 {
  return {
    required: { status: "available", source: "collection-item-contract", value: required },
    defaultValue: { status: "absent", source: "collection-item-contract" },
    allowedValues: notApplicable(),
    valueFormat: notApplicable(),
  }
}

function placed(
  key: string,
  documentOrder: number,
  placementKind: "text-field-ref" | "image-field-ref" | "collection-repeat",
  context: { kind: "document-field" } | { kind: "collection-item-template"; collectionFieldKey: string },
) {
  return {
    status: "placed" as const,
    placementCount: 1,
    firstPlacement: {
      sectionId: "qa-section-main",
      sectionIndex: 0,
      zoneId: "qa-zone-body",
      zoneRole: "body" as const,
      nodeId: `qa-node-${key}`,
      placementId: `qa-placement-${key}`,
      placementKind,
      documentOrder,
      path: `document.sections[0].zones[0].${key}`,
      context,
    },
  }
}

function documentField(
  key: string,
  label: string,
  valueType: Exclude<VNextTestInputValueTypeV1, "collection">,
  documentOrder: number,
): VNextTestInputDocumentFieldProjectionV1 {
  return {
    scope: "document-field",
    key,
    label,
    valueType,
    canonicalTarget: "instance-data-snapshot-v1",
    placement: placed(
      key,
      documentOrder,
      valueType === "image" ? "image-field-ref" : "text-field-ref",
      { kind: "document-field" },
    ),
    constraints: documentConstraints(valueType),
    imageAssetInput: valueType === "image" ? {
      valueKind: "image-asset-ref",
      assetRegistry: "instance-media-snapshot-v1",
      referencedAssetMustExist: true,
      publishedAssetFallback: "unsupported-without-static-media-owner-binding",
    } : null,
    collection: null,
  }
}

function itemField(
  key: string,
  label: string,
  valueType: VNextTestInputCollectionItemFieldProjectionV1["valueType"],
  documentOrder: number,
  required: boolean,
): VNextTestInputCollectionItemFieldProjectionV1 {
  return {
    scope: "collection-item-field",
    collectionFieldKey: "entries",
    key,
    label,
    valueType,
    canonicalTarget: "table-collection-snapshot-v1",
    placement: placed(
      key,
      documentOrder,
      valueType === "image" ? "image-field-ref" : "text-field-ref",
      { kind: "collection-item-template", collectionFieldKey: "entries" },
    ),
    constraints: itemConstraints(required),
    imageAssetInput: valueType === "image" ? {
      valueKind: "image-asset-ref",
      assetRegistry: "instance-media-snapshot-v1",
      referencedAssetMustExist: true,
      publishedAssetFallback: "unsupported-without-static-media-owner-binding",
    } : null,
  }
}

const fields: VNextTestInputDocumentFieldProjectionV1[] = [
  documentField("documentTitle", "Document title", "text", 0),
  documentField("reportDate", "Report date", "date", 1),
  documentField("totalValue", "Total value", "number", 2),
  documentField("approved", "Approved", "boolean", 3),
  documentField("category", "Category", "enum", 4),
  documentField("coverImage", "Cover image", "image", 5),
  {
    scope: "document-field",
    key: "entries",
    label: "Entries",
    valueType: "collection",
    canonicalTarget: "table-collection-snapshot-v1",
    placement: placed("entries", 6, "collection-repeat", { kind: "document-field" }),
    constraints: documentConstraints("collection"),
    imageAssetInput: null,
    collection: {
      canonicalTarget: "table-collection-snapshot-v1",
      repeat: {
        supported: true,
        itemOrder: "snapshot-array-order",
        minimumItems: unavailable(),
        maximumItems: unavailable(),
      },
      itemIdentity: {
        key: "itemKey",
        required: true,
        uniqueness: "within-collection",
      },
      itemFields: [
        itemField("description", "Description", "text", 7, true),
        itemField("quantity", "Quantity", "number", 8, true),
        itemField("confirmed", "Confirmed", "boolean", 9, false),
        itemField("attachment", "Attachment", "image", 10, false),
      ],
    },
  },
  {
    ...documentField("internalNote", "Internal note", "text", 11),
    placement: { status: "unplaced", placementCount: 0, firstPlacement: null },
  },
]

export const REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE: VNextPublishedStructureTestInputProjectionV1 = {
  source: "vnext-published-structure-test-input-projection",
  contractVersion: 1,
  kind: "published-structure-test-input-projection",
  status: "ready",
  owner: {
    structureId: "qa-structure",
    structureVersionId: "qa-structure-version-1",
    versionOrdinal: 1,
  },
  structureFingerprint: `sha256:${"1".repeat(64)}`,
  dataContract: {
    dataContractId: "qa-data-contract",
    dataContractFingerprint: `sha256:${"2".repeat(64)}`,
    fieldContractId: "qa-field-contract",
    collectionItemContractId: "qa-collection-item-contract",
  },
  tableContracts: [],
  groups: [
    {
      kind: "section",
      groupId: "section:qa-section-main",
      sectionId: "qa-section-main",
      sectionIndex: 0,
      fieldKeys: [
        "documentTitle",
        "reportDate",
        "totalValue",
        "approved",
        "category",
        "coverImage",
        "entries",
      ],
    },
    { kind: "unplaced", groupId: "unplaced", fieldKeys: ["internalNote"] },
  ],
  fields,
  summary: {
    documentFieldCount: 8,
    placedDocumentFieldCount: 7,
    unplacedDocumentFieldCount: 1,
    collectionFieldCount: 1,
    collectionItemFieldCount: 4,
    placedCollectionItemFieldCount: 4,
    imageFieldCount: 2,
    unavailableConstraintFactCount: 17,
  },
  execution: {
    valueCollection: "not-run",
    snapshotCreation: "not-run",
    validation: "not-run",
    materialization: "not-run",
    resolution: "not-run",
    artifact: "not-run",
  },
  contracts: {
    uiNeutral: true,
    oneDocumentValuePerFieldKey: true,
    presentationPlacementControlsInputIdentity: false,
    authoredFallbackPromotedToGenerationDefault: false,
    businessValuesAccepted: false,
    productionBinding: false,
  },
  projectionFingerprint: `sha256:${"3".repeat(64)}`,
  issues: [],
}
