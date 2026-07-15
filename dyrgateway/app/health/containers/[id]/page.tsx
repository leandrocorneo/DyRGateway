"use client";

import axios from "axios";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  Box,
  Check,
  Copy,
  Cpu,
  HardDrive,
  MemoryStick,
  RefreshCw,
  RotateCcw,
  TerminalSquare,
  TriangleAlert,
} from "lucide-react";
import ContainerOrchestrationActions from "@/app/components/ContainerOrchestrationActions";
import {
  ChartPanel,
  DataFreshness,
  KpiCard,
  MetricChart,
  RangeSelector,
  StatusBadge,
  type ChartMarker,
} from "@/app/components/monitoring";
import { Button, EmptyState, IconButton, PageHeader } from "@/app/components/ui";
import { api } from "@/lib/apiClient";
import {
  containerIdentityLabel,
  dockerStateLabel,
  formatBytes,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  isMonitoringRange,
  shortContainerId,
  statusLabel,
} from "@/lib/monitoring";
import type {
  ContainerActionResponse,
  ContainerHistoryPoint,
  ContainerHistoryResponse,
  MonitoringRange,
} from "@/lib/types";
import { usePollingData } from "@/lib/usePollingData";

type DetailPayload =
  | { kind: "ready"; metrics: ContainerHistoryResponse }
  | { kind: "not-found" };

const HISTORY_PAGE_SIZE = 240;

export default function ContainerDetailPage() {
  return <Suspense fallback={<ContainerDetailLoading />}><ContainerDetailWorkspace /></Suspense>;
}

