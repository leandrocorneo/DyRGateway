"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AppWindow, ArrowRight, CheckCircle2, Globe2, Layers3, Network, RefreshCw, ServerCog, TriangleAlert } from "lucide-react";
import { api } from "@/lib/apiClient";
import { Badge, Button, EmptyState, PageHeader } from "@/app/components/ui";
import type { Application, Domain, HealthStatus, Service } from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

export default function Home() {
  const [state, setState] = useState<LoadState>("loading");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const load = async () => {
    setState("loading");
    try {
      const [h, a, d, s] = await Promise.all([
        api.get<HealthStatus>("/health"),
        api.get<Application[]>("/applications", { params: { take: 100 } }),
        api.get<Domain[]>("/domains", { params: { take: 100 } }),
        api.get<Service[]>("/services", { params: { take: 100 } }),
      ]);
      setHealth(h.data); setApplications(a.data); setDomains(d.data); setServices(s.data); setState("ready");
    } catch { setState("error"); }
  };

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);

  const activeApps = applications.filter((item) => item.active).length;
  const activeServices = services.filter((item) => item.active).length;
  const checks = [health?.server, health?.database, health?.redis];
  const healthy = checks.filter((value) => value === "ok").length;
  const appNames = new Map(applications.map((item) => [item.id, item.name]));

  return (
    <div className="app-page">
      <PageHeader eyebrow="Visao operacional" title="Dashboard" description="Acompanhe a configuracao atual do gateway e acesse rapidamente os pontos que exigem operacao." actions={<Button variant="secondary" icon={<RefreshCw size={15} className={state === "loading" ? "animate-spin" : ""} />} onClick={load} disabled={state === "loading"}>Atualizar</Button>} />

      {state === "error" ? <div className="feedback feedback-error"><TriangleAlert size={17} /><span>Nao foi possivel consolidar os dados do gateway. Tente atualizar a leitura.</span></div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<AppWindow size={19} />} label="Aplicacoes" value={applications.length} detail={`${activeApps} em operacao`} tone="green" />
        <Metric icon={<Globe2 size={19} />} label="Dominios" value={domains.length} detail="hosts mapeados" tone="blue" />
        <Metric icon={<ServerCog size={19} />} label="Servicos" value={services.length} detail={`${activeServices} ativos`} tone="amber" />
        <Metric icon={<Activity size={19} />} label="Componentes" value={`${healthy}/3`} detail={healthy === 3 ? "todos saudaveis" : "requer atencao"} tone="neutral" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_.75fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header"><div><h2 className="panel-title">Fluxo de roteamento</h2><p className="panel-subtitle">Relacao entre os recursos configurados</p></div><Link href="/gateway" className="button button-secondary">Diagnosticar <ArrowRight size={14} /></Link></div>
          <div className="panel-body">
            <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
              <FlowNode icon={<Globe2 size={20} />} label="Entrada" value={`${domains.length} dominios`} />
              <ArrowRight className="mx-auto rotate-90 text-[var(--muted)] md:rotate-0" size={18} />
              <FlowNode icon={<Layers3 size={20} />} label="Aplicacoes" value={`${activeApps} ativas`} />
              <ArrowRight className="mx-auto rotate-90 text-[var(--muted)] md:rotate-0" size={18} />
              <FlowNode icon={<Network size={20} />} label="Targets" value={`${activeServices} disponiveis`} />
            </div>
            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <div className="mb-2 flex justify-between text-xs"><span className="font-semibold">Cobertura de servicos ativos</span><span className="text-[var(--muted)]">{services.length ? Math.round((activeServices / services.length) * 100) : 0}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-strong)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${services.length ? (activeServices / services.length) * 100 : 0}%` }} /></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Saude do sistema</h2><p className="panel-subtitle">Ultima leitura da infraestrutura</p></div><Activity size={18} className="text-[var(--accent)]" /></div>
          <div className="divide-y divide-[var(--border)] px-5">
            <HealthLine label="Servidor" value={health?.server} />
            <HealthLine label="Database" value={health?.database} />
            <HealthLine label="Redis" value={health?.redis} />
          </div>
          <div className="border-t border-[var(--border)] px-5 py-4 text-xs text-[var(--muted)]">Leitura: {health?.timestamp ? new Date(health.timestamp).toLocaleString("pt-BR") : "aguardando dados"}</div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header"><div><h2 className="panel-title">Servicos configurados</h2><p className="panel-subtitle">Targets mais recentes do gateway</p></div><Link href="/services" className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">Ver todos</Link></div>
          {services.length === 0 ? <EmptyState loading={state === "loading"} text="Nenhum servico configurado." /> : <div className="data-table-wrap"><table className="data-table min-w-[620px]"><thead><tr><th>Aplicacao</th><th>Rota</th><th>Destino</th><th>Status</th></tr></thead><tbody>{services.slice(0, 5).map((item) => <tr key={item.id}><td><p className="table-primary">{appNames.get(item.applicationId) || "Aplicacao"}</p><p className="table-secondary mono">{item.applicationId.slice(0, 8)}</p></td><td className="font-medium">{item.path}</td><td className="mono text-[var(--muted-strong)]">{item.targetHost}:{item.targetPort}</td><td><Badge active={item.active} /></td></tr>)}</tbody></table></div>}
        </div>

        <div className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Acoes frequentes</h2><p className="panel-subtitle">Atalhos para operacao</p></div></div>
          <div className="grid gap-2 p-3">
            <QuickLink href="/applications" icon={<AppWindow size={17} />} title="Gerenciar aplicacoes" detail="Cadastro e ativacao" />
            <QuickLink href="/domains" icon={<Globe2 size={17} />} title="Mapear dominio" detail="Direcionar um novo host" />
            <QuickLink href="/gateway" icon={<Network size={17} />} title="Testar resolucao" detail="Validar host e path" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: number | string; detail: string; tone: string }) {
  const tones: Record<string, string> = { green: "bg-[var(--success-soft)] text-[var(--success)]", blue: "bg-[#eaf0f5] text-[#45667d] dark:bg-[#25323b] dark:text-[#91aabd]", amber: "bg-[var(--warning-soft)] text-[var(--warning)]", neutral: "bg-[var(--panel-strong)] text-[var(--muted-strong)]" };
  return <div className="panel flex items-center gap-4 p-5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ${tones[tone]}`}>{icon}</span><div className="min-w-0"><p className="text-xs font-medium text-[var(--muted)]">{label}</p><div className="mt-1 flex items-baseline gap-2"><strong className="text-2xl font-semibold">{value}</strong><span className="truncate text-[11px] text-[var(--muted)]">{detail}</span></div></div></div>;
}

function FlowNode({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-4"><span className="mb-4 grid h-9 w-9 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</span><p className="text-xs font-semibold">{label}</p><p className="mt-1 text-xs text-[var(--muted)]">{value}</p></div>;
}

function HealthLine({ label, value }: { label: string; value?: string }) {
  const ok = value === "ok";
  return <div className="flex items-center justify-between py-4"><div className="flex items-center gap-3">{ok ? <CheckCircle2 size={17} className="text-[var(--success)]" /> : <TriangleAlert size={17} className="text-[var(--warning)]" />}<span className="text-sm font-medium">{label}</span></div><span className={`text-xs font-semibold ${ok ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>{value || "-"}</span></div>;
}

function QuickLink({ href, icon, title, detail }: { href: string; icon: React.ReactNode; title: string; detail: string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-md p-3 hover:bg-[var(--panel-soft)]"><span className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border)] text-[var(--accent)]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-[var(--muted)]">{detail}</span></span><ArrowRight size={15} className="text-[var(--muted)]" /></Link>;
}
