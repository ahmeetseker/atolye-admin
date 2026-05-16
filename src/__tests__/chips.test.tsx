import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusChip, SegmentChip, TypeChip, StageChip } from '@landx/ui'

describe('StatusChip', () => {
  it('renders Aktif label with emerald dot tone', () => {
    const { container } = render(<StatusChip status="Aktif" />)
    expect(screen.getByText('Aktif')).toBeInTheDocument()
    const dot = container.querySelector('span > span')
    expect(dot).not.toBeNull()
    expect(dot?.className).toMatch(/emerald/)
  })

  it('renders Pasif label with stone tone', () => {
    const { container } = render(<StatusChip status="Pasif" />)
    expect(screen.getByText('Pasif')).toBeInTheDocument()
    expect(container.firstChild).not.toBeNull()
    expect((container.firstChild as HTMLElement).className).toMatch(/stone/)
  })

  it('renders Taslak label with amber tone', () => {
    const { container } = render(<StatusChip status="Taslak" />)
    expect(screen.getByText('Taslak')).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).className).toMatch(/amber/)
  })
})

describe('SegmentChip', () => {
  it('renders Sıcak label with rose tone', () => {
    const { container } = render(<SegmentChip segment="Sıcak" />)
    expect(screen.getByText('Sıcak')).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).className).toMatch(/rose/)
  })

  it('renders Soğuk label with sky tone', () => {
    const { container } = render(<SegmentChip segment="Soğuk" />)
    expect(screen.getByText('Soğuk')).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).className).toMatch(/sky/)
  })
})

describe('TypeChip', () => {
  it('renders Zeytinlik label', () => {
    render(<TypeChip type="Zeytinlik" />)
    expect(screen.getByText('Zeytinlik')).toBeInTheDocument()
  })

  it('renders Villa Arsası label', () => {
    render(<TypeChip type="Villa Arsası" />)
    expect(screen.getByText('Villa Arsası')).toBeInTheDocument()
  })
})

describe('StageChip', () => {
  it('renders the stage name plus position', () => {
    render(<StageChip stage="Görüşme" />)
    expect(screen.getByText('Görüşme')).toBeInTheDocument()
    expect(screen.getByText('2/5')).toBeInTheDocument()
  })
})
