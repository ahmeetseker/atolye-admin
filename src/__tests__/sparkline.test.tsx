import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Sparkline } from '@landx/ui'

describe('Sparkline', () => {
  it('renders nothing when data is empty', () => {
    const { container } = render(<Sparkline data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders an SVG for a non-empty series', () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('renders polyline elements for the trend line', () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />)
    const polylines = container.querySelectorAll('polyline')
    expect(polylines.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the trailing dot as a circle element', () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />)
    const circle = container.querySelector('circle')
    expect(circle).not.toBeNull()
  })

  it('applies the provided className to the svg', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} className="my-spark" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toBe('my-spark')
  })

  it('respects width/height props on the rendered svg', () => {
    const { container } = render(
      <Sparkline data={[1, 2, 3]} width={120} height={40} />,
    )
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('120')
    expect(svg?.getAttribute('height')).toBe('40')
  })
})
