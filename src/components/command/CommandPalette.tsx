import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { CommandPaletteBase, type PaletteItem as BasePaletteItem } from '@landx/ui/command'
import {
  filteredSections,
  pushRecent,
  readRecent,
  type PaletteItem,
} from '@/lib/command-palette'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  const sections = useMemo(() => filteredSections(query), [query])

  // Reset query + hydrate recent each time the palette opens. Base owns
  // activeIndex + autofocus.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setRecent(readRecent())
  }, [open])

  function activate(item: BasePaletteItem) {
    pushRecent(query)
    onClose()
    // The app's lib pushes objects matching the wider `PaletteItem` shape;
    // the base only sees the narrowed subset, so we cast back to access
    // optional `action`/`to`. Both are still optional at this layer.
    const full = item as PaletteItem
    if (full.action) {
      full.action()
      return
    }
    if (full.to) navigate(full.to)
  }

  return (
    <CommandPaletteBase
      open={open}
      onClose={onClose}
      query={query}
      onQueryChange={setQuery}
      sections={sections}
      recent={recent}
      onActivate={activate}
      ariaLabel="Komut paleti"
      placeholder="Komut, sayfa veya kayıt ara…"
      brand="arsam"
    />
  )
}
