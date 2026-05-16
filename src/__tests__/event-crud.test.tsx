import { describe, it, expect, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useCreateEvent,
  useDeleteEvent,
  useEvents,
  calendarKeys,
  type CalendarEvent,
} from '@landx/data'
import { EventDetailDrawer } from '@/components/event-edit/EventDetailDrawer'
import { DeleteEventDialog } from '@/components/event-edit/DeleteEventDialog'
import { NewEventModal } from '@/components/event-edit/NewEventModal'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc, children })
  return { qc, wrapper }
}

const sample: CalendarEvent = {
  id: 'E-9201',
  type: 'visit',
  title: 'Cunda · Mehmet Yılmaz ziyaret',
  date: '2026-05-15T11:00:00.000Z',
  time: '14:00',
  durationMin: 90,
  owner: 'Ahmet',
  location: 'Cunda · denize 80m parsel',
  dealId: 'D-2391',
  customerName: 'Mehmet Yılmaz',
  notes: 'Sahaya 14:00 buluş.',
}

describe('EventDetailDrawer', () => {
  it('renders prefilled event data when open', () => {
    render(
      <EventDetailDrawer
        open
        event={sample}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByTestId('event-detail-drawer')).toBeInTheDocument()
    expect(screen.getByText('Cunda · Mehmet Yılmaz ziyaret')).toBeInTheDocument()
    expect(screen.getByText('E-9201')).toBeInTheDocument()
    expect(screen.getByText('Yer gösterimi')).toBeInTheDocument()
    expect(screen.getByText('Mehmet Yılmaz')).toBeInTheDocument()
    expect(screen.getByText('Sahaya 14:00 buluş.')).toBeInTheDocument()
  })

  it('emits onEdit when "Düzenle" is clicked', () => {
    const onEdit = vi.fn()
    render(
      <EventDetailDrawer
        open
        event={sample}
        onClose={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('event-detail-edit'))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(sample)
  })
})

describe('DeleteEventDialog', () => {
  it('renders the confirmation message with the event title', () => {
    render(
      <DeleteEventDialog
        open
        id="E-9201"
        eventTitle="Cunda ziyareti"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByTestId('event-delete-dialog')).toBeInTheDocument()
    expect(screen.getByText(/silinsin mi/i)).toBeInTheDocument()
    expect(screen.getByText(/geri alınamaz/i)).toBeInTheDocument()
    expect(screen.getByText(/Cunda ziyareti/)).toBeInTheDocument()
  })

  it('calls onConfirm when "Sil" is clicked', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <DeleteEventDialog
        open
        id="E-9201"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByTestId('event-delete-confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('calls onCancel when ESC is pressed', () => {
    const onCancel = vi.fn()
    render(
      <DeleteEventDialog
        open
        id="E-9201"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('NewEventModal', () => {
  it('disables submit until the title is filled', () => {
    const onSubmit = vi.fn()
    render(
      <NewEventModal
        open
        defaultDate={new Date('2026-05-15T10:00:00.000Z')}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )
    const submit = screen.getByTestId('event-new-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('event-new-field-title'), {
      target: { value: 'Yeni saha gezisi' },
    })
    expect(submit.disabled).toBe(false)
  })
})

describe('useCreateEvent (optimistic create)', () => {
  it('prepends a temp event to the cache immediately, then settles', async () => {
    const { qc, wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useEvents(), { wrapper })
    await waitFor(() => expect(listResult.current.data).toBeDefined())
    const seed = listResult.current.data!.length

    const { result: mutationResult } = renderHook(() => useCreateEvent(), { wrapper })

    act(() => {
      mutationResult.current.mutate({
        type: 'task',
        title: 'Test etkinlik',
        date: new Date().toISOString(),
        time: '10:00',
      })
    })

    await waitFor(() => {
      const cached = qc.getQueryData<CalendarEvent[]>(calendarKeys.events())
      expect(cached?.[0]?.id.startsWith('TEMP.')).toBe(true)
    })

    const optimistic = qc.getQueryData<CalendarEvent[]>(calendarKeys.events())
    expect(optimistic).toBeDefined()
    expect(optimistic!.length).toBe(seed + 1)
    expect(optimistic![0].title).toBe('Test etkinlik')

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true), {
      timeout: 1500,
    })
  })
})

describe('useDeleteEvent (optimistic remove)', () => {
  it('drops the event from cache immediately', async () => {
    const { qc, wrapper } = makeWrapper()

    const { result: listResult } = renderHook(() => useEvents(), { wrapper })
    await waitFor(() => expect(listResult.current.data).toBeDefined())
    const initial = listResult.current.data!
    const targetId = initial[0]!.id

    const { result: mutationResult } = renderHook(() => useDeleteEvent(), { wrapper })

    act(() => {
      mutationResult.current.mutate(targetId)
    })

    await waitFor(() => {
      const cached = qc.getQueryData<CalendarEvent[]>(calendarKeys.events())
      expect(cached?.some((e) => e.id === targetId)).toBe(false)
    })

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true), {
      timeout: 1500,
    })
  })
})
