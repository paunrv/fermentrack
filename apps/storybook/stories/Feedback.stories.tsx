import type { Meta, StoryObj } from '@storybook/react'
import { Alert, Badge, Skeleton, Spinner } from '@fermentrack/ui'

const meta: Meta = {
  title: 'Feedback',
  tags: ['autodocs'],
}

export default meta

export const Badges: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Badge>Default</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
}

export const Alerts: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
      <Alert variant="info" title="Información">
        Tu catálogo se sincronizó correctamente.
      </Alert>
      <Alert variant="warning" title="Atención">
        Hay 3 SKUs por debajo del mínimo.
      </Alert>
      <Alert variant="error" title="Error">
        No pudimos guardar los cambios.
      </Alert>
    </div>
  ),
}

export const Loading: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" />
      <Skeleton width={120} height={20} />
      <Skeleton width={200} height={36} />
    </div>
  ),
}
