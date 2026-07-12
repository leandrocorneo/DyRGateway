"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowUpDown, Gauge, Timer, TriangleAlert, UsersRound } from "lucide-react";
import { ChartPanel, KpiCard, MetricChart } from "@/app/components/monitoring";
import { addTimeGaps, formatCompactNumber, formatLatency, formatNumber, formatPercent } from "@/lib/monitoring";
import type { ApiEndpointMetric, ApiMetricPoint, ApiMonitoringResponse, MonitoringRange } from "@/lib/types";

type SortKey = "requestCount" | "errorRate" | "p95" | "status5xx";

export default function ApiMonitoringTab({ metrics, endpoints, range }: { metrics: ApiMonitoringResponse; endpoints: ApiMonitoringResponse; range: MonitoringRange }) {
  const summary = metrics.summary;
  const chartData = useMemo(() => addTimeGaps(metrics.series, metrics.meta.stepSeconds).map((item) => {
    const point = item as Partial<ApiMetricPoint> & { timestamp: string };
    return {
      timestamp: point.timestamp,
      rps: point.rps ?? null,
      concurrent: point.concurrentMax ?? null,
      status2xx: point.status2xx ?? null,
      status4xx: point.status4xx ?? null,
      status5xx: point.status5xx ?? null,
      p50: point.latency?.p50Ms ?? null,
      p95: point.latency?.p95Ms ?? null,
      p99: point.latency?.p99Ms ?? null,
    };
  }), [metrics]);

  return <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Requisicoes" value={formatCompactNumber(summary.requestCount)} detail={`${formatNumber(summary.averageRps, 2)} req/s em media`} icon={<Gauge size={18} />} />
      <KpiCard label="Latencia p95" value={formatLatency(summary.latency.p95Ms)} detail={`p50 ${formatLatency(summary.latency.p50Ms)} | p99 ${formatLatency(summary.latency.p99Ms)}`} icon={<Timer size={18} />} accent="sky" />
      <KpiCard label="Taxa de erro" value={formatPercent(summary.errorRate, true)} detail={`${formatCompactNumber(summary.status5xx)} respostas 5xx`} icon={<TriangleAlert size={18} />} accent={summary.status5xx ? "red" : "neutral"} />
      <KpiCard label="Timeouts" value={formatCompactNumber(summary.timeoutCount)} detail={`${formatCompactNumber(summary.errorCount)} erros registrados`} icon={<Activity size={18} />} accent={summary.timeoutCount ? "amber" : "neutral"} />
      <KpiCard label="Concorrencia maxima" value={formatNumber(summary.concurrentMax, 0)} detail={`TTFB p95 ${formatLatency(summary.ttfb.p95Ms)}`} icon={<UsersRound size={18} />} />
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <ChartPanel title="Carga da API" subtitle="Requisicoes por segundo e simultaneidade maxima" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "rps", label: "Req/s", color: "var(--chart-blue)", kind: "area" }, { key: "concurrent", label: "Simultaneas", color: "var(--chart-ink)" }]} valueFormatter={(value, key) => key === "rps" ? `${formatNumber(value, 2)} req/s` : formatNumber(value, 0)} axisFormatter={(value) => formatNumber(value, 1)} />
      </ChartPanel>
      <ChartPanel title="Status HTTP" subtitle="Respostas agrupadas por familia" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "status2xx", label: "2xx", color: "var(--chart-blue)", kind: "bar", stackId: "http" }, { key: "status4xx", label: "4xx", color: "var(--chart-amber)", kind: "bar", stackId: "http" }, { key: "status5xx", label: "5xx", color: "var(--chart-red)", kind: "bar", stackId: "http" }]} valueFormatter={(value) => formatNumber(value, 0)} axisFormatter={(value) => formatCompactNumber(value)} />
      </ChartPanel>
    </section>

    <ChartPanel title="Percentis de latencia" subtitle="p50, p95 e p99 derivados dos histogramas agregados" empty={!chartData.length}>
      <MetricChart data={chartData} range={range} height={250} series={[{ key: "p50", label: "p50", color: "var(--chart-sky)" }, { key: "p95", label: "p95", color: "var(--chart-blue)" }, { key: "p99", label: "p99", color: "var(--chart-ink)" }]} valueFormatter={(value) => formatLatency(value)} axisFormatter={(value) => `${formatNumber(value, 0)} ms`} />
    </ChartPanel>

    <EndpointTable rows={endpoints.breakdown} />
  </>;
}

function EndpointTable({ rows }: { rows: ApiEndpointMetric[] }) {
  const [sort, setSort] = useState<SortKey>("requestCount");
  const sorted = useMemo(() => [...rows].sort((left, right) => valueFor(right, sort) - valueFor(left, sort)), [rows, sort]);
  const header = (label: string, key: SortKey) => <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--foreground)]" onClick={() => setSort(key)}>{label}<ArrowUpDown size={11} /></button>;

  return <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="panel-title">Endpoints</h2><p className="panel-subtitle">Operacoes parametrizadas com maior volume no periodo</p></div><span className="text-[10px] font-semibold text-[var(--muted)]">{rows.length} rotas</span></div><div className="data-table-wrap"><table className="data-table analytics-table min-w-[980px]"><thead><tr><th>Endpoint</th><th>{header("Requests", "requestCount")}</th><th>2xx</th><th>4xx</th><th>{header("5xx", "status5xx")}</th><th>{header("Erro", "errorRate")}</th><th>p50</th><th>{header("p95", "p95")}</th><th>p99</th><th>Timeouts</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.endpoint}><td className="mono font-semibold text-[var(--foreground)]">{item.endpoint}</td><td>{formatCompactNumber(item.requestCount)}</td><td>{formatCompactNumber(item.status2xx)}</td><td>{formatCompactNumber(item.status4xx)}</td><td className={item.status5xx ? "text-[var(--danger)]" : ""}>{formatCompactNumber(item.status5xx)}</td><td>{formatPercent(item.errorRate, true)}</td><td>{formatLatency(item.latency.p50Ms)}</td><td>{formatLatency(item.latency.p95Ms)}</td><td>{formatLatency(item.latency.p99Ms)}</td><td>{formatCompactNumber(item.timeoutCount)}</td></tr>)}</tbody></table></div></section>;
}

function valueFor(item: ApiEndpointMetric, key: SortKey) {
  if (key === "p95") return item.latency.p95Ms ?? -1;
  return item[key];
}