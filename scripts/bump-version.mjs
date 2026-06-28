import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const packagePath = path.join(root, 'package.json')
const manifestPath = path.join(root, 'src', 'manifest.json')
const versionTextPath = path.join(root, 'src', 'static', 'version.txt')

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

const replaceJsonStringField = (content, field, value) => content.replace(
  new RegExp(`("${field}"\\s*:\\s*)"[^"]*"`),
  `$1"${value}"`
)

const parseVersion = (version) => {
  const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`)
  }
  return match.slice(1).map(Number)
}

const toVersionCode = (version) => version.replace(/\./g, '')

const packageJson = readJson(packagePath)
const [major, minor, patch] = parseVersion(packageJson.version)
const nextVersion = `${major}.${minor}.${patch + 1}`
const nextVersionCode = toVersionCode(nextVersion)

packageJson.version = nextVersion

writeJson(packagePath, packageJson)
const manifestContent = fs.readFileSync(manifestPath, 'utf8')
const nextManifestContent = replaceJsonStringField(
  replaceJsonStringField(manifestContent, 'versionName', nextVersion),
  'versionCode',
  nextVersionCode
)
fs.writeFileSync(manifestPath, nextManifestContent)
fs.writeFileSync(versionTextPath, `${nextVersion}\n`)

console.log(`Version bumped to ${nextVersion}`)
