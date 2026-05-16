export function MiniBars({
  title,
  data,
}: {
  title: string
  data: Array<{ label: string; value: number; suffix?: string }>
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="r-control border border-border/40 bg-background/40 p-3">
      <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2.5">
            <div className="w-20 truncate text-[11px] text-foreground/75">{d.label}</div>
            <div className="relative h-1.5 flex-1 overflow-hidden r-chip bg-foreground/[0.06]">
              <div
                className="absolute inset-y-0 left-0 r-chip bg-foreground/45"
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
            <div className="w-12 text-right text-[11px] tabular-nums text-foreground/85">
              {d.value.toLocaleString('tr-TR')}
              {d.suffix ?? ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
