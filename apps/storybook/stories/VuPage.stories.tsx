import type { Meta, StoryObj } from '@storybook/react'
import {
  ContentCard,
  CopyField,
  PageFrame,
  PageHeader,
  SetupAccordion,
} from '@fermentrack/ui'

const meta: Meta = {
  title: 'VuPage',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

export const ConnectPattern: StoryObj = {
  name: 'Connect pattern (VU)',
  render: () => (
    <PageFrame narrow>
      <PageHeader
        title="Connect your AI assistant"
        description="Connect ChatGPT, Claude, Cursor, or Grok to PROOF. Your assistant can query lots, inventory, and orders."
      />
      <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-3)' }}>
        The assistant only gets access to your own account and organization.
      </p>
      <ContentCard>
        <CopyField
          label="Your account's connection URL"
          value="http://localhost:3000/api/mcp"
          copyLabel="Copy"
          copiedLabel="Copied"
        />
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600 }}>Set up your assistant</h2>
          <SetupAccordion title="ChatGPT" defaultOpen>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Open Settings → Apps → Advanced settings → Developer mode.</li>
              <li>Create an app and paste the connection URL.</li>
              <li>Sign in with your PROOF account if prompted.</li>
            </ol>
          </SetupAccordion>
          <SetupAccordion title="Claude">
            <p style={{ margin: 0 }}>Use Claude Desktop with the local MCP token from Advanced options.</p>
          </SetupAccordion>
          <SetupAccordion title="Cursor">
            <p style={{ margin: 0 }}>Add the MCP URL in Cursor Settings → MCP.</p>
          </SetupAccordion>
          <SetupAccordion title="Grok">
            <p style={{ margin: 0 }}>Add a custom connector with the HTTPS production URL.</p>
          </SetupAccordion>
        </div>
      </ContentCard>
    </PageFrame>
  ),
}

export const OpsPageSkeleton: StoryObj = {
  name: 'Ops page skeleton',
  render: () => (
    <PageFrame>
      <PageHeader
        title="Inventario"
        description="Stock por SKU y alertas de quiebre."
      />
      <ContentCard>
        <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 14 }}>
          Primary work surface — replace with table / KPIs.
        </p>
      </ContentCard>
    </PageFrame>
  ),
}

export const CopyFieldAlone: StoryObj = {
  render: () => (
    <div style={{ padding: 24, maxWidth: 480, background: 'var(--page-bg)' }}>
      <CopyField label="MCP URL" value="https://app.proof.example/api/mcp" />
    </div>
  ),
}
