import type { Meta, StoryObj } from '@storybook/react'
import { Button, IconButton } from '@fermentrack/ui'

const meta: Meta<typeof Button> = {
  title: 'Actions/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { children: 'Guardar cambios', variant: 'primary' },
}

export const Secondary: Story = {
  args: { children: 'Cancelar', variant: 'secondary' },
}

export const Loading: Story = {
  args: { children: 'Enviando…', loading: true },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
}

export const Icon: Story = {
  render: () => (
    <IconButton aria-label="Settings" variant="ghost">
      ⚙
    </IconButton>
  ),
}
