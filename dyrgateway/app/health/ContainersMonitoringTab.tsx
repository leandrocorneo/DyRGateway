"use client";

import { useMemo } from "react";
import { Box, Cpu, HardDrive, MemoryStick, Network, RotateCcw } from "lucide-react";
import { ChartPanel, KpiCard, MetricChart, StatusBadge, type ChartSeries } from "@/app/components/monitoring";
import { Select } from "@/app/components/ui";
import { addTimeGaps, componentLabel, formatBytes, formatDuration, formatNumber, formatPercent } from "@/lib/monitoring";
import type { InfrastructureMonitoringResponse, InfrastructureSeriesPoint, MonitoringRange } from "@/lib/types";

type ContainerFilter = "all" | "api" | "database" | "redis";
const colors = ["var(--chart-blue)", "var(--chart-sky)", "var(--chart-ink)"];

export default function ContainersMonitoringTab({ metrics, range, filter, onFilterChange }: { metrics: InfrastructureMonitoringResponse; range: MonitoringRange; filter: ContainerFilter; onFilterChange: (value: ContainerFilter) => void }) {
  const components = metrics.breakdown.filter((item) => item.component.startsWith("container:"));
  const keys = components.map((item) => item.component);
  const selectedKey = filter === "all" ? null : `container:${filter}`;

  const chartData = useMemo(() => addTimeGaps(metrics.series, metrics.meta.stepSeconds).map((item) => {
    const point = item as Partial<InfrastructureSeriesPoint> & { timestamp: string };
    const row: Record<string, string | number | null> = { timestamp: point.timestamp };
    keys.forEach((key) => {
      const value = point.components?.[key];
      row[`${key}:cpu`] = value?.cpuPercent ?? null;
      row[`${key}:memory`] = value?.memoryPercent ?? null;
      row[`${key}:rx`] = value?.networkRxBytes ?? null;
      row[`${key}:tx`] = value?.networkTxBytes ?? null;
      row[`${key}:network`] = value?.networkRxBytes === undefined || value.networkTxBytes === undefined ? null : value.networkRxBytes + value.networkTxBytes;
      row[`${key}:read`] = value?.blockReadBytes ?? null;
      row[`${key}:write`] = value?.blockWriteBytes ?? null;
      row[`${key}:layer`] = value?.writableLayerBytes ?? null;
    });
    return row;
  }), [keys, metrics]);

  const cpuSeries = createSeries(keys, "cpu");
  const memorySeries = createSeries(keys, "memory");
  const networkSeries: ChartSeries[] = selectedKey
    ? [{ key: `${selectedKey}:rx`, label: "RX acumulado", color: "var(--chart-blue)", kind: "area" }, { key: `${selectedKey}:tx`, label: "TX acumulado", color: "var(--chart-sky)" }]
    : createSeries(keys, "network", "Rede total");
  const networkTotal = components.length === 1 && components[0].networkRxBytes !== undefined && components[0].networkTxBytes !== undefined ? components[0].networkRxBytes + components[0].networkTxBytes : null;
  const storageSeries: ChartSeries[] = selectedKey
    ? [{ key: `${selectedKey}:read`, label: "Block read", color: "var(--chart-blue)", kind: "area" }, { key: `${selectedKey}:write`, label: "Block write", color: "var(--chart-sky)" }, { key: `${selectedKey}:layer`, label: "Camada gravavel", color: "var(--chart-ink)" }]
    : createSeries(keys, "layer", "Camada gravavel");

  return <>
    <div className="analytics-toolbar">
      <div><p className="text-xs font-semibold">Escopo dos containers</p><p className="mt-1 text-[10px] text-[var(--muted)]">A consulta usa apenas componentes etiquetados no Docker.</p></div>
      <Select className="w-full sm:w-[220px]" value={filter} onChange={(event) => onFilterChange(event.target.value as ContainerFilter)} aria-label="Selecionar container"><option value="all">Todos os containers</option><option value="api">API</option><option value="database">PostgreSQL</option><option value="redis">Redis</option></Select>
    </div>

    <section className="grid gap-4 lg:grid-cols-3">
      {components.map((item) => <article key={item.component} className="panel p-5"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]"><Box size={18} /></span><StatusBadge status={item.status} /></div><h2 className="mt-4 text-sm font-semibold">{componentLabel(item.component)}</h2><p className="mt-1 mono text-[var(--muted)]">{item.name || item.containerId || item.component}</p><div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-4"><ContainerValue label="CPU" value={formatPercent(item.cpuPercent)} /><ContainerValue label="Memoria" value={formatPercent(item.memoryPercent)} /><ContainerValue label="Uptime" value={formatDuration(item.uptimeSeconds)} /><ContainerValue label="Reinicios" value={formatNumber(item.restartCount, 0)} /><ContainerValue label="PIDs" value={formatNumber(item.pids, 0)} /><ContainerValue label="Camada" value={formatBytes(item.writableLayerBytes)} /></div></article>)}
    </section>

    {components.length === 1 ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Memoria utilizada" value={formatBytes(components[0].memoryUsedBytes)} detail={`Limite ${formatBytes(components[0].memoryLimitBytes)}`} icon={<MemoryStick size={18} />} status={components[0].status} /><KpiCard label="CPU" value={formatPercent(components[0].cpuPercent)} detail={`${formatNumber(components[0].pids, 0)} processos`} icon={<Cpu size={18} />} accent="sky" /><KpiCard label="Rede acumulada" value={formatBytes(networkTotal)} detail={`RX ${formatBytes(components[0].networkRxBytes)} | TX ${formatBytes(components[0].networkTxBytes)}`} icon={<Network size={18} />} /><KpiCard label="Reinicios" value={formatNumber(components[0].restartCount, 0)} detail={`Uptime ${formatDuration(components[0].uptimeSeconds)}`} icon={<RotateCcw size={18} />} accent="neutral" /></section> : null}

    <section className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="CPU dos containers" subtitle="Percentual calculado pelo Docker Stats" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={cpuSeries} valueFormatter={(value) => formatPercent(value)} axisFormatter={(value) => `${formatNumber(value, 0)}%`} />
      </ChartPanel>
      <ChartPanel title="Memoria dos containers" subtitle="Uso em relacao ao limite de cada container" empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={memorySeries} valueFormatter={(value) => formatPercent(value)} axisFormatter={(value) => `${formatNumber(value, 0)}%`} />
      </ChartPanel>
      <ChartPanel title="Rede acumulada" subtitle={selectedKey ? "Bytes recebidos e enviados desde o inicio do container" : "Soma de RX e TX por container"} empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={networkSeries} valueFormatter={(value) => formatBytes(value)} axisFormatter={(value) => formatBytes(value)} />
      </ChartPanel>
      <ChartPanel title="Armazenamento do container" subtitle={selectedKey ? "Block I/O e camada gravavel acumulados" : "Camada gravavel reportada por container"} empty={!chartData.length}>
        <MetricChart data={chartData} range={range} series={storageSeries} valueFormatter={(value) => formatBytes(value)} axisFormatter={(value) => formatBytes(value)} />
      </ChartPanel>
    </section>

    <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="panel-title">Volumes utilizados</h2><p className="panel-subtitle">Espaco ocupado reportado pelo Docker System DF, sem inferir capacidade</p></div><HardDrive size={17} className="text-[var(--accent)]" /></div><div className="data-table-wrap"><table className="data-table analytics-table min-w-[680px]"><thead><tr><th>Container</th><th>Volume</th><th>Destino</th><th>Utilizado</th></tr></thead><tbody>{components.flatMap((component) => (component.volumes || []).map((volume) => <tr key={`${component.component}:${volume.name}:${volume.destination}`}><td className="font-semibold">{componentLabel(component.component)}</td><td className="mono">{volume.name}</td><td className="mono text-[var(--muted)]">{volume.destination}</td><td>{formatBytes(volume.usedBytes)}</td></tr>))}</tbody></table></div></section>
  </>;
}

function createSeries(keys: string[], metric: string, prefix?: string): ChartSeries[] {
  const label = prefix || (metric === "cpu" ? "CPU" : "Memoria");
  return keys.map((key, index) => ({ key: `${key}:${metric}`, label: `${label} ${componentLabel(key).replace("Container ", "")}`, color: colors[index % colors.length], kind: index === 0 ? "area" : "line" }));
}

function ContainerValue({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-semibold uppercase text-[var(--muted)]">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>;
}