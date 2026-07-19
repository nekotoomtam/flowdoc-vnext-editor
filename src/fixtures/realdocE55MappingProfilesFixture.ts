import type { TestInputMappingProfileOption } from "../editor/preview/testInputJsonState"

const policies = {
  sourceSpecific: true as const,
  canonicalSnapshotOutputOnly: true as const,
  layoutFactsAccepted: false as const,
  rendererFactsAccepted: false as const,
  browserExecutionAuthoritative: false as const,
}

export const REALDOC_E55_MAPPING_PROFILES_FIXTURE: readonly TestInputMappingProfileOption[] = [
  {
    label: "Requirements JSON",
    profile: {
      contractVersion: 1,
      kind: "published-structure-mapping-profile",
      mappingProfileId: "mapping:qa-requirements-json",
      mappingProfileVersion: 1,
      owner: {
        structureId: "qa-structure",
        structureVersionId: "qa-structure-version-1",
        versionOrdinal: 1,
      },
      sourceContract: {
        sourceContractId: "source:qa-requirements-json",
        sourceContractVersion: 1,
        schemaFingerprint: `sha256:${"4".repeat(64)}`,
      },
      target: {
        dataContractId: "qa-data-contract",
        dataContractFingerprint: `sha256:${"2".repeat(64)}`,
      },
      execution: {
        kind: "named-adapter",
        adapterId: "adapter:qa-requirements-json",
        adapterVersion: 1,
        implementationFingerprint: `sha256:${"5".repeat(64)}`,
      },
      policies,
      profileFingerprint: `sha256:${"6".repeat(64)}`,
    },
  },
  {
    label: "Requirements JSON (legacy)",
    profile: {
      contractVersion: 1,
      kind: "published-structure-mapping-profile",
      mappingProfileId: "mapping:qa-requirements-json-legacy",
      mappingProfileVersion: 2,
      owner: {
        structureId: "qa-structure",
        structureVersionId: "qa-structure-version-1",
        versionOrdinal: 1,
      },
      sourceContract: {
        sourceContractId: "source:qa-requirements-json-legacy",
        sourceContractVersion: 2,
        schemaFingerprint: `sha256:${"7".repeat(64)}`,
      },
      target: {
        dataContractId: "qa-data-contract",
        dataContractFingerprint: `sha256:${"2".repeat(64)}`,
      },
      execution: {
        kind: "declarative-mapping",
        mappingLanguageId: "mapping-language:qa-json-path",
        mappingLanguageVersion: 1,
        definitionFingerprint: `sha256:${"8".repeat(64)}`,
        executorFingerprint: `sha256:${"9".repeat(64)}`,
      },
      policies,
      profileFingerprint: `sha256:${"a".repeat(64)}`,
    },
  },
]
