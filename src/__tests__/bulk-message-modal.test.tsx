import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Customer } from '@landx/data'
import {
  BulkMessageModal,
  BULK_MESSAGES_STORAGE_KEY,
  BULK_MESSAGE_TEMPLATES,
  renderBulkMessageTemplate,
} from '@/components/customers/BulkMessageModal'

/**
 * Wave F18.B — BulkMessageModal unit tests.
 *
 * Covers preview substitution, localStorage history push, and the toast/
 * close hand-off. No TanStack mutation in this modal — pure local state +
 * storage write.
 */

const SAMPLE: Customer[] = [
  {
    id: 'M-101',
    name: 'Mehmet Çatlı',
    segment: 'Sıcak',
    stage: 'Teklif',
    lastContact: new Date().toISOString(),
    value: 8_000_000,
    source: 'Referans',
    owner: 'Ahmet',
    interestArea: 'Çeşme',
  },
  {
    id: 'M-102',
    name: 'Selin Yurt',
    segment: 'Ilık',
    stage: 'Görüşme',
    lastContact: new Date().toISOString(),
    value: 4_500_000,
    source: 'Sahibinden',
    owner: 'Ayşe',
    interestArea: 'Foça',
  },
]

describe('renderBulkMessageTemplate', () => {
  it('substitutes {name} placeholders', () => {
    expect(renderBulkMessageTemplate('Selam {name}!', 'Ali')).toBe('Selam Ali!')
  })
  it('handles bodies without placeholders', () => {
    expect(renderBulkMessageTemplate('Sabit metin', 'Ali')).toBe('Sabit metin')
  })
})

describe('BulkMessageModal', () => {
  it('renders nothing when closed', () => {
    render(<BulkMessageModal open={false} customers={SAMPLE} onClose={vi.fn()} />)
    expect(screen.queryByTestId('bulk-message-modal')).toBeNull()
  })

  it('shows preview substituted with first selected customer name', () => {
    render(<BulkMessageModal open customers={SAMPLE} onClose={vi.fn()} />)
    const preview = screen.getByTestId('bulk-message-preview')
    const expected = renderBulkMessageTemplate(BULK_MESSAGE_TEMPLATES[0]!.body, 'Mehmet Çatlı')
    expect(preview.textContent).toBe(expected)
  })

  it('updates preview when template changes', () => {
    render(<BulkMessageModal open customers={SAMPLE} onClose={vi.fn()} />)
    const select = screen.getByTestId('bulk-message-template') as HTMLSelectElement
    const second = BULK_MESSAGE_TEMPLATES[1]!
    fireEvent.change(select, { target: { value: second.id } })
    const preview = screen.getByTestId('bulk-message-preview')
    expect(preview.textContent).toBe(renderBulkMessageTemplate(second.body, 'Mehmet Çatlı'))
  })

  it('persists a history record to localStorage on send', async () => {
    const onClose = vi.fn()
    const onSent = vi.fn()
    render(
      <BulkMessageModal open customers={SAMPLE} onClose={onClose} onSent={onSent} />,
    )
    fireEvent.click(screen.getByTestId('bulk-message-confirm'))
    await waitFor(() => expect(onSent).toHaveBeenCalled(), { timeout: 3000 })
    expect(onClose).toHaveBeenCalled()
    const raw = window.localStorage.getItem(BULK_MESSAGES_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const history = JSON.parse(raw!) as Array<{ customerIds: string[]; templateId: string }>
    expect(history).toHaveLength(1)
    expect(history[0]!.customerIds).toEqual(['M-101', 'M-102'])
    expect(history[0]!.templateId).toBe(BULK_MESSAGE_TEMPLATES[0]!.id)
  })

  it('calls onClose without sending when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<BulkMessageModal open customers={SAMPLE} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('bulk-message-cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(BULK_MESSAGES_STORAGE_KEY)).toBeNull()
  })
})
