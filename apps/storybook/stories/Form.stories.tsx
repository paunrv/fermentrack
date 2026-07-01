import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  Checkbox,
  FormField,
  Input,
  RadioGroup,
  Select,
  Switch,
  Textarea,
} from '@fermentrack/ui'

const meta: Meta = {
  title: 'Forms/Fields',
  tags: ['autodocs'],
}

export default meta

export const InputField: StoryObj = {
  render: () => (
    <FormField label="Nombre" htmlFor="name" hint="Como aparece en facturas">
      <Input id="name" placeholder="Bodega del Valle" />
    </FormField>
  ),
}

export const InputError: StoryObj = {
  render: () => (
    <FormField label="Email" htmlFor="email" error="Email inválido">
      <Input id="email" type="email" error defaultValue="not-an-email" />
    </FormField>
  ),
}

export const TextareaField: StoryObj = {
  render: () => (
    <FormField label="Notas" htmlFor="notes">
      <Textarea id="notes" rows={4} placeholder="Detalles adicionales…" />
    </FormField>
  ),
}

export const SelectField: StoryObj = {
  render: () => (
    <FormField label="Tipo" htmlFor="type">
      <Select id="type" defaultValue="winemaker">
        <option value="winemaker">Winemaker</option>
        <option value="distiller">Distiller</option>
        <option value="distributor">Distribuidor</option>
      </Select>
    </FormField>
  ),
}

export const CheckboxField: StoryObj = {
  render: () => <Checkbox id="terms" label="Acepto términos y condiciones" />,
}

export const RadioField: StoryObj = {
  render: () => {
    const [value, setValue] = useState('mxn')
    return (
      <RadioGroup
        name="currency"
        value={value}
        onChange={setValue}
        options={[
          { value: 'mxn', label: 'MXN' },
          { value: 'usd', label: 'USD' },
        ]}
      />
    )
  },
}

export const SwitchField: StoryObj = {
  render: () => {
    const [on, setOn] = useState(true)
    return <Switch checked={on} onCheckedChange={setOn} aria-label="Notificaciones" />
  },
}
