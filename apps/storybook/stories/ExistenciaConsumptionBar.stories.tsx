import type { Meta, StoryObj } from '@storybook/react'
import { ExistenciaConsumptionBar } from '../../web/src/components/proof/ExistenciaConsumptionBar'

const meta: Meta<typeof ExistenciaConsumptionBar> = {
  title: 'Winemaker/ExistenciaConsumptionBar',
  component: ExistenciaConsumptionBar,
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof ExistenciaConsumptionBar>

export const HealthyStock: Story = {
  args: {
    producidas: 480,
    consumidas: 384,
    disponibles: 96,
    progressLabel: 'Botella N° 384 de 480 · quedan 96',
    unitsLabel: '96 botellas · 8 cajas de 12',
    lowStock: false,
  },
}

export const BrokenCases: Story = {
  args: {
    producidas: 100,
    consumidas: 43,
    disponibles: 57,
    progressLabel: 'Botella N° 43 de 100 · quedan 57',
    unitsLabel: '4 cajas + 9 sueltas',
    lowStock: false,
  },
}

export const LowStock: Story = {
  args: {
    producidas: 480,
    consumidas: 444,
    disponibles: 36,
    progressLabel: 'Botella N° 444 de 480 · quedan 36',
    unitsLabel: '36 botellas · 3 cajas de 12',
    lowStock: true,
    lowStockLabel: 'Stock bajo',
  },
}

export const Depleted: Story = {
  args: {
    producidas: 120,
    consumidas: 120,
    disponibles: 0,
    progressLabel: 'Botella N° 120 de 120 · quedan 0',
    unitsLabel: '0 botellas',
    lowStock: true,
    lowStockLabel: 'Stock bajo',
  },
}
