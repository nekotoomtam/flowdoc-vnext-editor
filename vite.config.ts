import { defineConfig, type ProxyOptions } from "vite"
import react from "@vitejs/plugin-react"

export const FLOWDOC_LOCAL_PDF_EXPORT_PROXY_PREFIX = "/api/pdf-export-local"

export interface FlowDocLocalPdfExportProxyProfile {
  bearerToken: string
  target: string
}

export function resolveFlowDocLocalPdfExportProxyProfile(input: {
  command: "build" | "serve"
  env: NodeJS.ProcessEnv
}): FlowDocLocalPdfExportProxyProfile | null {
  if (input.command !== "serve") return null
  if (
    input.env.FLOWDOC_PDF_LOCAL_RUNTIME_PROFILE !== "local-integration"
    || input.env.FLOWDOC_PDF_LOCAL_INTEGRATION !== "1"
    || input.env.FLOWDOC_PDF_LOCAL_HTTP_HOST !== "127.0.0.1"
  ) return null
  const port = Number(input.env.FLOWDOC_PDF_LOCAL_HTTP_PORT ?? "4012")
  const bearerToken = input.env.FLOWDOC_PDF_LOCAL_BEARER_TOKEN ?? ""
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) return null
  if (bearerToken.length < 32 || bearerToken.length > 512 || /\s/u.test(bearerToken)) return null
  return { bearerToken, target: `http://127.0.0.1:${port}` }
}

export function rewriteFlowDocLocalPdfExportProxyPath(path: string): string {
  if (!path.startsWith(FLOWDOC_LOCAL_PDF_EXPORT_PROXY_PREFIX)) return path
  const suffix = path.slice(FLOWDOC_LOCAL_PDF_EXPORT_PROXY_PREFIX.length) || "/"
  return suffix.startsWith("/eligibility") ? `/pdf-export-local${suffix}` : suffix
}

export function createFlowDocLocalPdfExportProxy(profile: FlowDocLocalPdfExportProxyProfile): ProxyOptions {
  return {
    changeOrigin: false,
    configure(proxy) {
      proxy.on("proxyReq", (proxyRequest) => {
        proxyRequest.setHeader("authorization", `Bearer ${profile.bearerToken}`)
      })
    },
    rewrite: rewriteFlowDocLocalPdfExportProxyPath,
    target: profile.target,
  }
}

export default defineConfig(({ command }) => {
  const localPdfExport = resolveFlowDocLocalPdfExportProxyProfile({ command, env: process.env })
  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 4001,
      proxy: localPdfExport == null
        ? undefined
        : { [FLOWDOC_LOCAL_PDF_EXPORT_PROXY_PREFIX]: createFlowDocLocalPdfExportProxy(localPdfExport) },
    },
    preview: {
      host: "127.0.0.1",
      port: 4001,
    },
  }
})
