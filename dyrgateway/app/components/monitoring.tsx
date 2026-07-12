"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, Clock3, LoaderCircle } from "lucide-react";
import { formatChartTime, monitoringRanges, statusLabel, statusTone } from "@/lib/monitoring";
import type { MetricStatus, MonitoringRange } from "@/lib/types";

export type MonitoringTab = { value: string; label: string; icon?: ReactNode };

export function RangeSelector({ value, onChange }: { value: MonitoringRange; onChange: (value: MonitoringRange) => void }) {
  return (
    <div className="range-control" aria-label="Periodo das metricas">
      {monitoringRanges.map((item) => (
        <button key={item.value} type="button" className={value === item.value ? "is-active" : ""} aria-pressed={value === item.value} onClick={() => onChange(item.value)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function MonitoringTabs({ tabs, value, onChange }: { tabs: MonitoringTab[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="monitoring-tabs" role="tablist" aria-label="Areas de monitoramento">
      {tabs.map((tab) => (
        <button key={tab.value} type="button" role="tab" aria-selected={value === tab.value} className={value === tab.value ? "is-active" : ""} onClick={() => onChange(tab.value)}>
          {tab.icon}{tab.label}
        </button>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: MetricStatus | null | undefined }) {
  return <span className={`metric-status ${statusTone(status)}`}><span />{statusLabel(status)}</span>;
}

export function KpiCard({ label, value, detail, icon, status, accent = "blue" }: { label: string; value: ReactNode; detail?: ReactNode; icon: ReactNode; status?: MetricStatus; accent?: "blue" | "sky" | "neutral" | "amber" | "red" }) {
  return (
    <article className="metric-kpi panel">
      <div className={`metric-kpi-icon tone-${accent}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3"><p className="metric-kpi-label">{label}</p>{status ? <StatusBadge status={status} /> : null}</div>
        <div className="metric-kpi-value">{value}</div>
        {detail ? <div className="metric-kpi-detail">{detail}</div> : null}
      </div>
    </article>
  );
}

export type ChartSeries = {
  key: string;
  label: string;
  color: string;
  kind?: "line" | "area" | "bar";
  stackId?: string;
};

type ChartDatum = Record<string, string | number | null | undefined>;

export function MetricChart({
  data,
  series,
  range,
  valueFormatter,
  axisFormatter,
  height = 280,
}: {
  data: ChartDatum[];
  series: ChartSeries[];
  range: MonitoringRange;
  valueFormatter: (value: number | null, key?: string) => string;
  axisFormatter?: (value: number) => string;
  height?: number;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const visibleSeries = useMemo(() => series.filter((item) => !hidden.includes(item.key)), [hidden, series]);
  const toggle = (key: string) => setHidden((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  return (
    <div className="metric-chart">
      <div className="chart-legend" aria-label="Series do grafico">
        {series.map((item) => (
          <button key={item.key} type="button" aria-pressed={!hidden.includes(item.key)} className={hidden.includes(item.key) ? "is-hidden" : ""} onClick={() => toggle(item.key)}>
            <span style={{ backgroundColor: item.color }} />{item.label}
          </button>
        ))}
      </div>
      <div style={{ height }} className="chart-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 10, bottom: 2, left: 0 }} accessibilityLayer>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={(value) => formatChartTime(String(value), range)} minTickGap={28} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis width={52} tickFormatter={axisFormatter} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }} content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return <div className="chart-tooltip"><p>{formatChartTime(String(label), range)}</p>{payload.map((item) => <div key={String(item.dataKey)}><span><i style={{ backgroundColor: item.color }} />{item.name}</span><strong>{valueFormatter(typeof item.value === "number" ? item.value : null, String(item.dataKey))}</strong></div>)}</div>;
            }} />
            {visibleSeries.map((item) => {
              if (item.kind === "bar") return <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} stackId={item.stackId} maxBarSize={22} radius={item.stackId ? 0 : [3, 3, 0, 0]} isAnimationActive={false} />;
              if (item.kind === "area") return <Area key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} fill={item.color} fillOpacity={0.12} strokeWidth={2} connectNulls={false} isAnimationActive={false} />;
              return <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />;
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ChartPanel({ title, subtitle, loading, error, empty, actions, children }: { title: string; subtitle: string; loading?: boolean; error?: string; empty?: boolean; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header"><div><h2 className="panel-title">{title}</h2><p className="panel-subtitle">{subtitle}</p></div>{actions}</div>
      {loading ? <ChartState icon={<LoaderCircle className="animate-spin" size={22} />} text="Carregando serie historica..." /> : error ? <ChartState icon={<AlertCircle size={22} />} text={error} danger /> : empty ? <ChartState icon={<Clock3 size={22} />} text="Nao existem amostras neste periodo." /> : <div className="chart-panel-body">{children}</div>}
    </section>
  );
}

function ChartState({ icon, text, danger = false }: { icon: ReactNode; text: string; danger?: boolean }) {
  return <div className={`chart-state ${danger ? "text-[var(--danger)]" : ""}`}>{icon}<span>{text}</span></div>;
}

export function DataFreshness({ updatedAt, refreshing, partial }: { updatedAt: string | null; refreshing?: boolean; partial?: boolean }) {
  return <div className="data-freshness"><span className={`freshness-dot ${refreshing ? "is-refreshing" : ""}`} />{refreshing ? "Atualizando" : updatedAt ? `Atualizado ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(updatedAt))}` : "Aguardando leitura"}{partial ? <span className="partial-mark">Periodo sem amostras</span> : null}</div>;
}