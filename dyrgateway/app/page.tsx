"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import { Activity, AppWindow, ArrowRight, Gauge, Globe2, Layers3, Network, RefreshCw, ServerCog, Timer, TriangleAlert, UsersRound } from "lucide-react";
import { api } from "@/lib/apiClient";
import { Button, EmptyState, PageHeader } from "@/app/components/ui";
import { ChartPanel, DataFreshness, KpiCard, MetricChart, RangeSelector, StatusBadge } from "@/app/components/monitoring";
import { addTimeGaps, componentLabel, formatCompactNumber, formatLatency, formatNumber, formatPercent, isMonitoringRange, statusLabel } from "@/lib/monitoring";
import { usePollingData } from "@/lib/usePollingData";
import type { ApiMetricPoint, Application, Domain, MonitoringOverviewResponse, MonitoringRange, Service } from "@/lib/types";

type DashboardData = {
  overview: MonitoringOverviewResponse;
  applications: Application[];
  domains: Domain[];
  services: Service[];
};

export default function Home() {
  return <Suspense fallback={<DashboardLoading />}><Dashboard /></Suspense>;
}

function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rangeParam = searchParams.get("range");
  const range: MonitoringRange = isMonitoringRange(rangeParam) ? rangeParam : "1h";

  const loader = useCallback(async (signal: AbortSignal): Promise<DashboardData> => {
    const [overview, applications, domains, services] = await Promise.all([
      api.get<MonitoringOverviewResponse>("/monitoring/overview", { params: { range }, signal }),
      api.get<Application[]>("/applications", { params: { take: 100 }, signal }),
      api.get<Domain[]>("/domains", { params: { take: 100 }, signal }),
      api.get<Service[]>("/services", { params: { take: 100 }, signal }),
    ]);
    return { overview: overview.data, applications: applications.data, domains: domains.data, services: services.data };
  }, [range]);

  const state = usePollingData(`dashboard:${range}`, loader);
  const setRange = (nextRange: MonitoringRange) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("range", nextRange);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const data = state.data;
  const overview = data?.overview;
  const summary = overview?.summary.api;
  const apiProbe = overview?.breakdown.find((item) => item.component === "api");
  const activeApplications = data?.applications.filter((item) => item.active).length || 0;
  const activeServices = data?.services.filter((item) => item.active).length || 0;
  const appNames = new Map(data?.applications.map((item) => [item.id, item.name]) || []);

  const chartData = useMemo(() => addTimeGaps(overview?.series || [], overview?.meta.stepSeconds || 30).map((item) => {
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
  }), [overview]);

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Visao operacional"
        title="Dashboard"
        description="Desempenho do gateway e contexto dos recursos configurados em uma unica leitura."
        actions={<Button variant="secondary" icon={<RefreshCw size={15} className={state.refreshing ? "animate-spin" : ""} />} onClick={state.refresh} disabled={state.loading || state.refreshing}>Atualizar</Button>}
      />

      <div className="analytics-toolbar">
        <DataFreshness updatedAt={state.updatedAt} refreshing={state.refreshing} partial={overview?.meta.partial} />
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {state.error ? <div className="feedback feedback-error"><TriangleAlert size={17} /><span>{state.error}</span></div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="API" value={apiProbe ? statusLabel(apiProbe.status) : "-"} detail={apiProbe?.latencyMs !== undefined ? `Probe em ${formatLatency(apiProbe.latencyMs)}` : "Sem leitura atual"} icon={<Activity size={18} />} status={apiProbe?.status} />
        <KpiCard label="Media de requisicoes" value={summary ? `${formatNumber(summary.averageRps, 2)} req/s` : "-"} detail={summary ? `${formatCompactNumber(summary.requestCount)} no periodo` : "Sem amostras"} icon={<Gauge size={18} />} accent="sky" />
        <KpiCard label="Latencia p95" value={formatLatency(summary?.latency.p95Ms)} detail={`p50 ${formatLatency(summary?.latency.p50Ms)} | p99 ${formatLatency(summary?.latency.p99Ms)}`} icon={<Timer size={18} />} accent="neutral" />
        <KpiCard label="Taxa de erro" value={summary ? formatPercent(summary.errorRate, true) : "-"} detail={summary ? `${formatCompactNumber(summary.status5xx)} respostas 5xx` : "Sem amostras"} icon={<TriangleAlert size={18} />} accent={summary?.status5xx ? "red" : "neutral"} />
        <KpiCard label="Concorrencia maxima" value={summary ? formatNumber(summary.concurrentMax, 0) : "-"} detail="Requests simultaneos" icon={<UsersRound size={18} />} accent="blue" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <ChartPanel title="Volume de requisicoes" subtitle="Requisicoes por segundo e pico de concorrencia" loading={state.loading} error={!data ? state.error : ""} empty={!chartData.length}>
          <MetricChart data={chartData} range={range} series={[{ key: "rps", label: "Req/s", color: "var(--chart-blue)", kind: "area" }, { key: "concurrent", label: "Simultaneas", color: "var(--chart-ink)" }]} valueFormatter={(value, key) => key === "rps" ? `${formatNumber(value, 2)} req/s` : formatNumber(value, 0)} axisFormatter={(value) => formatNumber(value, 1)} />
        </ChartPanel>
        <ChartPanel title="Respostas HTTP" subtitle="Distribuicao por familia de status" loading={state.loading} error={!data ? state.error : ""} empty={!chartData.length}>
          <MetricChart data={chartData} range={range} series={[{ key: "status2xx", label: "2xx", color: "var(--chart-blue)", kind: "bar", stackId: "status" }, { key: "status4xx", label: "4xx", color: "var(--chart-amber)", kind: "bar", stackId: "status" }, { key: "status5xx", label: "5xx", color: "var(--chart-red)", kind: "bar", stackId: "status" }]} valueFormatter={(value) => formatNumber(value, 0)} axisFormatter={(value) => formatCompactNumber(value)} />
        </ChartPanel>
      </section>

      <ChartPanel title="Distribuicao de latencia" subtitle="Percentis calculados a partir dos histogramas do gateway" loading={state.loading} error={!data ? state.error : ""} empty={!chartData.length}>
        <MetricChart data={chartData} range={range} height={250} series={[{ key: "p50", label: "p50", color: "var(--chart-sky)" }, { key: "p95", label: "p95", color: "var(--chart-blue)" }, { key: "p99", label: "p99", color: "var(--chart-ink)" }]} valueFormatter={(value) => formatLatency(value)} axisFormatter={(value) => `${formatNumber(value, 0)} ms`} />
      </ChartPanel>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header"><div><h2 className="panel-title">Infraestrutura atual</h2><p className="panel-subtitle">Ultima amostra de cada componente monitorado</p></div><Link href="/health" className="button button-secondary">Detalhes <ArrowRight size={14} /></Link></div>
          <div className="component-list">
            {overview?.breakdown.length ? overview.breakdown.slice(0, 7).map((item) => <div key={item.component} className="component-row"><div><p className="text-xs font-semibold">{componentLabel(item.component)}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{item.name || item.component}</p></div><span className="component-meta">{item.memoryPercent !== undefined ? `${formatPercent(item.memoryPercent)} memoria` : item.latencyMs !== undefined ? `${formatLatency(item.latencyMs)} probe` : "Leitura atual"}</span><StatusBadge status={item.status} /></div>) : <EmptyState loading={state.loading} text="Nenhuma amostra de infraestrutura." />}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="panel-header"><div><h2 className="panel-title">Configuracao do gateway</h2><p className="panel-subtitle">Recursos ativos e cobertura operacional</p></div></div>
          <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)]">
            <ResourceCount icon={<AppWindow size={17} />} label="Aplicacoes" value={data?.applications.length} detail={`${activeApplications} ativas`} />
            <ResourceCount icon={<Globe2 size={17} />} label="Dominios" value={data?.domains.length} detail="mapeados" />
            <ResourceCount icon={<ServerCog size={17} />} label="Servicos" value={data?.services.length} detail={`${activeServices} ativos`} />
          </div>
          {!data?.services.length ? <EmptyState loading={state.loading} text="Nenhum servico configurado." /> : <div className="data-table-wrap"><table className="data-table min-w-[560px]"><thead><tr><th>Aplicacao</th><th>Rota</th><th>Destino</th><th>Status</th></tr></thead><tbody>{data.services.slice(0, 4).map((item) => <tr key={item.id}><td className="table-primary">{appNames.get(item.applicationId) || "Aplicacao"}</td><td className="font-medium">{item.path}</td><td className="mono text-[var(--muted-strong)]">{item.targetHost}:{item.targetPort}</td><td><span className={`badge ${item.active ? "badge-success" : "badge-neutral"}`}><span className="badge-dot" />{item.active ? "Ativo" : "Inativo"}</span></td></tr>)}</tbody></table></div>}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <QuickLink href="/applications" icon={<Layers3 size={17} />} title="Gerenciar aplicacoes" detail="Cadastro e ativacao" />
        <QuickLink href="/gateway" icon={<Network size={17} />} title="Testar resolucao" detail="Validar host e path" />
        <QuickLink href="/health?tab=containers&range=1h" icon={<Activity size={17} />} title="Analisar containers" detail="CPU, memoria e armazenamento" />
      </div>
    </div>
  );
}

function DashboardLoading() {
  return <div className="app-page"><PageHeader eyebrow="Visao operacional" title="Dashboard" description="Carregando a visao consolidada do gateway." /><div className="panel min-h-[360px] animate-pulse bg-[var(--panel-soft)]" /></div>;
}

function ResourceCount({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value?: number; detail: string }) {
  return <div className="min-w-0 p-4"><span className="mb-3 block text-[var(--accent)]">{icon}</span><strong className="block text-xl font-semibold">{value ?? "-"}</strong><span className="mt-1 block truncate text-[10px] text-[var(--muted)]">{label} | {detail}</span></div>;
}

function QuickLink({ href, icon, title, detail }: { href: string; icon: React.ReactNode; title: string; detail: string }) {
  return <Link href={href} className="panel flex items-center gap-3 p-4 hover:border-[var(--border-strong)]"><span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{title}</span><span className="mt-1 block text-[10px] text-[var(--muted)]">{detail}</span></span><ArrowRight size={14} className="text-[var(--muted)]" /></Link>;
}