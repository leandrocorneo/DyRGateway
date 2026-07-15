"use client";

import axios from "axios";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { Activity, Boxes, Database, Gauge, HeartPulse, RefreshCw, Server, TriangleAlert, Waypoints } from "lucide-react";
import { api } from "@/lib/apiClient";
import { Button, PageHeader } from "@/app/components/ui";
import { DataFreshness, KpiCard, MonitoringTabs, RangeSelector, StatusBadge, type MonitoringTab } from "@/app/components/monitoring";
import { componentLabel, formatDateTime, formatDuration, formatLatency, formatPercent, isMonitoringRange } from "@/lib/monitoring";
import { usePollingData } from "@/lib/usePollingData";
import type { ApiMonitoringResponse, ContainerCatalogResponse, ContainerCatalogState, DatabaseMonitoringResponse, HealthLive, HealthReady, MonitoringOverviewResponse, MonitoringRange, RedisMonitoringResponse } from "@/lib/types";
import ApiMonitoringTab from "./ApiMonitoringTab";
import RedisMonitoringTab from "./RedisMonitoringTab";
import DatabaseMonitoringTab from "./DatabaseMonitoringTab";
import ContainersMonitoringTab from "./ContainersMonitoringTab";

type HealthTab = "overview" | "api" | "redis" | "database" | "containers";

type TabPayload =
  | { tab: "overview"; live: HealthLive; ready: HealthReady; overview: MonitoringOverviewResponse }
  | { tab: "api"; metrics: ApiMonitoringResponse; endpoints: ApiMonitoringResponse }
  | { tab: "redis"; metrics: RedisMonitoringResponse }
  | { tab: "database"; metrics: DatabaseMonitoringResponse }
  | { tab: "containers"; metrics: ContainerCatalogResponse };

const tabs: MonitoringTab[] = [
  { value: "overview", label: "Visao geral", icon: <HeartPulse size={15} /> },
  { value: "api", label: "API", icon: <Gauge size={15} /> },
  { value: "redis", label: "Redis", icon: <Waypoints size={15} /> },
  { value: "database", label: "Banco", icon: <Database size={15} /> },
  { value: "containers", label: "Containers", icon: <Boxes size={15} /> },
];

const isTab = (value: string | null): value is HealthTab => tabs.some((tab) => tab.value === value);
const isContainerState = (value: string | null): value is ContainerCatalogState => ["running", "stopped", "all"].includes(value || "");
const validTextFilter = (value: string | null) => {
  const parsed = value?.trim() || "";
  return parsed.length <= 100 ? parsed : "";
};
const validPage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
};
const validTake = (value: string | null) => value === "50" ? 50 : value === "100" ? 100 : 25;

export default function HealthPage() {
  return <Suspense fallback={<HealthLoading />}><HealthWorkspace /></Suspense>;
}

function HealthWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rangeParam = searchParams.get("range");
  const tabParam = searchParams.get("tab");
  const range: MonitoringRange = isMonitoringRange(rangeParam) ? rangeParam : "1h";
  const tab: HealthTab = isTab(tabParam) ? tabParam : "overview";
  const containerState: ContainerCatalogState = isContainerState(searchParams.get("state")) ? searchParams.get("state") as ContainerCatalogState : "running";
  const project = validTextFilter(searchParams.get("project"));
  const search = validTextFilter(searchParams.get("search"));
  const page = validPage(searchParams.get("page"));
  const take = validTake(searchParams.get("take"));

  const loadReady = useCallback(async (signal: AbortSignal) => {
    try {
      return (await api.get<HealthReady>("/health/ready", { signal })).data;
    } catch (error) {
      if (axios.isAxiosError<HealthReady>(error) && error.response?.status === 503 && error.response.data) return error.response.data;
      throw error;
    }
  }, []);

  const loader = useCallback(async (signal: AbortSignal): Promise<TabPayload> => {
    if (tab === "overview") {
      const [live, ready, overview] = await Promise.all([
        api.get<HealthLive>("/health/live", { signal }),
        loadReady(signal),
        api.get<MonitoringOverviewResponse>("/monitoring/overview", { params: { range }, signal }),
      ]);
      return { tab, live: live.data, ready, overview: overview.data };
    }
    if (tab === "api") {
      const [metrics, endpoints] = await Promise.all([
        api.get<ApiMonitoringResponse>("/monitoring/api", { params: { range }, signal }),
        api.get<ApiMonitoringResponse>("/monitoring/api/endpoints", { params: { range }, signal }),
      ]);
      return { tab, metrics: metrics.data, endpoints: endpoints.data };
    }
    if (tab === "redis") return { tab, metrics: (await api.get<RedisMonitoringResponse>("/monitoring/redis", { params: { range }, signal })).data };
    if (tab === "database") return { tab, metrics: (await api.get<DatabaseMonitoringResponse>("/monitoring/database", { params: { range }, signal })).data };
    return {
      tab,
      metrics: (await api.get<ContainerCatalogResponse>("/monitoring/containers", {
        params: {
          state: containerState,
          skip: (page - 1) * take,
          take,
          ...(project ? { project } : {}),
          ...(search ? { search } : {}),
        },
        signal,
      })).data,
    };
  }, [containerState, loadReady, page, project, range, search, tab, take]);

  const state = usePollingData("health:" + tab + ":" + range + ":" + containerState + ":" + project + ":" + search + ":" + page + ":" + take, loader);
  const updateQuery = (values: Record<string, string | null>) => {
    const query = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => value ? query.set(key, value) : query.delete(key));
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const meta = state.data?.tab === "overview" ? state.data.overview.meta : state.data?.tab === "containers" ? undefined : state.data?.metrics.meta;

  return (
    <div className="app-page">
      <PageHeader eyebrow="Monitoramento" title="Saude do sistema" description="Disponibilidade, desempenho e consumo dos componentes que sustentam o gateway." actions={<Button variant="secondary" icon={<RefreshCw size={15} className={state.refreshing ? "animate-spin" : ""} />} onClick={state.refresh} disabled={state.loading || state.refreshing}>Atualizar</Button>} />

      <section className="panel overflow-hidden">
        <MonitoringTabs tabs={tabs} value={tab} onChange={(value) => updateQuery({ tab: value, state: null, project: null, search: null, page: null, take: null })} />
        <div className="analytics-toolbar px-4 py-3 sm:px-5">
          <DataFreshness updatedAt={state.updatedAt} refreshing={state.refreshing} partial={meta?.partial} />
          {tab !== "containers" ? <RangeSelector value={range} onChange={(value) => updateQuery({ range: value })} /> : null}
        </div>
      </section>

      {state.error ? <div className="feedback feedback-error"><TriangleAlert size={16} /><span>{state.error}</span></div> : null}
      {state.loading && !state.data ? <HealthLoadingPanel /> : null}
      {state.data?.tab === "overview" ? <OverviewTab data={state.data} /> : null}
      {state.data?.tab === "api" ? <ApiMonitoringTab metrics={state.data.metrics} endpoints={state.data.endpoints} range={range} /> : null}
      {state.data?.tab === "redis" ? <RedisMonitoringTab metrics={state.data.metrics} range={range} /> : null}
      {state.data?.tab === "database" ? <DatabaseMonitoringTab metrics={state.data.metrics} range={range} /> : null}
      {state.data?.tab === "containers" ? <ContainersMonitoringTab
        metrics={state.data.metrics}
        state={containerState}
        project={project}
        search={search}
        page={page}
        take={take}
        onQueryChange={updateQuery}
        detailHref={(id) => {
          const query = new URLSearchParams();
          query.set("range", range);
          if (containerState !== "running") query.set("state", containerState);
          if (project) query.set("project", project);
          if (search) query.set("search", search);
          if (page > 1) query.set("page", String(page));
          if (take !== 25) query.set("take", String(take));
          return "/health/containers/" + encodeURIComponent(id) + "?" + query.toString();
        }}
      /> : null}
    </div>
  );
}

function OverviewTab({ data }: { data: Extract<TabPayload, { tab: "overview" }> }) {
  const ready = data.ready.database === "ok" && data.ready.redis === "ok";
  const apiProbe = data.overview.breakdown.find((item) => item.component === "api");
  return <>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Liveness" value={data.live.server === "ok" ? "Disponivel" : data.live.server} detail={formatDateTime(data.live.timestamp)} icon={<Activity size={18} />} status={data.live.server} />
      <KpiCard label="Readiness" value={ready ? "Pronto" : "Dependencia indisponivel"} detail="Banco e Redis" icon={<HeartPulse size={18} />} status={ready ? "up" : "down"} accent={ready ? "blue" : "red"} />
      <KpiCard label="Uptime da API" value={formatDuration(data.live.uptimeSeconds)} detail="Processo atual" icon={<Server size={18} />} accent="neutral" />
      <KpiCard label="Latencia PostgreSQL" value={formatLatency(data.ready.databaseLatencyMs)} detail={`Status: ${data.ready.database}`} icon={<Database size={18} />} status={data.ready.database} accent="sky" />
      <KpiCard label="Latencia Redis" value={formatLatency(data.ready.redisLatencyMs)} detail={`Status: ${data.ready.redis}`} icon={<Waypoints size={18} />} status={data.ready.redis} accent="sky" />
    </section>

    <section className="panel overflow-hidden">
      <div className="panel-header"><div><h2 className="panel-title">Componentes monitorados</h2><p className="panel-subtitle">Ultima amostra persistida pelo worker de metricas</p></div><StatusBadge status={apiProbe?.status} /></div>
      <div className="component-list">
        {data.overview.breakdown.map((item) => <div className="component-row" key={item.component}><div><p className="text-xs font-semibold">{componentLabel(item.component)}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{item.name || item.component}</p></div><span className="component-meta">{item.latencyMs !== undefined ? formatLatency(item.latencyMs) : item.memoryPercent !== undefined ? `${formatPercent(item.memoryPercent)} memoria` : "Amostra atual"}</span><StatusBadge status={item.status} /></div>)}
      </div>
    </section>
  </>;
}

function HealthLoading() {
  return <div className="app-page"><PageHeader eyebrow="Monitoramento" title="Saude do sistema" description="Carregando o workspace de monitoramento." /><HealthLoadingPanel /></div>;
}

function HealthLoadingPanel() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="panel h-[132px] animate-pulse bg-[var(--panel-soft)]" />)}</div>;
}
