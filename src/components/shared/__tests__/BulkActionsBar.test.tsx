import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BulkActionsBar } from '@/components/shared/BulkActionsBar'

describe('BulkActionsBar', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(
      <BulkActionsBar count={0} onClear={() => {}} actions={[]} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows count badge and clear button when count > 0', () => {
    render(
      <BulkActionsBar count={3} onClear={() => {}} actions={[]} />,
    )
    expect(screen.getByTestId('bulk-count').textContent).toBe('3')
    expect(screen.getByTestId('bulk-clear')).toBeTruthy()
  })

  it('invokes onClear when clear button clicked', () => {
    const onClear = vi.fn()
    render(<BulkActionsBar count={2} onClear={onClear} actions={[]} />)
    fireEvent.click(screen.getByTestId('bulk-clear'))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('renders one button per action and fires onClick', () => {
    const onA = vi.fn()
    const onB = vi.fn()
    render(
      <BulkActionsBar
        count={1}
        onClear={() => {}}
        actions={[
          { id: 'a', label: 'A', onClick: onA },
          { id: 'b', label: 'B', tone: 'destructive', onClick: onB },
        ]}
      />,
    )
    fireEvent.click(screen.getByTestId('bulk-action-a'))
    fireEvent.click(screen.getByTestId('bulk-action-b'))
    expect(onA).toHaveBeenCalledOnce()
    expect(onB).toHaveBeenCalledOnce()
  })

  it('applies destructive styling to destructive actions', () => {
    render(
      <BulkActionsBar
        count={1}
        onClear={() => {}}
        actions={[{ id: 'kill', label: 'Sil', tone: 'destructive', onClick: () => {} }]}
      />,
    )
    const btn = screen.getByTestId('bulk-action-kill')
    expect(btn.className).toContain('text-rose-600')
  })
})
