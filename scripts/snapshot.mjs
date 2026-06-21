import { spawn } from "node:child_process"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = new Map()

for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index]

  if (value.startsWith("--")) {
    const key = value.slice(2)
    const next = process.argv[index + 1]

    if (next && !next.startsWith("--")) {
      args.set(key, next)
      index += 1
    } else {
      args.set(key, "true")
    }
  }
}

const slug = slugify(args.get("name") ?? "snapshot")
const title = args.get("title") ?? titleFromSlug(slug)
const summary = args.get("summary") ?? "Visual checkpoint."
const route = args.get("route") ?? "/"
const port = Number(args.get("port") ?? 5173)
const host = args.get("host") ?? "127.0.0.1"
const viewportWidth = Number(args.get("width") ?? 1920)
const viewportHeight = Number(args.get("height") ?? 1080)
const baseUrl = `http://${host}:${port}`
const url = new URL(route, baseUrl).toString()

const devlogDir = path.join(root, "devlog")
const screenshotsDir = path.join(devlogDir, "screenshots")
const stagesDir = path.join(devlogDir, "stages")

await mkdir(screenshotsDir, { recursive: true })
await mkdir(stagesDir, { recursive: true })

const stageNumber = await nextStageNumber(stagesDir)
const stageId = `${stageNumber}-${slug}`
const screenshotPath = path.join(screenshotsDir, `${stageId}.png`)
const stagePath = path.join(stagesDir, `${stageId}.md`)

let server

try {
  const alreadyRunning = await canFetch(url)

  if (!alreadyRunning) {
    server = spawn(process.execPath, [
      path.join(root, "node_modules", "vite", "bin", "vite.js"),
      "--host",
      host,
      "--port",
      String(port),
      "--strictPort",
    ], {
      cwd: root,
      stdio: "ignore",
      windowsHide: true,
    })

    await waitForUrl(url, 20_000)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
    },
    deviceScaleFactor: 1,
  })

  await page.goto(url, { waitUntil: "networkidle" })
  await page.screenshot({ path: screenshotPath, fullPage: false })
  await browser.close()

  await writeStageNote({
    stagePath,
    stageId,
    title,
    summary,
    screenshotFile: `${stageId}.png`,
    route,
    viewport: `${viewportWidth}x${viewportHeight}`,
    usedExistingServer: alreadyRunning,
  })
  await appendIndex({ stageId, title, summary, screenshotFile: `${stageId}.png` })

  console.log(`Snapshot saved: ${relative(screenshotPath)}`)
  console.log(`Stage note saved: ${relative(stagePath)}`)
} finally {
  if (server) {
    server.kill()
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "snapshot"
}

function titleFromSlug(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

async function nextStageNumber(directory) {
  const files = await readdir(directory).catch(() => [])
  const highest = files.reduce((max, file) => {
    const match = file.match(/^(\d{4})-/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)

  return String(highest + 1).padStart(4, "0")
}

async function canFetch(targetUrl) {
  try {
    const response = await fetch(targetUrl)
    return response.ok
  } catch {
    return false
  }
}

async function waitForUrl(targetUrl, timeoutMs) {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    if (await canFetch(targetUrl)) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for ${targetUrl}`)
}

async function writeStageNote({
  stagePath,
  stageId,
  title,
  summary,
  screenshotFile,
  route,
  viewport,
  usedExistingServer,
}) {
  const body = `# ${stageId} ${title}

Date: ${new Date().toISOString().slice(0, 10)}

Screenshot:

![${title}](../screenshots/${screenshotFile})

## Summary

${summary}

## Capture

- Route: \`${route}\`
- Viewport: \`${viewport}\`
- Server: ${usedExistingServer ? "existing local server" : "temporary Vite server"}

## Verification

- Not yet recorded for this stage.

## Open Polish

- Add notes here before or after commit if the screenshot reveals design drift.
`

  await writeFile(stagePath, body, "utf8")
}

async function appendIndex({ stageId, title, summary, screenshotFile }) {
  const indexPath = path.join(devlogDir, "index.md")
  const row = `| [${stageId} ${title}](stages/${stageId}.md) | ${new Date().toISOString().slice(0, 10)} | [PNG](screenshots/${screenshotFile}) | ${summary} |`

  let content = await readFile(indexPath, "utf8").catch(() => "")

  if (!content.trim()) {
    content = `# EV Mobility Dashboard Devlog

| Stage | Date | Screenshot | Summary |
| --- | --- | --- | --- |
`
  }

  if (!content.includes(`stages/${stageId}.md`)) {
    content = `${content.trimEnd()}\n${row}\n`
  }

  await writeFile(indexPath, content, "utf8")
}

function relative(value) {
  return path.relative(root, value).replaceAll("\\", "/")
}
