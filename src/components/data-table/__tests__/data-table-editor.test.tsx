import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable, type Column } from '@/components/data-table/data-table'

interface Row {
  id: string
  name: string
  status: string
}

const ROWS: Row[] = [
  { id: 'r1', name: 'Alpha', status: 'Aktif' },
  { id: 'r2', name: 'Beta', status: 'Pasif' },
]

function buildColumns(opts: {
  onClose?: () => void
  spyEditorCalls?: () => void
}): Column<Row>[] {
  return [
    {
      key: 'name',
      header: 'Name',
      cell: (r) => <span data-testid={`name-${r.id}`}>{r.name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <span data-testid={`status-${r.id}`}>{r.status}</span>,
      editor: (r, ctx) => {
        opts.spyEditorCalls?.()
        return (
          <input
            data-testid={`status-editor-${r.id}`}
            defaultValue={r.status}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                opts.onClose?.()
                ctx.onClose()
              }
            }}
          />
        )
      },
    },
  ]
}

describe('DataTable — inline editor', () => {
  it('cells without editor render normally with no editable affordance', () => {
    render(
      <DataTable
        rows={ROWS}
        columns={buildColumns({})}
        rowKey={(r) => r.id}
        selectable={false}
      />,
    )
    // Name cell has no editable test-id.
    expect(screen.queryByTestId('editable-cell-r1-name')).toBeNull()
    // Status cell has the editable test-id but starts in display mode.
    expect(screen.getByTestId('editable-cell-r1-status')).toBeTruthy()
    expect(screen.getByTestId('status-r1')).toBeTruthy()
    expect(screen.queryByTestId('status-editor-r1')).toBeNull()
  })

  it('clicking an editable cell swaps display for editor and suppresses row click', () => {
    const onRowClick = vi.fn()
    render(
      <DataTable
        rows={ROWS}
        columns={buildColumns({})}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
        selectable={false}
      />,
    )

    fireEvent.click(screen.getByTestId('editable-cell-r1-status'))

    expect(screen.getByTestId('status-editor-r1')).toBeTruthy()
    expect(screen.queryByTestId('status-r1')).toBeNull()
    // Row click handler must NOT have fired (event.stopPropagation contract).
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('only one cell is in edit mode at a time', () => {
    render(
      <DataTable
        rows={ROWS}
        columns={buildColumns({})}
        rowKey={(r) => r.id}
        selectable={false}
      />,
    )

    fireEvent.click(screen.getByTestId('editable-cell-r1-status'))
    expect(screen.getByTestId('status-editor-r1')).toBeTruthy()

    fireEvent.click(screen.getByTestId('editable-cell-r2-status'))
    // r1 should have returned to display mode.
    expect(screen.queryByTestId('status-editor-r1')).toBeNull()
    expect(screen.getByTestId('status-r1')).toBeTruthy()
    expect(screen.getByTestId('status-editor-r2')).toBeTruthy()
  })

  it('editor ctx.onClose returns the cell to display mode', () => {
    render(
      <DataTable
        rows={ROWS}
        columns={buildColumns({})}
        rowKey={(r) => r.id}
        selectable={false}
      />,
    )

    fireEvent.click(screen.getByTestId('editable-cell-r1-status'))
    const input = screen.getByTestId('status-editor-r1')
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByTestId('status-editor-r1')).toBeNull()
    expect(screen.getByTestId('status-r1')).toBeTruthy()
  })
})
