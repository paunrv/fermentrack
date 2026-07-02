/** Dashboard connection hub — replacement for hosted Anthropic routes (#29). */
export const HOSTED_AI_MIGRATION_HREF = '/dashboard'

export function deprecatedHostedAiResponse(extra?: Record<string, unknown>) {
  return Response.json(
    {
      error: 'hosted_ai_removed',
      message:
        'Hosted AI was removed. Connect an external MCP agent at /dashboard or use manual forms in the app.',
      migration: HOSTED_AI_MIGRATION_HREF,
      ...extra,
    },
    { status: 410 }
  )
}
