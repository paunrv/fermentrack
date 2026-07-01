import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Avatar,
  Breadcrumb,
  Button,
  Chip,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
  Tabs,
  Topbar,
} from '@fermentrack/ui'

const meta: Meta = {
  title: 'Dashboard',
  tags: ['autodocs'],
}

export default meta

export const SidebarExample: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', height: 320, border: '1px solid var(--hairline)' }}>
      <Sidebar>
        <SidebarHeader>
          <strong>PROOF</strong>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup label="Operación">
            <SidebarItem active>Inventario</SidebarItem>
            <SidebarItem>Pedidos</SidebarItem>
            <SidebarItem>Crédito</SidebarItem>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarItem>Ajustes</SidebarItem>
        </SidebarFooter>
      </Sidebar>
      <div style={{ flex: 1, padding: 24 }}>Content area</div>
    </div>
  ),
}

export const TopbarExample: StoryObj = {
  render: () => (
    <Topbar>
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '#' },
          { label: 'Pedidos', href: '#' },
          { label: 'PED-1042' },
        ]}
      />
      <Avatar fallback="PR" size="sm" />
    </Topbar>
  ),
}

export const TableExample: StoryObj = {
  render: () => (
    <TableWrap>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cabernet 2023</TableCell>
            <TableCell>240</TableCell>
            <TableCell>Sano</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>IPA Lager</TableCell>
            <TableCell>18</TableCell>
            <TableCell>Bajo</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableWrap>
  ),
}

export const TabsExample: StoryObj = {
  render: () => {
    const [tab, setTab] = useState('activos')
    return (
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'activos', label: 'Activos', content: <p>Lista de pedidos activos</p> },
          { value: 'entregados', label: 'Entregados', content: <p>Historial de entregas</p> },
        ]}
      />
    )
  },
}

export const ChipExample: StoryObj = {
  render: () => <Chip onRemove={() => undefined}>Ensenada</Chip>,
}

export const AvatarExample: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar fallback="Pa" size="sm" />
      <Avatar fallback="Proof" size="md" />
      <Avatar fallback="User" size="lg" />
    </div>
  ),
}

export const ShellPreview: StoryObj = {
  render: () => (
    <div style={{ border: '1px solid var(--hairline)', borderRadius: 8, overflow: 'hidden' }}>
      <Topbar>
        <strong>PROOF</strong>
        <Button size="sm">Nuevo</Button>
      </Topbar>
      <div style={{ display: 'flex', minHeight: 200 }}>
        <Sidebar style={{ width: 200 }}>
          <SidebarContent>
            <SidebarItem active>Inicio</SidebarItem>
            <SidebarItem>Productos</SidebarItem>
          </SidebarContent>
        </Sidebar>
        <div style={{ flex: 1, padding: 16 }}>Main content</div>
      </div>
    </div>
  ),
}
