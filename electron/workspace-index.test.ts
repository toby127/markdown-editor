import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildWorkspaceIndex } from './workspace-index'

let root: string

beforeAll(async () => {
  root = await fs.mkdtemp(join(tmpdir(), 'md-editor-index-'))
  await fs.mkdir(join(root, 'sub'), { recursive: true })
  await fs.mkdir(join(root, 'node_modules'), { recursive: true })
  await fs.writeFile(
    join(root, 'a.md'),
    [
      '---',
      'title: Alpha',
      'tags: [go, backend]',
      '---',
      '',
      '# Heading One',
      'See [[b]] and [[b|friend]]',
      '',
      'plain body text'
    ].join('\n')
  )
  await fs.writeFile(join(root, 'sub', 'b.md'), '## Other\n\n[[#? no]]\n')
  await fs.writeFile(join(root, 'node_modules', 'ignored.md'), '[[ignored]]')
})

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('buildWorkspaceIndex', () => {
  it('collects metadata, headings, wiki links and raw content', async () => {
    const result = await buildWorkspaceIndex(root)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.root).toBe(root)
    expect(result.files.map((f) => f.name)).toEqual(['a.md', 'b.md'])

    const a = result.files[0]
    expect(a.title).toBe('Alpha')
    expect(a.tags).toEqual(['go', 'backend'])
    expect(a.headings).toEqual(['Heading One'])
    expect(a.links).toEqual(['b'])
    expect(a.content).toContain('plain body text')

    expect(result.files[1].headings).toEqual(['Other'])
  })

  it('returns a well-formed result for a missing root', async () => {
    const result = await buildWorkspaceIndex(join(root, 'missing'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.files).toEqual([])
  })
})
