import { z } from 'zod'

const ticketLineSchema = z.object({
  supply_kind: z.string().min(1),
  varietal: z.string().optional().default(''),
  product_service_code: z.string().optional().default(''),
  product_service_label: z.string().optional().default(''),
  description: z.string().optional().default(''),
  quantity: z.number().nullable().optional(),
  unit: z.string().optional().default(''),
  unit_price: z.number().nullable().optional(),
  discount: z.number().optional().default(0),
  tax_note: z.string().optional().default(''),
  amount: z.number().nullable().optional(),
})

export const winemakerTicketImportSchema = z.object({
  filename: z.string().min(1).optional().default('mcp-import.json'),
  document_type: z.enum(['invoice', 'ticket', 'xml', 'lab_result', 'photo', 'remision', 'other']).optional().default('invoice'),
  extraction: z.object({
    supplier_name: z.string().optional().default(''),
    supplier_rfc: z.string().optional().default(''),
    supplier_address: z.string().optional().default(''),
    supplier_email: z.string().optional().default(''),
    folio: z.string().optional().default(''),
    document_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    payment_method: z.string().optional().default(''),
    payment_form: z.string().optional().default(''),
    concept_title: z.string().optional().default(''),
    subtotal: z.number().nullable().optional(),
    tax_iva: z.number().optional().default(0),
    tax_iva_rate: z.string().optional().default(''),
    tax_iesps: z.number().optional().default(0),
    tax_isr_ret: z.number().optional().default(0),
    tax_iva_ret: z.number().optional().default(0),
    total: z.number().nullable().optional(),
    currency: z.string().optional().default('MXN'),
    description: z.string().optional().default(''),
    lines: z.array(ticketLineSchema).min(1, 'At least one line is required'),
  }),
})

export type WinemakerTicketImportInput = z.infer<typeof winemakerTicketImportSchema>
