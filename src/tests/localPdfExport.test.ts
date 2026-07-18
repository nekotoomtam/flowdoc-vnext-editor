import { describe, expect, it } from "vitest"
import {
  isLocalPdfExportStatusForPin,
  parseLocalPdfExportEligibility,
  parseLocalPdfExportStatusEnvelope,
  type LocalPdfExportEligibility,
  type LocalPdfExportPublicStatus,
} from "../editor/pdfExport/localPdfExportContracts"
import { projectLocalPdfExportControl } from "../editor/pdfExport/localPdfExportControl"
import {
  createLocalPdfExportClient,
  type LocalPdfExportFetch,
  type LocalPdfExportFetchResponse,
} from "../editor/pdfExport/localPdfExportTransport"
import {
  FLOWDOC_LOCAL_PDF_EXPORT_PROXY_PREFIX,
  createFlowDocLocalPdfExportProxy,
  resolveFlowDocLocalPdfExportProxyProfile,
  rewriteFlowDocLocalPdfExportProxyPath,
} from "../../vite.config"

const PIN = { documentId: "document:canonical", documentRevision: 1 }

const ELIGIBILITY: LocalPdfExportEligibility = {
  source: "flowdoc-backend-pdf-export-local-eligibility",
  contractVersion: 1,
  kind: "pdf-export-local-eligibility",
  status: "eligible",
  documentId: PIN.documentId,
  documentRevision: PIN.documentRevision,
  lane: "canonical-evidence",
  reason: null,
  contracts: {
    exactDocumentPin: true,
    requestBodyIdentityFieldsForbidden: true,
    sameOriginDevelopmentProxyRequired: true,
    productionBinding: false,
  },
}

function publicStatus(state: LocalPdfExportPublicStatus["state"] = "pending"): LocalPdfExportPublicStatus {
  return {
    operationId: "operation:local-f",
    exportRequestId: "export-request:local-f",
    artifactId: "artifact:local-f",
    documentId: PIN.documentId,
    documentRevision: PIN.documentRevision,
    state,
    acceptedAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:01.000Z",
    terminalStatus: state === "completed" ? "completed" : null,
    stopReason: null,
    pageCount: state === "completed" ? 13 : null,
    byteLength: state === "completed" ? 1_212_656 : null,
  }
}

function response(options: {
  body?: unknown
  contentType?: string
  ok?: boolean
  pdf?: Blob
  status?: number
}): LocalPdfExportFetchResponse {
  return {
    async blob() {
      return options.pdf ?? new Blob()
    },
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type" ? options.contentType ?? "application/json" : null
      },
    },
    async json() {
      return options.body
    },
    ok: options.ok ?? true,
    status: options.status ?? 200,
  }
}

