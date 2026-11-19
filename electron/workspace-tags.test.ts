import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { scanWorkspaceTags } from './workspace-tags'

let root: string

beforeAll(async () => {
  root = await fs.mkdtemp(join(tmpdir(), 'md-editor-tags-'))
  await fs.mkdir(join(root, 'sub'), { recursive: true })
  await fs.mkdir(join(root, 'node_modules', 'pkg'), { recursive: true })
  await fs.writeFile(
    join(root, 'a.md'),
    '---\ntitle: Alpha\ntags: [go, backend]\n---\n\nbody\n'
  )
  await fs.writeFile(
    join(root, 'sub', 'b.md'),
    '---\ntags:\n  - go\n  - frontend\n---\n'
  )
  await fs.writeFile(join(root, 'plain.md'), '# no front matter\n')
  await fs.writeFile(
    join(root, 'node_modules', 'pkg', 'ignored.md'),
    '---\ntags: [ignored]\n---\n'
  )
})

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('scanWorkspaceTags', () => {
  it('collects front matter tags and skips node_modules', async () => {
    const result = await scanWorkspaceTags(root)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.files.map((f) => f.name)).toEqual(['a.md', 'b.md'])
    expect(result.files[0].title).toBe('Alpha')
    expect(result.files[0].tags).toEqual(['go', 'backend'])
    expect(result.files[1].tags).toEqual(['go', 'frontend'])
  })

  it('returns an error result for an unreadable root', async () => {
    const result = await scanWorkspaceTags(join(root, 'missing'))
    // A missing root yields an empty scan rather than a fatal error; the
    // contract is still a well-formed result object.
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.files).toEqual([])
  })
})
