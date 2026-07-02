import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const projectRoot = dirname(repoRoot)
const sourceRoot = join(projectRoot, "src")

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "tests") return []
      return sourceFiles(entryPath)
    }
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : []
  })
}

function read(path: string): string {
  return readFileSync(path, "utf8")
}

describe("product editor phase 0 boundaries", () => {
  it("keeps core package imports behind src/core", () => {
    const offenders = sourceFiles(sourceRoot)
      .filter((file) => !relative(sourceRoot, file).startsWith("core"))
      .filter((file) => read(file).includes("@flowdoc/vnext-core"))

    expect(offenders).toEqual([])
  })

  it("keeps the core package dependency bound at the adapter facade", () => {
    const offenders = sourceFiles(sourceRoot)
      .filter((file) => read(file).includes("@flowdoc/vnext-core"))
      .map((file) => relative(sourceRoot, file))
      .filter((file) => file !== join("core", "coreAdapter.ts"))

    expect(offenders).toEqual([])
  })

  it("keeps core adapter submodules internal to src/core", () => {
    const internalModules = [
      "coreFixtureRead",
      "corePackageRead",
      "coreReadResult",
      "coreReadTransport",
    ]
    const offenders = sourceFiles(sourceRoot)
      .filter((file) => !relative(sourceRoot, file).startsWith("core"))
      .filter((file) => {
        const source = read(file)
        return internalModules.some((moduleName) => source.includes(`/core/${moduleName}`)
          || source.includes(`\\core\\${moduleName}`))
      })
      .map((file) => relative(sourceRoot, file))

    expect(offenders).toEqual([])
  })

  it("keeps lab runtime and app-render patterns out of source", () => {
    const source = sourceFiles(sourceRoot).map((file) => read(file)).join("\n")

    expect(source).not.toContain("template-builder-sandbox")
    expect(source).not.toContain("app.innerHTML")
    expect(source).not.toContain("document.body.innerHTML")
    expect(source).not.toContain("contenteditable")
  })

  it("keeps blocked editor dependencies out of package metadata", () => {
    const packageJson = JSON.parse(read(join(projectRoot, "package.json"))) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const dependencyNames = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ]

    expect(dependencyNames).not.toContain("tailwindcss")
    expect(dependencyNames).not.toContain("slate")
    expect(dependencyNames.some((name) => name.startsWith("prosemirror-"))).toBe(false)
    expect(dependencyNames.some((name) => name.startsWith("@tiptap/"))).toBe(false)
    expect(dependencyNames).not.toContain("@playwright/test")
    expect(packageJson.devDependencies).toHaveProperty("@vitejs/plugin-react")
    expect(packageJson.dependencies).not.toHaveProperty("@vitejs/plugin-react")
  })
})
