"use client";

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-brand-text-muted">
        <span className="font-medium">Passo {current} de {total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-brand-sand/60">
        <div
          className="h-full rounded-full bg-brand-forest transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
