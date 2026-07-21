import type { FlowDocTextEngineMultiRunLayoutInputV1 } from "@flowdoc/text-engine-rust-wasm"

export type FlowDocLiveDraftTokenKindV1 =
  | "word"
  | "whitespace"
  | "punctuation"
  | "hard-break"
  | "resolved-field"
  | "generated-page-number"
  | "inline-image"

export interface FlowDocLiveDraftTokenV1 {
  id: string
  inlineId: string
  kind: FlowDocLiveDraftTokenKindV1
  renderStartOffset: number
  renderEndOffset: number
  text: string
  styleFingerprint: string
}

export interface FlowDocLiveDraftTextBlockTokenImpactV1 {
  textBlockId: string
  change: "none" | "content" | "structural"
  previousTokenCount: number
  currentTokenCount: number
  commonPrefixTokenCount: number
  commonSuffixTokenCount: number
  previousDirtyTokenRange: { startIndex: number; endIndex: number }
  currentDirtyTokenRange: { startIndex: number; endIndex: number }
  currentDirtyRenderRange: { startOffset: number; endOffset: number }
  dirtyTokenIds: string[]
  completedTokenBoundary: boolean
  recommendedDispatch: "immediate" | "coalesced"
  contracts: {
    purpose: "scheduling-and-invalidation-hint"
    lineBreakAuthority: false
    geometryAuthority: false
    exactLayoutStillRequired: true
  }
}

function styleFingerprint(run: FlowDocTextEngineMultiRunLayoutInputV1["measurement"]["runs"][number]): string {
  return JSON.stringify([
    run.kind,
    run.styleKey ?? null,
    run.fieldKey ?? null,
    run.localStyle ?? null,
  ])
}

function lexicalKind(text: string, isWordLike: boolean | undefined): FlowDocLiveDraftTokenKindV1 {
  if (/^\s+$/u.test(text)) return "whitespace"
  return isWordLike === true ? "word" : "punctuation"
}

export function tokenizeFlowDocLiveDraftTextBlockV1(
  input: FlowDocTextEngineMultiRunLayoutInputV1,
): FlowDocLiveDraftTokenV1[] {
  const tokens: FlowDocLiveDraftTokenV1[] = []
  const segmenter = new Intl.Segmenter("th", { granularity: "word" })
  input.measurement.runs.forEach((run) => {
    const fingerprint = styleFingerprint(run)
    if (run.kind !== "text") {
      tokens.push({
        id: `${run.inlineId}:${run.renderStartOffset}-${run.renderEndOffset}:${run.kind}`,
        inlineId: run.inlineId,
        kind: run.kind,
        renderStartOffset: run.renderStartOffset,
        renderEndOffset: run.renderEndOffset,
        text: run.renderedText,
        styleFingerprint: fingerprint,
      })
      return
    }
    for (const segment of segmenter.segment(run.renderedText)) {
      const renderStartOffset = run.renderStartOffset + segment.index
      const renderEndOffset = renderStartOffset + segment.segment.length
      tokens.push({
        id: `${run.inlineId}:${renderStartOffset}-${renderEndOffset}`,
        inlineId: run.inlineId,
        kind: lexicalKind(segment.segment, segment.isWordLike),
        renderStartOffset,
        renderEndOffset,
        text: segment.segment,
        styleFingerprint: fingerprint,
      })
    }
  })
  return tokens
}

function sameToken(left: FlowDocLiveDraftTokenV1, right: FlowDocLiveDraftTokenV1): boolean {
  return left.inlineId === right.inlineId
    && left.kind === right.kind
    && left.text === right.text
    && left.styleFingerprint === right.styleFingerprint
}

function structuralTopology(input: FlowDocTextEngineMultiRunLayoutInputV1): string {
  return input.measurement.runs.map((run) => `${run.inlineId}\u0000${run.kind}`).join("\u0001")
}

function touchesStructuralToken(tokens: readonly FlowDocLiveDraftTokenV1[]): boolean {
  return tokens.some((token) => token.kind !== "word" && token.kind !== "whitespace" && token.kind !== "punctuation")
}

