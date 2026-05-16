# Atölye Admin

`arsam.net/panel/*` — emlak ofisi paneli.

## Komutlar

```bash
pnpm --filter @landx/atolye-admin run dev          # :5173
pnpm --filter @landx/atolye-admin run build
pnpm --filter @landx/atolye-admin run test         # vitest 52/52
pnpm --filter @landx/atolye-admin run test:e2e     # playwright (Chrome gerek)
pnpm --filter @landx/atolye-admin run lint
```

## Mimari

- **Vite 8** + **React 19** + **RR7 library mode** + **Tailwind v4**
- **Base path:** prod `/panel/`, dev `/`
- **13 lazy route:** home, listings, listings/new, customers, sales, finance, reports, calendar, messages, search, profile, settings, help, notifications
- **Data:** [`@landx/data`](../../packages/data/) TanStack Query hooks
- **MSW:** opt-in `VITE_USE_MSW=1` (mock fetch handlers — [docs/dev/msw.md](../../docs/dev/msw.md))

## Cmd-K asistanı

`Atölye asistanı` — intent classification + 7 action blocks. Detay: [`src/lib/assistant/`](src/lib/assistant/).

## ? shortcuts overlay

17 keyboard shortcut, 4 kategori. Detay: [`src/lib/shortcuts.ts`](src/lib/shortcuts.ts).

## Detaylı kurallar

[`CLAUDE.md`](CLAUDE.md) — design rules, banned patterns, INP performance constraints.
