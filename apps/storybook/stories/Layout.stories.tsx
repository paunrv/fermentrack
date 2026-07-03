import type { Meta, StoryObj } from '@storybook/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Container,
  EmptyState,
  Inline,
  PageHeader,
  PageShell,
  Section,
  Separator,
  Stack,
  Button,
} from '@fermentrack/ui'

const meta: Meta = {
  title: 'Layout',
  tags: ['autodocs'],
}

export default meta

export const CardExample: StoryObj = {
  render: () => (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>Inventario</CardTitle>
        <CardDescription>Resumen de stock por almacén</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0 }}>128 SKUs activos · 4 alertas</p>
        <Separator style={{ marginBlock: 12 }} />
        <p style={{ margin: 0, color: 'var(--fg-3)', fontSize: 13 }}>Última sync hace 2 h</p>
      </CardContent>
      <CardFooter>
        <Button variant="secondary">Ver detalle</Button>
      </CardFooter>
    </Card>
  ),
}

export const SeparatorExample: StoryObj = {
  render: () => (
    <Stack gap={4} style={{ maxWidth: 320 }}>
      <p style={{ margin: 0 }}>Sección A</p>
      <Separator />
      <p style={{ margin: 0 }}>Sección B</p>
      <Separator orientation="vertical" style={{ height: 48, alignSelf: 'flex-start' }} />
    </Stack>
  ),
}

export const PageHeaderExample: StoryObj = {
  render: () => (
    <PageHeader
      title="Pedidos"
      description="Gestiona pedidos de clientes y entregas"
      actions={<Button>Nuevo pedido</Button>}
    />
  ),
}

export const EmptyStateExample: StoryObj = {
  render: () => (
    <EmptyState
      icon={<span style={{ fontSize: 32 }}>📦</span>}
      title="Sin pedidos todavía"
      description="Crea tu primer pedido para empezar a registrar entregas."
      action={<Button>Crear pedido</Button>}
    />
  ),
}

export const SectionExample: StoryObj = {
  render: () => (
    <Section title="Datos fiscales">
      <Stack gap={3}>
        <p style={{ margin: 0 }}>RFC · Razón social · Uso CFDI</p>
      </Stack>
    </Section>
  ),
}

export const PageShellExample: StoryObj = {
  render: () => (
    <PageShell>
      <Container size="lg" style={{ paddingBlock: 32 }}>
        <Stack gap={6}>
          <PageHeader title="Dashboard" description="Vista general" />
          <Inline gap={3}>
            <Card style={{ flex: 1 }}>
              <CardContent>Widget A</CardContent>
            </Card>
            <Card style={{ flex: 1 }}>
              <CardContent>Widget B</CardContent>
            </Card>
          </Inline>
        </Stack>
      </Container>
    </PageShell>
  ),
}
