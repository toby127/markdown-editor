/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest'
import { createLowlight, common } from 'lowlight'
import { createMarkdownExtensions } from './md-extensions'

describe('code highlighting setup', () => {
  it('lowlight common set highlights a js snippet into hljs tokens', () => {
    const lowlight = createLowlight(common)
    expect(lowlight.registered('javascript')).toBe(true)
    const result = lowlight.highlight('javascript', 'const x = 1')
    const html = JSON.stringify(result)
    expect(html).toContain('hljs-keyword')
  })

  it('shared extension list builds without error', () => {
    // Verifies module wiring (lowlight + CodeBlockLowlight) loads cleanly.
    // The node set itself is exercised end-to-end by markdown.fixtures.test.ts.
    expect(createMarkdownExtensions().length).toBeGreaterThan(5)
  })
})
