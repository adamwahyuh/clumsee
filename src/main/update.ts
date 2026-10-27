export type Update = { version: string; url: string; install?: boolean }

const RELEASES = 'https://api.github.com/repos/adamwahyuh/clumsee/releases/latest'

const parts = (v: string): number[] => v.replace(/^v/, '').split('-')[0].split('.').map((n) => Number(n) || 0)

export function isNewer(latest: string, current: string): boolean {
  const a = parts(latest), b = parts(current)
  for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  return false
}

// Matches the artifact names in electron-builder.yml; a missing asset falls back to the release page.
export function assetSuffix(platform: string, arch: string): string | null {
  if (platform === 'darwin') return `_${arch}.dmg`
  if (platform === 'win32') return '.exe'
  if (platform === 'linux') return '.AppImage'
  return null
}

type Release = { tag_name: string; html_url: string; assets: { name: string; browser_download_url: string }[] }

export async function checkUpdate(current: string, platform: string, arch: string): Promise<Update | null> {
  const res = await fetch(RELEASES, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const rel = (await res.json()) as Release
  if (!isNewer(rel.tag_name, current)) return null
  const suffix = assetSuffix(platform, arch)
  const asset = suffix ? rel.assets.find((a) => a.name.endsWith(suffix)) : undefined
  return { version: rel.tag_name, url: asset?.browser_download_url ?? rel.html_url }
}
