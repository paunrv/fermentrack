import { LANDING } from './landing-theme'
import {
  landingEyebrowDotStyle,
  landingEyebrowStyle,
  landingEyebrowTextStyle,
} from './landing-page-styles'

export function LandingEyebrow({ children }: { children: string }) {
  return (
    <div style={landingEyebrowStyle}>
      <span style={landingEyebrowTextStyle}>{children}</span>
      <span aria-hidden style={landingEyebrowDotStyle} />
    </div>
  )
}
