import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InlineEditCell } from '@/components/shared/InlineEditCell'

function renderCell(opts: {
  initial?: string
  onSave?: (next: string) => Promise<unknown> | void
  onClose?: () => void
  onError?: (err: unknown) => void
}) {
  const onSave = opts.onSave ?? vi.fn()
  const onClose = opts.onClose ?? vi.fn()
  const onError = opts.onError ?? vi.fn()
  const result = render(
    <InlineEditCell<string>
      value={opts.initial ?? 'apple'}
      display={(v) => <span data-testid="display">{v}</span>}
      editor={(v, onChange, onCommit, onCancel) => (
        <input
          data-testid="editor"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommit()
            if (e.key === 'Escape') onCancel()
          }}
        />
      )}
      onSave={onSave}
      onClose={onClose}
      onError={onError}
    />,
  )
  return { ...result, onSave, onClose, onError }
}

describe('InlineEditCell', () => {
  it('renders the editor with the initial value', () => {
    renderCell({ initial: 'apple' })
    const input = screen.getByTestId('editor') as HTMLInputElement
    expect(input.value).toBe('apple')
  })

  it('Enter commits the draft via onSave and calls onClose', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    renderCell({ initial: 'apple', onSave, onClose })

    const input = screen.getByTestId('editor')
    fireEvent.change(input, { target: { value: 'banana' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('banana')
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  it('Escape discards the draft and calls onClose without onSave', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    renderCell({ initial: 'apple', onSave, onClose })

    const input = screen.getByTestId('editor')
    fireEvent.change(input, { target: { value: 'banana' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onSave when the draft equals the original (no-op commit closes)', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    renderCell({ initial: 'apple', onSave, onClose })

    const input = screen.getByTestId('editor')
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(onSave).not.toHaveBeenCalled()
  })

  it('surfaces save rejection via onError and keeps editor open', async () => {
    const err = new Error('boom')
    const onSave = vi.fn().mockRejectedValue(err)
    const onClose = vi.fn()
    const onError = vi.fn()
    renderCell({ initial: 'apple', onSave, onClose, onError })

    const input = screen.getByTestId('editor')
    fireEvent.change(input, { target: { value: 'banana' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(err)
    })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('editor')).toBeTruthy()
  })

  it('shows pending affordance while save is in-flight', async () => {
    let resolveFn: ((value?: unknown) => void) = () => {}
    const onSave = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve
        }),
    )
    renderCell({ initial: 'apple', onSave })

    const input = screen.getByTestId('editor')
    fireEvent.change(input, { target: { value: 'banana' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(
        screen.getByTestId('inline-edit-cell').getAttribute('data-pending'),
      ).toBe('true')
    })

    resolveFn()
  })
})