describe("PDF export LOCAL-F Editor integration", () => {
  it("accepts only the exact eligibility and redacted status contracts", () => {
    expect(parseLocalPdfExportEligibility(ELIGIBILITY)).toEqual(ELIGIBILITY)
    expect(parseLocalPdfExportEligibility({
      ...ELIGIBILITY,
      contracts: { ...ELIGIBILITY.contracts, productionBinding: true },
    })).toBeNull()
    expect(parseLocalPdfExportEligibility({
      ...ELIGIBILITY,
      status: "eligible",
      lane: null,
    })).toBeNull()

    const pending = publicStatus()
    expect(parseLocalPdfExportStatusEnvelope({ status: "found", export: pending })).toEqual(pending)
    expect(parseLocalPdfExportStatusEnvelope({
      status: "found",
      export: { ...pending, storageKey: "forbidden-provider-detail" },
    })).toBeNull()
    expect(isLocalPdfExportStatusForPin(pending, PIN)).toBe(true)
    expect(isLocalPdfExportStatusForPin(pending, { ...PIN, documentRevision: 2 })).toBe(false)
  })

  it("uses only same-origin routes and sends no browser credential or identity fields", async () => {
    const calls: Array<{ input: string; init?: Parameters<LocalPdfExportFetch>[1] }> = []
    const queued = [
      response({ body: ELIGIBILITY }),
      response({ body: { status: "created", export: publicStatus() }, status: 202 }),
      response({ body: { status: "found", export: publicStatus("processing") } }),
      response({
        body: {
          status: "applied",
          operationId: "operation:local-f",
          state: "cancel-requested",
          requestedAt: "2026-07-19T00:00:02.000Z",
        },
        status: 202,
      }),
      response({ contentType: "application/pdf", pdf: new Blob(["%PDF-local-f"]) }),
    ]
    const fetchImpl: LocalPdfExportFetch = async (input, init) => {
      calls.push({ input, init })
      const next = queued.shift()
      if (next == null) throw new Error("unexpected fetch")
      return next
    }
    const client = createLocalPdfExportClient({ fetchImpl })

    await expect(client.checkEligibility(PIN)).resolves.toEqual(ELIGIBILITY)
    await expect(client.requestExport(PIN, "request-key:local-f")).resolves.toMatchObject({ state: "pending" })
    await expect(client.readStatus("operation:local-f")).resolves.toMatchObject({ state: "processing" })
    await expect(client.cancelExport("operation:local-f", "cancel-key:local-f")).resolves.toMatchObject({
      operationId: "operation:local-f",
      state: "cancel-requested",
    })
    await expect(client.downloadExport("operation:local-f")).resolves.toMatchObject({ size: 12 })

    expect(calls.map((call) => call.input)).toEqual([
      "/api/pdf-export-local/eligibility?documentId=document%3Acanonical&documentRevision=1",
      "/api/pdf-export-local/pdf-exports",
      "/api/pdf-export-local/pdf-exports/operation%3Alocal-f",
      "/api/pdf-export-local/pdf-exports/operation%3Alocal-f/cancel",
      "/api/pdf-export-local/pdf-exports/operation%3Alocal-f/download",
    ])
    expect(JSON.parse(calls[1]!.init!.body!)).toEqual(PIN)
    expect(Object.keys(JSON.parse(calls[1]!.init!.body!)).sort()).toEqual(["documentId", "documentRevision"])
    expect(calls.every((call) => (
      call.init?.headers == null
      || Object.keys(call.init.headers).every((name) => name.toLowerCase() !== "authorization")
    ))).toBe(true)
  })

  it("projects eligibility, cancellation, terminal download, and retry controls", () => {
    expect(projectLocalPdfExportControl({
      activity: "idle",
      eligibility: "ineligible",
      error: null,
      operation: null,
    })).toMatchObject({ action: null, disabled: true, label: "PDF unavailable" })
    expect(projectLocalPdfExportControl({
      activity: "idle",
      eligibility: "unavailable",
      error: "eligibility-unavailable",
      operation: null,
    })).toMatchObject({ action: "check-eligibility", disabled: false })
    expect(projectLocalPdfExportControl({
      activity: "idle",
      eligibility: "eligible",
      error: null,
      operation: publicStatus("processing"),
    })).toMatchObject({ action: "cancel", label: "Cancel PDF" })
    expect(projectLocalPdfExportControl({
      activity: "idle",
      eligibility: "eligible",
      error: "status-unavailable",
      operation: publicStatus("pending"),
    })).toMatchObject({ action: "cancel", label: "Cancel PDF", statusLabel: "PDF: Status unavailable" })
    expect(projectLocalPdfExportControl({
      activity: "idle",
      eligibility: "eligible",
      error: null,
      operation: publicStatus("completed"),
    })).toMatchObject({ action: "download", label: "Download PDF" })
    expect(projectLocalPdfExportControl({
      activity: "idle",
      eligibility: "eligible",
      error: null,
      operation: publicStatus("failed"),
    })).toMatchObject({ action: "request", label: "Retry PDF" })
  })

  it("enables the credential-injecting proxy only for an exact local serve profile", () => {
    const token = "local-f-token-0123456789abcdef0123456789"
    const env = {
      FLOWDOC_PDF_LOCAL_RUNTIME_PROFILE: "local-integration",
      FLOWDOC_PDF_LOCAL_INTEGRATION: "1",
      FLOWDOC_PDF_LOCAL_HTTP_HOST: "127.0.0.1",
      FLOWDOC_PDF_LOCAL_HTTP_PORT: "4012",
      FLOWDOC_PDF_LOCAL_BEARER_TOKEN: token,
    }
    expect(resolveFlowDocLocalPdfExportProxyProfile({ command: "serve", env })).toEqual({
      bearerToken: token,
      target: "http://127.0.0.1:4012",
    })
    expect(resolveFlowDocLocalPdfExportProxyProfile({ command: "build", env })).toBeNull()
    expect(resolveFlowDocLocalPdfExportProxyProfile({
      command: "serve",
      env: { ...env, FLOWDOC_PDF_LOCAL_HTTP_HOST: "0.0.0.0" },
    })).toBeNull()
    expect(rewriteFlowDocLocalPdfExportProxyPath(
      `${FLOWDOC_LOCAL_PDF_EXPORT_PROXY_PREFIX}/pdf-exports/operation:1`,
    )).toBe("/pdf-exports/operation:1")
    expect(rewriteFlowDocLocalPdfExportProxyPath(
      `${FLOWDOC_LOCAL_PDF_EXPORT_PROXY_PREFIX}/eligibility?documentId=one&documentRevision=1`,
    )).toBe("/pdf-export-local/eligibility?documentId=one&documentRevision=1")

    let proxyRequestListener: ((request: { setHeader(name: string, value: string): void }) => void) | null = null
    const proxy = createFlowDocLocalPdfExportProxy({ bearerToken: token, target: "http://127.0.0.1:4012" })
    proxy.configure?.({
      on(event: string, listener: typeof proxyRequestListener) {
        if (event === "proxyReq") proxyRequestListener = listener
      },
    } as never, {} as never)
    let authorization: string | null = null
    const invokeProxyRequest = proxyRequestListener as null | ((request: {
      setHeader(name: string, value: string): void
    }) => void)
    invokeProxyRequest?.({
      setHeader(name, value) {
        if (name === "authorization") authorization = value
      },
    })
    expect(authorization).toBe(`Bearer ${token}`)
  })
})
