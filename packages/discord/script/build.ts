#!/usr/bin/env bun

import path from "path"
import fs from "fs"
import { $ } from "bun"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

import pkg from "../package.json"

const singleFlag = process.argv.includes("--single")

// Get git commit hash for version
let commitHash = "unknown"
try {
  const { stdout } = await $`git rev-parse --short HEAD`
  commitHash = stdout.toString().trim()
} catch {
  // git not available or not a repo
}

const version = `${pkg.version}-${commitHash}`
console.log(`Building version: ${version}`)

const allTargets: {
  os: string
  arch: "arm64" | "x64"
}[] = [
  { os: "linux", arch: "arm64" },
  { os: "linux", arch: "x64" },
  { os: "darwin", arch: "arm64" },
  { os: "darwin", arch: "x64" },
  { os: "win32", arch: "x64" },
]

const targets = singleFlag
  ? allTargets.filter((item) => item.os === process.platform && item.arch === process.arch)
  : allTargets

await $`rm -rf dist`

const binaries: Record<string, string> = {}

for (const item of targets) {
  const name = [
    "opencode-discord",
    item.os === "win32" ? "windows" : item.os,
    item.arch,
  ].join("-")

  const outDir = `dist/${name}`
  const ext = item.os === "win32" ? ".exe" : ""

  console.log(`building ${name}`)
  await $`mkdir -p ${outDir}/bin`

  // Create a version.ts file that will be imported
  const versionContent = `// Auto-generated during build
export const BOT_VERSION = "opencode-discord ${version}"
`
  fs.writeFileSync("src/version.ts", versionContent)

  // Use Bun's compile feature
  const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: outDir,
    target: `bun-${item.os}-${item.arch}`,
    compile: true,
    define: {
      "process.env.BOT_VERSION": JSON.stringify(`opencode-discord ${version}`),
    },
  })

  // Clean up version.ts
  try {
    fs.unlinkSync("src/version.ts")
  } catch {}

  if (!result.success) {
    console.error(`Failed to build ${name}:`, result.logs)
    continue
  }

  // Move compiled file to bin directory
  // Bun.compile uses the entrypoint filename (without .ts extension) + platform extension
  const compiledFile = `${outDir}/src${ext}`
  const outFile = `${outDir}/bin/opencode-discord${ext}`
  if (fs.existsSync(compiledFile)) {
    fs.renameSync(compiledFile, outFile)
  }

  await Bun.file(`${outDir}/package.json`).write(
    JSON.stringify(
      {
        name,
        version: pkg.version,
        os: [item.os],
        cpu: [item.arch],
        commit: commitHash,
      },
      null,
      2,
    ),
  )
  binaries[name] = version
}

console.log("\nBuilt binaries:")
for (const [name, version] of Object.entries(binaries)) {
  console.log(`  ${name}@${version}`)
}

export { binaries }
