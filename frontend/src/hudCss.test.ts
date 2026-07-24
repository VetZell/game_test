import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./room-fixes.css', import.meta.url), 'utf8')

function blockFrom(startMarker: string, endMarker: string) {
  const start = css.indexOf(startMarker)
  const end = css.indexOf(endMarker, start + startMarker.length)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return css.slice(start, end)
}

const mobileCss = css.slice(css.indexOf('TASK-021: final mobile HUD override'))
const narrowCss = css.slice(css.indexOf('@media(max-width:430px){.hud-panel.compact-hud'))

describe('mobile HUD CSS', () => {
  it('keeps the HUD as a single no-scroll row on mobile breakpoints', () => {
    expect(mobileCss).toContain('.hud-panel.compact-hud{display:flex')
    expect(mobileCss).toContain('flex-wrap:nowrap')
    expect(mobileCss).toContain('grid-template-columns:repeat(5,minmax(0,1fr))')
    expect(mobileCss).toContain('overflow:visible')
    expect(mobileCss).not.toContain('scroll-snap-type')
    const mobileStatsRule = mobileCss.match(/\.compact-stats-row\{[^}]+\}/)?.[0] || ''
    expect(mobileStatsRule).not.toContain('overflow-x: auto')
    expect(mobileStatsRule).not.toContain('mask-image: linear-gradient')
    expect(narrowCss).toContain('.compact-time-card{flex-basis:88px')
    expect(narrowCss).toContain('.compact-stats-row{gap:2px}')
    expect(narrowCss).toContain('min-width:40px;min-height:40px')
    expect(narrowCss).toContain('.compact-mini-stat>div:first-child{font-size:9px')
    expect(narrowCss).toContain('.compact-mini-stat strong{font-size:10.5px')
  })
})
