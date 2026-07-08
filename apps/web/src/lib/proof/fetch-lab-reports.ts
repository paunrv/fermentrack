import type { SupabaseClient } from '@supabase/supabase-js'
import type { LabReport, LabReportWithSamples, LabSampleWithResults } from '@proof/types'
import { sortLabResults } from '@/lib/proof/lab-display'

type LabReportRow = LabReport & {
  lab_samples: Array<
    LabSampleWithResults & {
      lab_results: LabSampleWithResults['lab_results']
    }
  > | null
}

type LabSampleRow = LabSampleWithResults & {
  lab_results: LabSampleWithResults['lab_results'] | null
  lab_reports: LabReport | null
}

function mapReportWithSamples(report: LabReportRow): LabReportWithSamples {
  const samples = (report.lab_samples ?? []).map(sample => ({
    ...sample,
    lab_results: sortLabResults(sample.lab_results ?? []),
  }))

  samples.sort((a, b) => a.sample_code.localeCompare(b.sample_code, 'es'))

  return {
    ...report,
    lab_samples: samples,
  }
}

/** All lab reports for the org, nested samples → results, newest sampled_at first. */
export async function fetchLabReports(
  supabase: SupabaseClient,
  orgId: string
): Promise<LabReportWithSamples[]> {
  const { data, error } = await supabase
    .from('lab_reports')
    .select(
      `
      *,
      lab_samples (
        *,
        lab_results (*)
      )
    `
    )
    .eq('organization_id', orgId)
    .order('sampled_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(row => mapReportWithSamples(row as LabReportRow))
}

export type LotLabSample = LabSampleWithResults & {
  lab_report: LabReport
}

/** Samples linked to a lot, with parent report and sorted results. */
export async function fetchLabSamplesForLot(
  supabase: SupabaseClient,
  lotId: string
): Promise<LotLabSample[]> {
  const { data, error } = await supabase
    .from('lab_samples')
    .select(
      `
      *,
      lab_results (*),
      lab_reports (*)
    `
    )
    .eq('lot_id', lotId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? [])
    .filter((row): row is LabSampleRow & { lab_reports: LabReport } => row.lab_reports != null)
    .map(row => ({
      ...row,
      lab_results: sortLabResults(row.lab_results ?? []),
      lab_report: row.lab_reports,
    }))
}
