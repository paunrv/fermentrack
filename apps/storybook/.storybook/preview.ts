import type { Preview } from '@storybook/react'
import '../../../packages/ui/src/styles/tokens.css'
import '../../../packages/ui/src/styles/components.css'

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    layout: 'padded',
  },
}

export default preview
