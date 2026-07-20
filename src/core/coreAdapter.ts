import {
  VNEXT_CORE_VERSION_CAPABILITY_CONTRACT,
  DataSnapshotV2Schema,
  ImageAssetRegistryV1Schema,
  InlineNodeV4TargetSchema,
  VNextPublishedStructureMappingProfileV1Schema,
  VNextTableCollectionValueV1Schema,
  VNextDraftStructurePreviewSnapshotV1Schema,
  createVNextDraftStructurePreviewSnapshotV1,
  createVNextCompactFingerprint,
  createVNextPublishedStructureMappingProfileV1,
  createVNextRendererBackedTextMeasurer,
  createVNextTextMeasurementCache,
  measureVNextText,
  acceptVNextTextBlockV4MeasuredLines,
  paginateVNextTextFlowV4,
  projectVNextTextFlowDisplayListV1,
  inspectVNextPackageVersionCapability,
  safeCreateVNextReadOnlyRuntimeSessionV4,
  safeCreateVNextRuntimeSession,
  type VNextCoreVersionCapabilityContract,
  type VNextPackageVersionInspection,
  type InlineNodeV4Target,
  type ImageAssetRegistryV1,
  type DataSnapshotV2,
  type DataSnapshotV2Value,
  type VNextTableCollectionValueV1,
  type VNextPublishedStructureTestInputProjectionV1,
  type VNextPublishedStructureMappingProfileV1,
  type VNextDraftStructurePreviewSnapshotV1,
  type VNextRendererTextMeasurementProvider,
  type VNextTextBlockV4MeasurementRequest,
  type VNextTextBlockV4MeasurementRun,
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
  DataSnapshotV2Schema,
  ImageAssetRegistryV1Schema,
  VNextPublishedStructureMappingProfileV1Schema,
  VNextTableCollectionValueV1Schema,
  VNextDraftStructurePreviewSnapshotV1Schema,
  createVNextDraftStructurePreviewSnapshotV1,
  createVNextCompactFingerprint,
  createVNextPublishedStructureMappingProfileV1,
  loadInitialEditorSeed,
  validateCoreReadTransportEnvelope,
  type CoreFixtureSource,
  type ImageAssetRegistryV1,
  type DataSnapshotV2,
  type DataSnapshotV2Value,
  type VNextTableCollectionValueV1,
  type CoreReadTransportEnvelopeValidation,
  type LoadInitialCoreSnapshotOptions,
  type LoadReadOnlyCoreSnapshotFromCoreFixtureTransportOptions,
  type LoadReadOnlyCoreSnapshotFromPackageOptions,
  type LoadReadOnlyCoreSnapshotOptions,
  type VNextPublishedStructureTestInputProjectionV1,
  type VNextPublishedStructureMappingProfileV1,
  type VNextDraftStructurePreviewSnapshotV1,
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

export const CORE_LIVE_DRAFT_ONE_BLOCK_LAYOUT_VERSION = "core-live-draft-one-block-xr2-v1" as const

export type CoreLiveDraftExternalMeasurementV1 = ReturnType<VNextRendererTextMeasurementProvider["measure"]>
export type CoreLiveDraftMeasurementRunV1 = VNextTextBlockV4MeasurementRun
export type CoreLiveDraftTextFlowDisplayListV1 = Extract<
  ReturnType<typeof projectVNextTextFlowDisplayListV1>,
  { status: "ready" }
>

export interface CoreLiveDraftTextFlowDisplayListInputV1 {
  projectionId: string
  pageWidthPt: number
  pageHeightPt: number
  bodyXPt: number
  bodyYPt: number
  fontId: string
  fontFamily: string
  fontSizePt: number
  baselineOffsetPt: number
  color: string
}

export interface CoreLiveDraftOneBlockLayoutInputV1 {
  documentId: string
  instanceRevision: number
  sectionId: string
  textBlockId: string
  text: string
  availableWidthPt: number
  pageBodyHeightPt: number
  styleKey: string
  sourceRuns?: CoreLiveDraftMeasurementRunV1[]
  displayList?: CoreLiveDraftTextFlowDisplayListInputV1
}

export interface CoreLiveDraftOneBlockLayoutResultV1 {
  contractVersion: typeof CORE_LIVE_DRAFT_ONE_BLOCK_LAYOUT_VERSION
  measurement: {
    cacheStatus: "hit" | "miss" | "uncached"
    widthPt: number
    heightPt: number
    lineHeightPt: number
    lineBoxes: Array<{
      index: number
      text: string
      startOffset: number
      endOffset: number
      widthPt: number
      heightPt: number
      yOffsetPt: number
    }>
  }
  acceptanceSummary: { lineCount: number; renderedLength: number; totalHeightPt: number }
  pagination: {
    status: "complete"
    measurementFingerprint: string
    fingerprint: string
    summary: { pageCount: number; fragmentCount: number; lineCount: number; splitAcrossPages: boolean }
    work: { pageAttemptCount: number; lineVisitCount: number; cursorCommitCount: number }
    pages: Array<{
      familyPageIndex: number
      availableHeightPt: number
      usedHeightPt: number
      remainingHeightPt: number
      fragmentFingerprint: string
      lineStartIndex: number
      lineEndIndexExclusive: number
      heightPt: number
    }>
  }
  displayList?: CoreLiveDraftTextFlowDisplayListV1
  timings: {
    providerInvoked: boolean
    providerMs: number
    measurementMs: number
    acceptanceMs: number
    paginationMs: number
    coreBoundaryMs: number
  }
}

function coreLiveDraftNow(): number {
  return globalThis.performance.now()
}

export function createCoreLiveDraftOneBlockLayoutSessionV1(input: {
  measurementProfileId: string
  profileRevision: string
}): {
  clearCache(): void
  layout(
    layoutInput: CoreLiveDraftOneBlockLayoutInputV1,
    measureExternal: (input: {
      text: string
      availableWidthPt: number
      styleKey: string
    }) => CoreLiveDraftExternalMeasurementV1,
  ): CoreLiveDraftOneBlockLayoutResultV1
} {
  const cache = createVNextTextMeasurementCache()
  const profile = {
    profileId: input.measurementProfileId,
    availability: "ready" as const,
    engine: "custom" as const,
    revision: input.profileRevision,
    units: "pt",
    deterministic: true,
    capabilities: { lineBoxes: true, styleKey: true, availableWidth: true },
  }

  return {
    clearCache() {
      cache.clear()
    },
    layout(layoutInput, measureExternal) {
      let providerInvoked = false
      let providerMs = 0
      const measurer = createVNextRendererBackedTextMeasurer(profile, {
        measure(request) {
          providerInvoked = true
          const startedAt = coreLiveDraftNow()
          const draft = measureExternal({
            text: request.text,
            availableWidthPt: request.availableWidthPt,
            styleKey: request.styleKey,
          })
          providerMs = coreLiveDraftNow() - startedAt
          return draft
        },
      })
      const boundaryStartedAt = coreLiveDraftNow()
      const measurementStartedAt = coreLiveDraftNow()
      const measurement = measureVNextText({
        documentId: layoutInput.documentId,
        sectionId: layoutInput.sectionId,
        nodeId: layoutInput.textBlockId,
        text: layoutInput.text,
        availableWidthPt: layoutInput.availableWidthPt,
        styleKey: layoutInput.styleKey,
        measurementProfileId: input.measurementProfileId,
      }, measurer, cache)
      const measurementMs = coreLiveDraftNow() - measurementStartedAt

      const request: VNextTextBlockV4MeasurementRequest = {
        documentId: layoutInput.documentId,
        instanceRevision: layoutInput.instanceRevision,
        sectionId: layoutInput.sectionId,
        textBlockId: layoutInput.textBlockId,
        availableWidthPt: layoutInput.availableWidthPt,
        measurementProfileId: input.measurementProfileId,
        styleKey: layoutInput.styleKey,
        renderedText: layoutInput.text,
        runs: layoutInput.sourceRuns ?? [{
          inlineId: `${layoutInput.textBlockId}:text`,
          kind: "text",
          renderStartOffset: 0,
          renderEndOffset: layoutInput.text.length,
          renderedText: layoutInput.text,
          styleKey: layoutInput.styleKey,
        }],
      }
      const acceptanceStartedAt = coreLiveDraftNow()
      const accepted = acceptVNextTextBlockV4MeasuredLines(request, measurement.lineBoxes.map((line) => ({
        index: line.index,
        startOffset: line.startOffset,
        endOffset: line.endOffset,
        text: line.text,
        widthPt: line.widthPt,
        heightPt: line.heightPt,
      })))
      const acceptanceMs = coreLiveDraftNow() - acceptanceStartedAt
      if (accepted.status !== "accepted") {
        throw new Error(`Core measured-line acceptance blocked: ${accepted.issues.map((issue) => issue.code).join(", ")}`)
      }

      const paginationStartedAt = coreLiveDraftNow()
      const pagination = paginateVNextTextFlowV4({
        accepted,
        pageBodyHeightPt: layoutInput.pageBodyHeightPt,
        maximumPageCount: 10_000,
      })
      const paginationMs = coreLiveDraftNow() - paginationStartedAt
      if (pagination.status !== "complete") {
        const codes = pagination.status === "blocked" ? pagination.issues.map((issue) => issue.code).join(", ") : pagination.status
        throw new Error(`Core one-block pagination did not complete: ${codes}`)
      }

      const displayList = layoutInput.displayList == null
        ? null
        : projectVNextTextFlowDisplayListV1({
            projectionId: layoutInput.displayList.projectionId,
            pagination,
            pageBox: {
              widthPt: layoutInput.displayList.pageWidthPt,
              heightPt: layoutInput.displayList.pageHeightPt,
              body: {
                xPt: layoutInput.displayList.bodyXPt,
                yPt: layoutInput.displayList.bodyYPt,
                widthPt: layoutInput.availableWidthPt,
                heightPt: layoutInput.pageBodyHeightPt,
              },
            },
            style: {
              styleKey: layoutInput.styleKey,
              fontId: layoutInput.displayList.fontId,
              fontFamily: layoutInput.displayList.fontFamily,
              fontSizePt: layoutInput.displayList.fontSizePt,
              baselineOffsetPt: layoutInput.displayList.baselineOffsetPt,
              color: layoutInput.displayList.color,
            },
            ...(layoutInput.sourceRuns == null ? {} : { sourceRuns: layoutInput.sourceRuns }),
          })
      if (displayList?.status === "blocked") {
        throw new Error(`Core text-flow display list blocked: ${displayList.issues.map((issue) => issue.code).join(", ")}`)
      }

      return {
        contractVersion: CORE_LIVE_DRAFT_ONE_BLOCK_LAYOUT_VERSION,
        measurement: {
          cacheStatus: measurement.cacheStatus,
          widthPt: measurement.widthPt,
          heightPt: measurement.heightPt,
          lineHeightPt: measurement.lineHeightPt,
          lineBoxes: measurement.lineBoxes.map((line) => ({ ...line })),
        },
        acceptanceSummary: { ...accepted.summary },
        pagination: {
          status: "complete",
          measurementFingerprint: pagination.measurementFingerprint,
          fingerprint: pagination.fingerprint,
          summary: { ...pagination.summary },
          work: { ...pagination.work },
          pages: pagination.pages.map((page) => ({
            familyPageIndex: page.familyPageIndex,
            availableHeightPt: page.availableHeightPt,
            usedHeightPt: page.usedHeightPt,
            remainingHeightPt: page.remainingHeightPt,
            fragmentFingerprint: page.fragment.fingerprint,
            lineStartIndex: page.fragment.lineStartIndex,
            lineEndIndexExclusive: page.fragment.lineEndIndexExclusive,
            heightPt: page.fragment.heightPt,
          })),
        },
        ...(displayList == null ? {} : { displayList }),
        timings: {
          providerInvoked,
          providerMs,
          measurementMs,
          acceptanceMs,
          paginationMs,
          coreBoundaryMs: coreLiveDraftNow() - boundaryStartedAt,
        },
      }
    },
  }
}
