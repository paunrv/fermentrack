import type { Meta, StoryObj } from '@storybook/react'
import { Caption, Code, Heading, Link, Text } from '@fermentrack/ui'

const meta: Meta = {
  title: 'Typography',
  tags: ['autodocs'],
}

export default meta

export const All: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
      <Heading as="h1">Heading 1</Heading>
      <Heading as="h2">Heading 2</Heading>
      <Heading as="h3">Heading 3</Heading>
      <Text>Body text for paragraphs and descriptions across the app.</Text>
      <Caption>Caption or helper text</Caption>
      <Code>npm run storybook</Code>
      <Link href="#">Learn more</Link>
    </div>
  ),
}
