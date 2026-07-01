import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Button,
  Dialog,
  DropdownMenu,
  Popover,
  Sheet,
  Text,
  Tooltip,
  ToastProvider,
  useToast,
} from '@fermentrack/ui'

const meta: Meta = {
  title: 'Overlay',
  tags: ['autodocs'],
}

export default meta

export const DialogExample: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Abrir diálogo</Button>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Confirmar eliminación"
          description="Esta acción no se puede deshacer."
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => setOpen(false)}>
                Eliminar
              </Button>
            </>
          }
        />
      </>
    )
  },
}

export const SheetExample: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Abrir panel</Button>
        <Sheet open={open} onOpenChange={setOpen} title="Filtros">
          <Text>Filtra por almacén, estado o productor.</Text>
        </Sheet>
      </>
    )
  },
}

export const DropdownExample: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <DropdownMenu
        open={open}
        onOpenChange={setOpen}
        trigger={<Button variant="secondary">Acciones</Button>}
        items={[
          { label: 'Editar', onSelect: () => undefined },
          { label: 'Duplicar', onSelect: () => undefined },
          { label: 'Eliminar', onSelect: () => undefined },
        ]}
      />
    )
  },
}

export const TooltipExample: StoryObj = {
  render: () => (
    <Tooltip content="Stock disponible en bodega">
      <Button variant="ghost">Hover me</Button>
    </Tooltip>
  ),
}

export const PopoverExample: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <Popover open={open} onOpenChange={setOpen} trigger={<Button variant="secondary">Info</Button>}>
        <Text>Detalle del SKU · 240 unidades · último movimiento hace 2 días</Text>
      </Popover>
    )
  },
}

function ToastDemo() {
  const { toast } = useToast()
  return <Button onClick={() => toast('Cambios guardados')}>Mostrar toast</Button>
}

export const ToastExample: StoryObj = {
  render: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  ),
}