function endsAtCompletedTokenBoundary(
  input: FlowDocTextEngineMultiRunLayoutInputV1,
  dirtyTokens: readonly FlowDocLiveDraftTokenV1[],
): boolean {
  const last = dirtyTokens.at(-1)
  if (last == null) return false
  if (last.kind !== "word" && last.kind !== "whitespace" && last.kind !== "punctuation") return true
  if (last.kind === "whitespace" || last.kind === "punctuation") return true
  const following = input.measurement.renderedText.slice(last.renderEndOffset, last.renderEndOffset + 1)
  return following.length > 0 && /\s|[.,;:!?()[\]{}\-]/u.test(following)
}

export function analyzeFlowDocLiveDraftTextBlockTokenImpactV1(input: {
  previous: FlowDocTextEngineMultiRunLayoutInputV1
  current: FlowDocTextEngineMultiRunLayoutInputV1
}): FlowDocLiveDraftTextBlockTokenImpactV1 {
  const previousTokens = tokenizeFlowDocLiveDraftTextBlockV1(input.previous)
  const currentTokens = tokenizeFlowDocLiveDraftTextBlockV1(input.current)
  let commonPrefixTokenCount = 0
  while (
    commonPrefixTokenCount < previousTokens.length
    && commonPrefixTokenCount < currentTokens.length
    && sameToken(previousTokens[commonPrefixTokenCount]!, currentTokens[commonPrefixTokenCount]!)
  ) commonPrefixTokenCount += 1

  let commonSuffixTokenCount = 0
  while (
    commonSuffixTokenCount < previousTokens.length - commonPrefixTokenCount
    && commonSuffixTokenCount < currentTokens.length - commonPrefixTokenCount
    && sameToken(
      previousTokens[previousTokens.length - 1 - commonSuffixTokenCount]!,
      currentTokens[currentTokens.length - 1 - commonSuffixTokenCount]!,
    )
  ) commonSuffixTokenCount += 1

  const previousEndIndex = previousTokens.length - commonSuffixTokenCount
  const currentEndIndex = currentTokens.length - commonSuffixTokenCount
  const previousDirtyTokens = previousTokens.slice(commonPrefixTokenCount, previousEndIndex)
  const currentDirtyTokens = currentTokens.slice(commonPrefixTokenCount, currentEndIndex)
  const noChange = previousDirtyTokens.length === 0 && currentDirtyTokens.length === 0
  const structural = !noChange && (
    structuralTopology(input.previous) !== structuralTopology(input.current)
    || touchesStructuralToken(previousDirtyTokens)
    || touchesStructuralToken(currentDirtyTokens)
  )
  const fallbackOffset = Math.min(
    input.current.measurement.renderedText.length,
    previousDirtyTokens[0]?.renderStartOffset ?? input.current.measurement.renderedText.length,
  )
  const currentDirtyRenderRange = {
    startOffset: currentDirtyTokens[0]?.renderStartOffset ?? fallbackOffset,
    endOffset: currentDirtyTokens.at(-1)?.renderEndOffset ?? fallbackOffset,
  }
  const completedTokenBoundary = endsAtCompletedTokenBoundary(input.current, currentDirtyTokens)
  return {
    textBlockId: input.current.measurement.textBlockId,
    change: noChange ? "none" : structural ? "structural" : "content",
    previousTokenCount: previousTokens.length,
    currentTokenCount: currentTokens.length,
    commonPrefixTokenCount,
    commonSuffixTokenCount,
    previousDirtyTokenRange: { startIndex: commonPrefixTokenCount, endIndex: previousEndIndex },
    currentDirtyTokenRange: { startIndex: commonPrefixTokenCount, endIndex: currentEndIndex },
    currentDirtyRenderRange,
    dirtyTokenIds: currentDirtyTokens.map((token) => token.id),
    completedTokenBoundary,
    recommendedDispatch: structural || completedTokenBoundary ? "immediate" : "coalesced",
    contracts: {
      purpose: "scheduling-and-invalidation-hint",
      lineBreakAuthority: false,
      geometryAuthority: false,
      exactLayoutStillRequired: true,
    },
  }
}
