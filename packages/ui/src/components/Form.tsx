'use client'

import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label className={cn('ui-label', className)} {...props}>
      {children}
    </label>
  )
}

export interface FormFieldProps {
  label?: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}

export function FormField({ label, htmlFor, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('ui-field', className)}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {hint && !error ? <p className="ui-hint">{hint}</p> : null}
      {error ? <p className="ui-error" role="alert">{error}</p> : null}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={cn('ui-input', error && 'ui-input--error', className)}
      {...props}
    />
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn('ui-textarea', error && 'ui-textarea--error', className)}
      {...props}
    />
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <select className={cn('ui-select', error && 'ui-select--error', className)} {...props}>
      {children}
    </select>
  )
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  return (
    <label className={cn('ui-check-row', className)} htmlFor={id}>
      <input type="checkbox" id={id} {...props} />
      <span>{label}</span>
    </label>
  )
}

export interface RadioGroupProps {
  name: string
  value?: string
  onChange?: (value: string) => void
  options: Array<{ value: string; label: ReactNode; disabled?: boolean }>
  className?: string
}

export function RadioGroup({ name, value, onChange, options, className }: RadioGroupProps) {
  return (
    <div className={cn('ui-stack', 'ui-gap-2', className)} role="radiogroup">
      {options.map(option => {
        const id = `${name}-${option.value}`
        return (
          <label key={option.value} className="ui-radio-row" htmlFor={id}>
            <input
              type="radio"
              id={id}
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange?.(option.value)}
            />
            <span>{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  'aria-label': string
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onCheckedChange, disabled, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn('ui-switch', className)}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span className="ui-switch-thumb" />
    </button>
  )
}
