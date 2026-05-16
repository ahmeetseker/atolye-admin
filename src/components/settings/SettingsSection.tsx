/**
 * SettingsSection — reusable collapsible section for /settings.
 *
 * Wave F10.C. Mirrors the visual language of the rest of the admin shell
 * (`rounded-2xl border border-border bg-card`). Uses a controlled
 * `aria-expanded` chevron header rather than the native `<details>/<summary>`
 * so the chevron rotation animates and styling tokens line up with the rest
 * of the dashboard.
 */
import { useState, type ReactNode } from 'react'
import { ChevronDown } from '@landx/icons'
import { cn } from '@landx/ui'

export interface SettingsSectionProps {
  /** data-testid hook for E2E. Becomes `data-settings-section={id}` on the
   *  root element + `data-settings-toggle={id}` on the toggle button. */
  id: string
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function SettingsSection({
  id,
  title,
  description,
  defaultOpen = false,
  children,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = `settings-section-${id}-body`

  return (
    <section
      className="rounded-2xl border border-border bg-card"
      data-settings-section={id}
      data-open={open ? 'true' : 'false'}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        data-settings-toggle={id}
        className="flex w-full items-start justify-between gap-4 rounded-2xl px-5 py-4 text-left transition hover:bg-foreground/[0.02]"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-lg tracking-tight text-foreground">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>
      {open ? (
        <div
          id={bodyId}
          data-settings-body={id}
          className="border-t border-border px-5 py-5"
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}

export default SettingsSection