function ContainerDetailWorkspace() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id;
  const [actionOverride, setActionOverride] = useState<ContainerActionResponse | null>(null);
  const [removed, setRemoved] = useState(false);
  const range: MonitoringRange = isMonitoringRange(searchParams.get("range")) ? searchParams.get("range") as MonitoringRange : "1h";

  const loader = useCallback(async (signal: AbortSignal): Promise<DetailPayload> => {
    try {
      const first = (await api.get<ContainerHistoryResponse>("/monitoring/containers/" + encodeURIComponent(id), {
        params: { range, skip: 0, take: HISTORY_PAGE_SIZE },
        signal,
      })).data;
      const requests: Array<Promise<ContainerHistoryResponse>> = [];
      for (let skip = HISTORY_PAGE_SIZE; skip < first.meta.pagination.total; skip += HISTORY_PAGE_SIZE) {
        requests.push(api.get<ContainerHistoryResponse>("/monitoring/containers/" + encodeURIComponent(id), {
          params: { range, skip, take: HISTORY_PAGE_SIZE },
          signal,
        }).then((response) => response.data));
      }
      const remaining = await Promise.all(requests);
      const points = [first, ...remaining].flatMap((response) => response.series);
      const unique = new Map<string, ContainerHistoryPoint>();
      points.forEach((point) => unique.set(point.timestamp + "|" + (point.instanceId || ""), point));
      const series = [...unique.values()].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
      return { kind: "ready", metrics: { ...first, series } };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return { kind: "not-found" };
      throw error;
    }
  }, [id, range]);

  const state = usePollingData("container-detail:" + id + ":" + range, loader);
  const backHref = useMemo(() => buildBackHref(searchParams), [searchParams]);

  const updateRange = (value: MonitoringRange) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("range", value);
    router.replace(pathname + "?" + query.toString(), { scroll: false });
  };

  if (state.loading && !state.data) return <ContainerDetailLoading />;
  if (removed || state.data?.kind === "not-found") return <ContainerNotFound backHref={backHref} />;
  if (!state.data || state.data.kind !== "ready") {
    return (
      <div className="app-page">
        <PageHeader eyebrow="Monitoramento" title="Detalhes do container" description="Nao foi possivel carregar o container solicitado." actions={<Link className="button button-secondary" href={backHref}><ArrowLeft size={15} />Voltar</Link>} />
        {state.error ? <div className="feedback feedback-error"><TriangleAlert size={16} /><span>{state.error}</span></div> : null}
      </div>
    );
  }

  const metrics = state.data.metrics;
  const storedContainer = metrics.container;
  const container = actionOverride ? {
    ...storedContainer,
    state: actionOverride.container.state,
    health: actionOverride.container.health,
    currentContainerId: actionOverride.container.instanceId,
    orchestration: actionOverride.orchestration,
  } : storedContainer;
  const current = metrics.current;
  const currentStatus = container.state === "running" ? container.health || "up" : "down";
  const chart = prepareChartData(metrics.series, metrics.meta.stepSeconds);
  const volumes = container.mounts.map((mount) => ({
    ...mount,
    usedBytes: current?.volumes.find((volume) => volume.name === mount.name)?.usedBytes ?? null,
  }));
  const partialCollection = Boolean(current?.collectionError || current?.storageCollectionError);

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Monitoramento de containers"
        title={container.name}
        description={container.image}
        actions={
          <>
            <Link className="button button-secondary" href={backHref}><ArrowLeft size={15} />Voltar</Link>
            <ContainerOrchestrationActions
              container={container}
              onCompleted={(response) => {
                setActionOverride(response);
                void state.refresh();
              }}
              onRemoved={() => setRemoved(true)}
            />
            <Button variant="secondary" icon={<RefreshCw size={15} className={state.refreshing ? "animate-spin" : ""} />} onClick={state.refresh} disabled={state.loading || state.refreshing}>Atualizar</Button>
          </>
        }
      />

      <section className="panel overflow-hidden">
        <div className="analytics-toolbar px-4 py-3 sm:px-5">
          <DataFreshness updatedAt={current?.sampledAt || state.updatedAt} refreshing={state.refreshing} partial={metrics.meta.partial} />
          <RangeSelector value={range} onChange={updateRange} />
        </div>
      </section>

      {state.error ? <div className="feedback feedback-error"><TriangleAlert size={16} /><span>{state.error}</span></div> : null}
      {partialCollection ? (
        <div className="feedback feedback-warning">
          <TriangleAlert size={16} />
          <span>{current?.collectionError ? "Parte das metricas Docker nao foi observada nesta amostra." : "O uso de volumes e da camada gravavel nao foi observado nesta amostra."}</span>
        </div>
      ) : null}

      <section className="container-identity-panel panel">
        <div className="container-identity-main">
          <span className="container-identity-icon"><Box size={20} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2>{container.name}</h2><StatusBadge status={currentStatus} /></div>
            <p className="mono" title={container.image}>{container.image}</p>
          </div>
        </div>
        <div className="container-identity-state">
          <span>Estado Docker</span>
          <strong>{dockerStateLabel(container.state)}</strong>
          <small>{container.health ? "Health: " + statusLabel(container.health) : "Sem healthcheck"}</small>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="CPU" value={formatPercent(current?.cpuPercent)} detail="Docker Stats" icon={<Cpu size={18} />} accent="blue" />
        <KpiCard label="Memoria" value={formatBytes(current?.memoryUsedBytes)} detail={formatPercent(current?.memoryPercent) + " de " + formatBytes(current?.memoryLimitBytes)} icon={<MemoryStick size={18} />} accent="sky" />
        <KpiCard label="Uptime" value={formatDuration(current?.uptimeSeconds)} detail="Instancia atual" icon={<TerminalSquare size={18} />} status={currentStatus} accent="neutral" />
        <KpiCard label="Reinicios" value={formatNumber(current?.restartCount, 0)} detail="Contador Docker" icon={<RotateCcw size={18} />} accent="neutral" />
        <KpiCard label="PIDs" value={formatNumber(current?.pids, 0)} detail="Processos observados" icon={<Box size={18} />} accent="neutral" />
        <KpiCard label="Camada gravavel" value={formatBytes(current?.writableLayerBytes)} detail="Docker System DF" icon={<HardDrive size={18} />} accent="neutral" />
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div><h2 className="panel-title">Identidade e ciclo de vida</h2><p className="panel-subtitle">Metadados permitidos pelo contrato de monitoramento</p></div>
          <StatusBadge status={currentStatus} />
        </div>
        <dl className="container-metadata-grid">
          <MetadataItem label="Origem da identidade" value={containerIdentityLabel(container.identitySource)} />
          <MetadataItem label="Projeto Compose" value={container.compose?.project || "Standalone"} />
          <MetadataItem label="Servico / replica" value={container.compose ? (container.compose.service || "-") + (container.compose.containerNumber ? " #" + container.compose.containerNumber : "") : "-"} />
          <MetadataItem label="Primeira observacao" value={formatDateTime(container.firstSeenAt)} />
          <MetadataItem label="Ultima observacao" value={formatDateTime(container.lastSeenAt)} />
          <MetadataItem label="Criado no Docker" value={formatDateTime(container.containerCreatedAt)} />
          <MetadataItem label="Inicio da instancia" value={formatDateTime(container.instanceStartedAt)} />
          <MetadataItem label="Primeira amostra do periodo" value={formatDateTime(metrics.summary.firstSampleAt)} />
          <MetadataItem label="Ultima amostra do periodo" value={formatDateTime(metrics.summary.lastSampleAt)} />
          <CopyMetadataItem label="ID logico" value={container.id} />
          <CopyMetadataItem label="Container atual" value={container.currentContainerId} />
          <CopyMetadataItem label="Instancia da amostra" value={current?.instanceId || null} />
        </dl>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="CPU" subtitle="Percentual calculado pelo Docker Stats" empty={!hasValues(chart.data, "cpu")}>
          <MetricChart data={chart.data} range={range} markers={chart.markers} series={[{ key: "cpu", label: "CPU", color: "var(--chart-blue)", kind: "area" }]} valueFormatter={(value) => formatPercent(value)} axisFormatter={(value) => formatPercent(value)} />
        </ChartPanel>
        <ChartPanel title="Memoria utilizada" subtitle="Uso observado e limite reportado pelo container" empty={!hasValues(chart.data, "memoryUsed", "memoryLimit")}>
          <MetricChart data={chart.data} range={range} markers={chart.markers} series={[{ key: "memoryUsed", label: "Utilizada", color: "var(--chart-blue)", kind: "area" }, { key: "memoryLimit", label: "Limite", color: "var(--chart-ink)" }]} valueFormatter={(value) => formatBytes(value)} axisFormatter={(value) => formatBytes(value)} />
        </ChartPanel>
        <ChartPanel title="Rede acumulada" subtitle="Bytes recebidos e enviados desde o inicio de cada instancia" empty={!hasValues(chart.data, "networkRx", "networkTx")}>
          <MetricChart data={chart.data} range={range} markers={chart.markers} series={[{ key: "networkRx", label: "RX acumulado", color: "var(--chart-blue)", kind: "area" }, { key: "networkTx", label: "TX acumulado", color: "var(--chart-sky)" }]} valueFormatter={(value) => formatBytes(value)} axisFormatter={(value) => formatBytes(value)} />
        </ChartPanel>
        <ChartPanel title="Block I/O acumulado" subtitle="Leituras e escritas acumuladas por instancia" empty={!hasValues(chart.data, "blockRead", "blockWrite")}>
          <MetricChart data={chart.data} range={range} markers={chart.markers} series={[{ key: "blockRead", label: "Leitura", color: "var(--chart-blue)", kind: "area" }, { key: "blockWrite", label: "Escrita", color: "var(--chart-sky)" }]} valueFormatter={(value) => formatBytes(value)} axisFormatter={(value) => formatBytes(value)} />
        </ChartPanel>
        <ChartPanel title="Camada gravavel" subtitle="Espaco observado pelo Docker System DF" empty={!hasValues(chart.data, "writableLayer")}>
          <MetricChart data={chart.data} range={range} markers={chart.markers} series={[{ key: "writableLayer", label: "Camada gravavel", color: "var(--chart-blue)", kind: "area" }]} valueFormatter={(value) => formatBytes(value)} axisFormatter={(value) => formatBytes(value)} />
        </ChartPanel>
        <ChartPanel title="Processos" subtitle="PIDs observados pelo Docker Stats" empty={!hasValues(chart.data, "pids")}>
          <MetricChart data={chart.data} range={range} markers={chart.markers} series={[{ key: "pids", label: "PIDs", color: "var(--chart-ink)", kind: "area" }]} valueFormatter={(value) => formatNumber(value, 0)} axisFormatter={(value) => formatNumber(value, 0)} />
        </ChartPanel>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div><h2 className="panel-title">Volumes utilizados</h2><p className="panel-subtitle">Uso reportado pelo Docker System DF, sem estimar capacidade total</p></div>
          <HardDrive size={17} className="text-[var(--accent)]" />
        </div>
        {volumes.length ? (
          <div className="data-table-wrap">
            <table className="data-table analytics-table min-w-[680px]">
              <thead><tr><th>Volume</th><th>Destino</th><th>Utilizado</th></tr></thead>
              <tbody>{volumes.map((volume) => <tr key={volume.name + ":" + volume.destination}><td className="mono font-semibold">{volume.name}</td><td className="mono text-[var(--muted)]">{volume.destination}</td><td>{formatBytes(volume.usedBytes)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <EmptyState text="Este container nao possui volumes Docker nomeados." />}
      </section>
    </div>
  );
}

function prepareChartData(series: ContainerHistoryPoint[], stepSeconds: number) {
  const data: Array<Record<string, string | number | null | undefined>> = [];
  const markers: ChartMarker[] = [];
  series.forEach((point, index) => {
    const previous = series[index - 1];
    if (previous) {
      const previousTime = new Date(previous.timestamp).getTime();
      const currentTime = new Date(point.timestamp).getTime();
      const hasTimeGap = currentTime - previousTime > stepSeconds * 1500;
      const instanceChanged = Boolean(previous.instanceId && point.instanceId && previous.instanceId !== point.instanceId);
      if (hasTimeGap) data.push({ timestamp: new Date(previousTime + stepSeconds * 1000).toISOString() });
      if (instanceChanged) {
        if (!hasTimeGap && currentTime > previousTime) data.push({ timestamp: new Date(previousTime + Math.floor((currentTime - previousTime) / 2)).toISOString() });
        markers.push({ timestamp: point.timestamp, label: "Nova instancia" });
      }
    }
    data.push({
      timestamp: point.timestamp,
      cpu: point.cpuPercent,
      memoryUsed: point.memoryUsedBytes,
      memoryLimit: point.memoryLimitBytes,
      networkRx: point.networkRxBytes,
      networkTx: point.networkTxBytes,
      blockRead: point.blockReadBytes,
      blockWrite: point.blockWriteBytes,
      writableLayer: point.writableLayerBytes,
      pids: point.pids,
    });
  });
  return { data, markers };
}

function hasValues(data: Array<Record<string, string | number | null | undefined>>, ...keys: string[]) {
  return data.some((item) => keys.some((key) => typeof item[key] === "number"));
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function CopyMetadataItem({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div>
      <dt>{label}</dt>
      <dd className="container-copy-value">
        <span className="mono" title={value || undefined}>{shortContainerId(value)}</span>
        {value ? <IconButton type="button" label={"Copiar " + label.toLowerCase()} onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}</IconButton> : null}
      </dd>
    </div>
  );
}

function buildBackHref(searchParams: URLSearchParams | ReadonlyURLSearchParams) {
  const query = new URLSearchParams();
  query.set("tab", "containers");
  ["state", "project", "search", "page", "take"].forEach((key) => {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  });
  return "/health?" + query.toString();
}

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

function ContainerNotFound({ backHref }: { backHref: string }) {
  return (
    <div className="app-page">
      <PageHeader eyebrow="Monitoramento de containers" title="Container nao encontrado" description="O container foi removido ou nao pertence mais ao catalogo atual." actions={<Link className="button button-secondary" href={backHref}><ArrowLeft size={15} />Voltar ao catalogo</Link>} />
      <section className="panel"><EmptyState text="Nao existem dados atuais para este container." /></section>
    </div>
  );
}

function ContainerDetailLoading() {
  return (
    <div className="app-page">
      <PageHeader eyebrow="Monitoramento de containers" title="Carregando container" description="Consultando identidade e historico de metricas." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="panel h-[132px] animate-pulse bg-[var(--panel-soft)]" />)}</div>
      <div className="grid gap-4 xl:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="panel h-[360px] animate-pulse bg-[var(--panel-soft)]" />)}</div>
    </div>
  );
}
