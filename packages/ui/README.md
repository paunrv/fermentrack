# @fermentrack/ui

Shared design system primitives for PROOF/Fermentrack (website + dashboard).

## Setup

1. Add dependency in your app:

```json
"@fermentrack/ui": "*"
```

2. Import styles once in your root layout:

```tsx
import '@fermentrack/ui/styles.css'
```

3. Optional — extend Tailwind in `tailwind.config.js`:

```js
const uiPreset = require('@fermentrack/ui/tailwind')

module.exports = {
  presets: [uiPreset],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
}
```

## Development

```bash
# From repo root
npm run build --workspace=@fermentrack/ui
npm run storybook
```

## Adding a component

1. Add styles to `src/styles/components.css` (`.ui-*` prefix).
2. Create component in `src/components/`.
3. Export from `src/index.ts`.
4. Add a story in `apps/storybook/stories/`.

## Conventions

- Use CSS custom properties from `tokens.css` — no hardcoded colors in components.
- Interactive components that use hooks include `'use client'`.
- Domain-specific PROOF components stay in `apps/web`, not this package.
