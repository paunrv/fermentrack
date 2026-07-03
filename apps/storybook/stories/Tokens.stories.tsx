import type { Meta, StoryObj } from '@storybook/react'
import { Badge, Inline, Stack, Text } from '@fermentrack/ui'

const meta: Meta = {
  title: 'Foundation/Tokens',
  tags: ['autodocs'],
}

export default meta

const swatches: { name: string; var: string }[] = [
  { name: 'ink', var: '--ink' },
  { name: 'canvas', var: '--canvas' },
  { name: 'fg-0', var: '--fg-0' },
  { name: 'fg-3', var: '--fg-3' },
  { name: 'proof-accent', var: '--proof-accent' },
  { name: 'ok', var: '--ok' },
  { name: 'warn', var: '--warn' },
  { name: 'crit', var: '--crit' },
  { name: 'info', var: '--info' },
]

export const ColorTokens: StoryObj = {
  render: () => (
    <Stack gap={4} style={{ maxWidth: 480 }}>
      <Text>CSS variables from `@fermentrack/ui/tokens.css`</Text>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
        {swatches.map(({ name, var: cssVar }) => (
          <div key={name}>
            <div
              style={{
                height: 48,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--hairline)',
                background: `var(${cssVar})`,
              }}
            />
            <Text style={{ fontSize: 12, marginTop: 6 }}>{name}</Text>
          </div>
        ))}
      </div>
      <Inline gap={2} style={{ flexWrap: 'wrap' }}>
        <Badge variant="success">success</Badge>
        <Badge variant="warning">warning</Badge>
        <Badge variant="error">error</Badge>
        <Badge variant="info">info</Badge>
        <Badge>default</Badge>
      </Inline>
    </Stack>
  ),
}
