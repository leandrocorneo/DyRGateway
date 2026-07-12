"use client";

import { useMemo } from "react";
import { Activity, CircleGauge, Database, HardDrive, Timer, TriangleAlert } from "lucide-react";
import { ChartPanel, KpiCard, MetricChart } from "@/app/components/monitoring";
import { addTimeGaps, asSnapshot, formatBytes, formatCompactNumber, formatLatency, formatNumber, formatPercent } from "@/lib/monitoring";
import type { DatabaseMonitoringResponse, InfrastructureSeriesPoint, MonitoringRange } from "@/lib/types";

export default function DatabaseMonitoringTab({ metrics, range }: { metrics: DatabaseMonitoringResponse; range: MonitoringRange }) {
  const current = asSnapshot(metrics.current);
  const queries = metrics.summary.queries;
  const slowQueries = current?.slowQueries || [];
  const chartData = useMemo(() => addTimeGaps(metrics.series, metrics.meta.stepSeconds).map((item) => {
    const point = item as Partial<InfrastructureSeriesPoint> & { timestamp: string };
    const value = point.components?.database;
    return {
      timestamp: point.timestamp,
      qps: value?.queriesPerSecond ?? null,
      tps: value?.transactionsPerSecond ?? null,
      connections: value?.connectionsUsed ?? null,
      connectionsMax: value?.connectionsMax ?? null,
      cacheHit: value?.cacheHitRate === null || value?.cacheHitRate === undefined ? null : value.cacheHitRate * 100,
      size: value?.databaseSizeBytes ?? null,
      readTime: value?.blockReadTimeMs ?? null,
      writeTime: value?.blockWriteTimeMs ?? null,
      probeLatency: value?.latencyMs ?? null,
    };
  }), [metrics]);

  return <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Queries por segundo" value={formatNumber(current?.queriesPerSecond, 2)} detail={`${formatNumber(current?.transactionsPerSecond, 2)} transacoes/s`} icon={<Activity size={18} />} status={current?.status} />
      <KpiCard label="Latencia p95" value={formatLatency(queries.latency.p95Ms)} detail={`p50 ${formatLatency(queries.latency.p50Ms)} | p99 ${formatLatency(queries.latency.p99Ms)}`} icon={<Timer size={18} />} accent="sky" />
      <KpiCard label="Conexoes utilizadas" value={`${formatNumber(current?.connectionsUsed, 0)} / ${formatNumber(current?.connectionsMax, 0)}`} detail={formatPercent(current?.connectionPercent)} icon={<CircleGauge size={18} />} />
      <KpiCard label="Queries lentas" value={formatNumber(slowQueries.length, 0)} detail={`${formatCompactNumber(queries.slow)} eventos instrumentados`} icon={<TriangleAlert size={18} />} accent={slowQueries.length ? "amber" : "neutral"} />
      <KpiCard label="Tamanho logico" value={formatBytes(current?.databaseSizeBytes)} detail={`${formatNumber(current?.deadlocks, 0)} deadlocks acumulados`} icon={<HardDrive size={18} />} accent="neutral" />
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="Atividade do banco" subtitle="Queries e transacoes observadas por segundo" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "qps", label: "Queries/s", color: "var(--chart-blue)", kind: "area" }, { key: "tps", label: "Transacoes/s", color: "var(--chart-sky)" }]} valueFormatter={(value) => formatNumber(value, 2)} axisFormatter={(value) => formatNumber(value, 1)} />
      </ChartPanel>
      <ChartPanel title="Pool de conexoes" subtitle="Conexoes utilizadas e limite do PostgreSQL" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "connections", label: "Utilizadas", color: "var(--chart-blue)", kind: "area" }, { key: "connectionsMax", label: "Maximo", color: "var(--chart-ink)" }]} valueFormatter={(value) => formatNumber(value, 0)} axisFormatter={(value) => formatNumber(value, 0)} />
      </ChartPanel>
      <ChartPanel title="Cache e probe" subtitle="Cache hit rate e latencia da verificacao do banco" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "cacheHit", label: "Cache hit %", color: "var(--chart-blue)", kind: "area" }, { key: "probeLatency", label: "Probe ms", color: "var(--chart-ink)" }]} valueFormatter={(value, key) => key === "cacheHit" ? formatPercent(value) : formatLatency(value)} axisFormatter={(value) => formatNumber(value, 1)} />
      </ChartPanel>
      <ChartPanel title="Tempos acumulados de I/O" subtitle="Leitura e escrita reportadas pelo PostgreSQL" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "readTime", label: "Leitura", color: "var(--chart-blue)", kind: "area" }, { key: "writeTime", label: "Escrita", color: "var(--chart-sky)" }]} valueFormatter={(value) => formatLatency(value)} axisFormatter={(value) => `${formatNumber(value, 0)} ms`} />
      </ChartPanel>
    </section>

    <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="panel-title">Queries lentas no PostgreSQL</h2><p className="panel-subtitle">Fingerprints fornecidos por pg_stat_statements na ultima amostra</p></div><span className="metric-status status-unknown"><span />Replica lag: {metrics.meta.capabilities.replicaLag === "unsupported" ? "Nao suportado" : metrics.meta.capabilities.replicaLag}</span></div><div className="data-table-wrap"><table className="data-table analytics-table min-w-[760px]"><thead><tr><th>Query ID</th><th>Chamadas</th><th>Media</th><th>Maxima</th><th>Tempo total</th></tr></thead><tbody>{slowQueries.length ? slowQueries.map((item) => <tr key={item.queryId}><td className="mono font-semibold text-[var(--foreground)]">{item.queryId}</td><td>{String(item.calls)}</td><td>{formatLatency(item.meanMs)}</td><td>{formatLatency(item.maxMs)}</td><td>{formatLatency(item.totalMs)}</td></tr>) : <tr><td colSpan={5} className="py-8 text-center text-[var(--muted)]">Nenhuma query lenta na ultima amostra.</td></tr>}</tbody></table></div></section>

    <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="panel-title">Operacoes instrumentadas</h2><p className="panel-subtitle">Latencia observada pela aplicacao, agregada no periodo</p></div><Database size={17} className="text-[var(--accent)]" /></div><div className="data-table-wrap"><table className="data-table analytics-table min-w-[760px]"><thead><tr><th>Operacao</th><th>Chamadas</th><th>Erros</th><th>Lentas</th><th>p50</th><th>p95</th><th>p99</th></tr></thead><tbody>{metrics.breakdown.map((item) => <tr key={item.operation}><td className="mono font-semibold text-[var(--foreground)]">{item.operation}</td><td>{formatCompactNumber(item.calls)}</td><td>{formatCompactNumber(item.errors)}</td><td>{formatCompactNumber(item.slow)}</td><td>{formatLatency(item.latency.p50Ms)}</td><td>{formatLatency(item.latency.p95Ms)}</td><td>{formatLatency(item.latency.p99Ms)}</td></tr>)}</tbody></table></div></section>
  </>;
}