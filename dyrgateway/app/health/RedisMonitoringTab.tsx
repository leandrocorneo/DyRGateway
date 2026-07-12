"use client";

import { useMemo } from "react";
import { Activity, Database, Gauge, KeyRound, Timer, UsersRound } from "lucide-react";
import { ChartPanel, KpiCard, MetricChart } from "@/app/components/monitoring";
import { addTimeGaps, asSnapshot, formatBytes, formatCompactNumber, formatLatency, formatNumber, formatPercent } from "@/lib/monitoring";
import type { InfrastructureSeriesPoint, MonitoringRange, RedisMonitoringResponse } from "@/lib/types";

export default function RedisMonitoringTab({ metrics, range }: { metrics: RedisMonitoringResponse; range: MonitoringRange }) {
  const current = asSnapshot(metrics.current);
  const commands = metrics.summary.commands;
  const chartData = useMemo(() => addTimeGaps(metrics.series, metrics.meta.stepSeconds).map((item) => {
    const point = item as Partial<InfrastructureSeriesPoint> & { timestamp: string };
    const value = point.components?.redis;
    return {
      timestamp: point.timestamp,
      memoryUsed: value?.memoryUsedBytes ?? null,
      memoryLimit: value?.memoryLimitBytes ?? null,
      hitRate: value?.hitRate === null || value?.hitRate === undefined ? null : value.hitRate * 100,
      operations: value?.operationsPerSecond ?? null,
      commands: value?.commandsPerSecond ?? null,
      clients: value?.connectedClients ?? null,
      blocked: value?.blockedClients ?? null,
      evictions: value?.evictionsPerSecond ?? null,
      latency: value?.latencyMs ?? null,
    };
  }), [metrics]);

  return <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Memoria utilizada" value={formatBytes(current?.memoryUsedBytes)} detail={`${formatPercent(current?.memoryPercent)} de ${formatBytes(current?.memoryLimitBytes)}`} icon={<Database size={18} />} status={current?.status} />
      <KpiCard label="Hit rate" value={formatPercent(current?.hitRate, true)} detail={`${formatCompactNumber(current?.hits)} hits | ${formatCompactNumber(current?.misses)} misses`} icon={<KeyRound size={18} />} accent="sky" />
      <KpiCard label="Operacoes por segundo" value={formatNumber(current?.operationsPerSecond, 1)} detail={`${formatNumber(current?.commandsPerSecond, 1)} comandos/s por delta`} icon={<Gauge size={18} />} />
      <KpiCard label="Clientes conectados" value={formatNumber(current?.connectedClients, 0)} detail={`${formatNumber(current?.blockedClients, 0)} bloqueados`} icon={<UsersRound size={18} />} accent="neutral" />
      <KpiCard label="Latencia p95" value={formatLatency(commands.latency.p95Ms)} detail={`${formatCompactNumber(commands.slow)} comandos lentos`} icon={<Timer size={18} />} accent={commands.errors ? "amber" : "neutral"} />
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="Memoria do Redis" subtitle="Uso observado e limite maxmemory configurado" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "memoryUsed", label: "Utilizada", color: "var(--chart-blue)", kind: "area" }, { key: "memoryLimit", label: "Limite", color: "var(--chart-ink)" }]} valueFormatter={(value) => formatBytes(value)} axisFormatter={(value) => formatBytes(value)} />
      </ChartPanel>
      <ChartPanel title="Operacao e clientes" subtitle="Comandos processados e conexoes ativas" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "operations", label: "Ops/s", color: "var(--chart-blue)", kind: "area" }, { key: "commands", label: "Comandos/s", color: "var(--chart-sky)" }, { key: "clients", label: "Clientes", color: "var(--chart-ink)" }]} valueFormatter={(value) => formatNumber(value, 1)} axisFormatter={(value) => formatNumber(value, 0)} />
      </ChartPanel>
      <ChartPanel title="Efetividade do cache" subtitle="Hit rate observado a cada amostra" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "hitRate", label: "Hit rate", color: "var(--chart-blue)", kind: "area" }]} valueFormatter={(value) => formatPercent(value)} axisFormatter={(value) => `${formatNumber(value, 0)}%`} />
      </ChartPanel>
      <ChartPanel title="Evictions e latencia" subtitle="Chaves removidas por segundo e tempo do probe" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={[{ key: "evictions", label: "Evictions/s", color: "var(--chart-amber)", kind: "bar" }, { key: "latency", label: "Probe ms", color: "var(--chart-blue)" }]} valueFormatter={(value, key) => key === "latency" ? formatLatency(value) : formatNumber(value, 2)} axisFormatter={(value) => formatNumber(value, 1)} />
      </ChartPanel>
    </section>

    <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="panel-title">Comandos instrumentados</h2><p className="panel-subtitle">Resumo agregado das operacoes executadas pela aplicacao</p></div><Activity size={17} className="text-[var(--accent)]" /></div><div className="data-table-wrap"><table className="data-table analytics-table min-w-[760px]"><thead><tr><th>Operacao</th><th>Chamadas</th><th>Erros</th><th>Lentas</th><th>p50</th><th>p95</th><th>p99</th></tr></thead><tbody>{metrics.breakdown.map((item) => <tr key={item.operation}><td className="mono font-semibold text-[var(--foreground)]">{item.operation}</td><td>{formatCompactNumber(item.calls)}</td><td>{formatCompactNumber(item.errors)}</td><td>{formatCompactNumber(item.slow)}</td><td>{formatLatency(item.latency.p50Ms)}</td><td>{formatLatency(item.latency.p95Ms)}</td><td>{formatLatency(item.latency.p99Ms)}</td></tr>)}</tbody></table></div></section>
  </>;
}