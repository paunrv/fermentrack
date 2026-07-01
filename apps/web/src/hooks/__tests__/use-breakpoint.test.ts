import { describe, expect, it } from 'vitest'
import { resolveShellBreakpoint } from '@/lib/ui/breakpoints'

describe('resolveShellBreakpoint', () => {
  it('classifies mobile, tablet, and desktop widths', () => {
    expect(resolveShellBreakpoint(375)).toBe('mobile')
    expect(resolveShellBreakpoint(767)).toBe('mobile')
    expect(resolveShellBreakpoint(768)).toBe('tablet')
    expect(resolveShellBreakpoint(1023)).toBe('tablet')
    expect(resolveShellBreakpoint(1024)).toBe('desktop')
    expect(resolveShellBreakpoint(1280)).toBe('desktop')
  })
})
