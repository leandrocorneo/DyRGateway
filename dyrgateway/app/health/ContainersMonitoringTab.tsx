"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  Box,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleStop,
  ExternalLink,
  FilterX,
  HeartPulse,
  PlayCircle,
  Search,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import ContainerGroupActions from "@/app/components/ContainerGroupActions";
import ContainerOrchestrationActions from "@/app/components/ContainerOrchestrationActions";
import { KpiCard, StatusBadge } from "@/app/components/monitoring";
import { Button, EmptyState, Input, Select } from "@/app/components/ui";
import {
  dockerStateLabel,
  formatBytes,
  formatContainerPorts,
  formatDuration,
  formatNumber,
  formatPercent,
  statusLabel,
} from "@/lib/monitoring";
import type {
  ContainerActionResponse,
  ContainerCatalogItem,
  ContainerCatalogState,
  ContainerComposeGroupItem,
  ContainerGroupActionResponse,
  ContainerGroupCatalogResponse,
} from "@/lib/types";

type Props = {
  metrics: ContainerGroupCatalogResponse;
  state: ContainerCatalogState;
  search: string;
  page: number;
  take: number;
  onQueryChange: (values: Record<string, string | null>) => void;
  onRefresh: () => void | Promise<void>;
  detailHref: (id: string) => string;
};

export default function ContainersMonitoringTab({
  metrics,
  state,
  search,
  page,
  take,
  onQueryChange,
  onRefresh,
  detailHref,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [busyGroups, setBusyGroups] = useState<Set<string>>(() => new Set());
  const [containerOverrides, setContainerOverrides] = useState<Record<string, ContainerActionResponse>>({});
  const [groupOverrides, setGroupOverrides] = useState<Record<string, ContainerGroupActionResponse["group"]>>({});
  const totalPages = Math.max(1, Math.ceil(metrics.meta.pagination.total / take));
  const currentPage = Math.min(page, totalPages);
  const pages = paginationWindow(currentPage, totalPages);

  const toggleGroup = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setGroupBusy = (id: string, busy: boolean) => {
    setBusyGroups((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleContainerCompleted = (response: ContainerActionResponse) => {
    setContainerOverrides((current) => ({ ...current, [response.container.id]: response }));
    void onRefresh();
  };

  const handleGroupCompleted = (response: ContainerGroupActionResponse) => {
    setGroupOverrides((current) => ({ ...current, [response.group.id]: response.group }));
    setContainerOverrides((current) => {
      const next = { ...current };
      response.results.forEach((result) => {
        if (result.status === "failed") return;
        next[result.containerId] = {
          action: response.action,
          changed: result.status === "changed",
          completedAt: response.completedAt,
          container: {
            id: result.containerId,
            name: result.name,
            instanceId: result.instanceId,
            previousState: result.previousState,
            state: result.state,
            health: result.health,
          },
          orchestration: result.orchestration,
        };
      });
      return next;
    });
    void onRefresh();
  };

  const displayContainer = (container: ContainerCatalogItem) => {
    const override = containerOverrides[container.id];
    return override ? {
      ...container,
      state: override.container.state,
      health: override.container.health,
      currentContainerId: override.container.instanceId,
      orchestration: override.orchestration,
    } : container;
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextSearch = String(form.get("search") || "").trim();
    onQueryChange({ search: nextSearch || null, page: null });
  };

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Projetos Compose" value={formatNumber(metrics.summary.projects, 0)} detail={`${metrics.summary.protectedProjects} protegido(s)`} icon={<Boxes size={18} />} accent="blue" />
        <KpiCard label="Standalone" value={formatNumber(metrics.summary.standalone, 0)} detail="Containers avulsos" icon={<Box size={18} />} accent="neutral" />
        <KpiCard label="Containers" value={formatNumber(metrics.summary.containers, 0)} detail="Inventario atual" icon={<ServerCog size={18} />} accent="neutral" />
        <KpiCard label="Em execucao" value={formatNumber(metrics.summary.running, 0)} detail="Estado running" icon={<PlayCircle size={18} />} accent="sky" />
        <KpiCard label="Parados" value={formatNumber(metrics.summary.stopped, 0)} detail="Estados nao running" icon={<CircleStop size={18} />} accent="neutral" />
        <KpiCard label="Com falha" value={formatNumber(metrics.summary.unhealthy, 0)} detail="Healthcheck unhealthy" icon={<HeartPulse size={18} />} accent={metrics.summary.unhealthy > 0 ? "red" : "neutral"} />
      </section>

      <section className="panel overflow-hidden">
        <form className="container-catalog-filters" key={search} onSubmit={submitFilters}>
          <div className="container-state-control" role="group" aria-label="Estado dos projetos e containers">
            {(["all", "running", "stopped"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={state === value ? "is-active" : ""}
                aria-pressed={state === value}
                onClick={() => onQueryChange({ state: value === "all" ? null : value, page: null })}
              >
                {value === "all" ? "Todos" : value === "running" ? "Em execucao" : "Parados"}
              </button>
            ))}
          </div>

          <div className="container-group-filter-fields">
            <label className="container-search-field">
              <Search size={15} aria-hidden="true" />
              <Input name="search" defaultValue={search} maxLength={100} placeholder="Buscar projeto, container, imagem ou servico" aria-label="Buscar projetos e containers" />
            </label>
            <Button type="submit" variant="secondary" icon={<Search size={15} />}>Aplicar</Button>
            {search ? <Button type="button" variant="ghost" icon={<FilterX size={15} />} onClick={() => onQueryChange({ search: null, page: null })}>Limpar</Button> : null}
          </div>
        </form>

        <div className="container-group-list">
          {metrics.items.map((item) => {
            if (item.kind === "standalone") {
              const container = displayContainer(item.container);
              return (
                <ContainerOperationalRow
                  key={item.id}
                  container={container}
                  detailHref={detailHref(container.id)}
                  standalone
                  disabled={false}
                  onCompleted={handleContainerCompleted}
                  onRemoved={() => void onRefresh()}
                />
              );
            }
            const override = groupOverrides[item.id];
            const group: ContainerComposeGroupItem = override ? {
              ...item,
              summary: override.summary,
              orchestration: override.orchestration,
              containers: item.containers.map(displayContainer),
            } : { ...item, containers: item.containers.map(displayContainer) };
            const isExpanded = expanded.has(group.id);
            const isBusy = busyGroups.has(group.id);
            return (
              <ComposeGroup
                key={group.id}
                group={group}
                expanded={isExpanded}
                busy={isBusy}
                onToggle={() => toggleGroup(group.id)}
                onBusyChange={(busy) => setGroupBusy(group.id, busy)}
                onGroupCompleted={handleGroupCompleted}
                onContainerCompleted={handleContainerCompleted}
                onRemoved={() => void onRefresh()}
                detailHref={detailHref}
              />
            );
          })}
        </div>

        {!metrics.items.length ? <EmptyState text="Nenhum projeto ou container corresponde aos filtros atuais." /> : null}

        <footer className="catalog-pagination">
          <p>{metrics.meta.pagination.total ? `${metrics.meta.pagination.skip + 1}-${metrics.meta.pagination.skip + metrics.items.length} de ${metrics.meta.pagination.total}` : "0 resultados"}</p>
          <div className="catalog-page-size">
            <span>Itens por pagina</span>
            <Select value={take} onChange={(event) => onQueryChange({ take: event.target.value === "10" ? null : event.target.value, page: null })} aria-label="Itens por pagina">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </Select>
          </div>
          <nav className="catalog-pages" aria-label="Paginacao dos projetos e containers">
            <button type="button" onClick={() => onQueryChange({ page: null })} disabled={currentPage === 1} aria-label="Primeira pagina"><ChevronsLeft size={14} /></button>
            <button type="button" onClick={() => onQueryChange({ page: currentPage - 1 <= 1 ? null : String(currentPage - 1) })} disabled={currentPage === 1} aria-label="Pagina anterior"><ChevronLeft size={14} /></button>
            {pages.map((item, index) => item === "ellipsis"
              ? <span key={"ellipsis-" + index}>...</span>
              : <button key={item} type="button" className={item === currentPage ? "is-active" : ""} aria-current={item === currentPage ? "page" : undefined} onClick={() => onQueryChange({ page: item === 1 ? null : String(item) })}>{item}</button>)}
            <button type="button" onClick={() => onQueryChange({ page: String(currentPage + 1) })} disabled={currentPage === totalPages} aria-label="Proxima pagina"><ChevronRight size={14} /></button>
            <button type="button" onClick={() => onQueryChange({ page: totalPages === 1 ? null : String(totalPages) })} disabled={currentPage === totalPages} aria-label="Ultima pagina"><ChevronsRight size={14} /></button>
          </nav>
        </footer>
      </section>
    </>
  );
}

function ComposeGroup({
  group,
  expanded,
  busy,
  onToggle,
  onBusyChange,
  onGroupCompleted,
  onContainerCompleted,
  onRemoved,
  detailHref,
}: {
  group: ContainerComposeGroupItem;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onBusyChange: (busy: boolean) => void;
  onGroupCompleted: (response: ContainerGroupActionResponse) => void;
  onContainerCompleted: (response: ContainerActionResponse) => void;
  onRemoved: () => void;
  detailHref: (id: string) => string;
}) {
  const regionId = "compose-group-" + group.id;
  return (
    <div className={`container-compose-group ${busy ? "is-busy" : ""}`}>
      <div className="container-group-header">
        <button type="button" className="container-group-toggle" onClick={onToggle} aria-expanded={expanded} aria-controls={regionId}>
          <span className="container-group-chevron">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
          <span className="container-group-icon"><Boxes size={17} /></span>
          <span className="container-group-title">
            <strong>{group.project}</strong>
            <small>{group.summary.total} container(s)</small>
          </span>
        </button>
        <div className="container-group-summary" aria-label="Resumo do projeto">
          <span><strong>{group.summary.running}</strong> executando</span>
          <span><strong>{group.summary.stopped}</strong> parado(s)</span>
          <span><strong>{group.summary.healthy}</strong> saudavel(is)</span>
          {group.summary.unhealthy > 0 ? <span className="is-danger"><strong>{group.summary.unhealthy}</strong> com falha</span> : null}
          {group.summary.unknown > 0 ? <span><strong>{group.summary.unknown}</strong> sem health</span> : null}
        </div>
        {group.orchestration.protected ? <span className="container-protected-label"><ShieldCheck size={14} />Protegido</span> : null}
        <ContainerGroupActions group={group} disabled={busy} onBusyChange={onBusyChange} onCompleted={onGroupCompleted} />
      </div>
      {expanded ? (
        <div id={regionId} className="container-group-children">
          {group.containers.map((container) => (
            <ContainerOperationalRow
              key={container.id}
              container={container}
              detailHref={detailHref(container.id)}
              disabled={busy}
              onCompleted={onContainerCompleted}
              onRemoved={onRemoved}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContainerOperationalRow({
  container,
  detailHref,
  standalone = false,
  disabled,
  onCompleted,
  onRemoved,
}: {
  container: ContainerCatalogItem;
  detailHref: string;
  standalone?: boolean;
  disabled: boolean;
  onCompleted: (response: ContainerActionResponse) => void;
  onRemoved: () => void;
}) {
  const status = container.state === "running" ? container.health || "up" : "down";
  return (
    <div className={`container-operational-row ${standalone ? "is-standalone" : ""}`}>
      <div className="container-operational-identity">
        <span className="container-child-icon"><Box size={15} /></span>
        <div>
          <Link href={detailHref} className="container-name-link">{container.name}</Link>
          <p title={container.image}>{standalone ? "Standalone" : container.compose?.service || "Servico Compose"} · <span className="mono">{container.image}</span></p>
        </div>
      </div>
      <div className="container-operational-state">
        <StatusBadge status={status} />
        <span>{dockerStateLabel(container.state)}{container.health ? " / " + statusLabel(container.health) : ""}</span>
      </div>
      <dl className="container-operational-metrics">
        <div><dt>CPU</dt><dd>{formatPercent(container.current?.cpuPercent)}</dd></div>
        <div><dt>Memoria</dt><dd>{formatBytes(container.current?.memoryUsedBytes)}</dd></div>
        <div><dt>Uptime</dt><dd>{formatDuration(container.current?.uptimeSeconds)}</dd></div>
        <div><dt>Portas</dt><dd title={formatContainerPorts(container.ports, 6)}>{formatContainerPorts(container.ports)}</dd></div>
        <div><dt>Reinicios</dt><dd>{formatNumber(container.current?.restartCount, 0)}</dd></div>
      </dl>
      <div className="container-row-actions">
        <ContainerOrchestrationActions container={container} compact disabled={disabled} onCompleted={onCompleted} onRemoved={onRemoved} />
        <Link href={detailHref} className="icon-button" title="Abrir detalhes" aria-label={"Abrir detalhes de " + container.name}><ExternalLink size={15} /></Link>
      </div>
    </div>
  );
}

function paginationWindow(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const values = new Set([1, total, current - 1, current, current + 1].filter((value) => value >= 1 && value <= total));
  const sorted = [...values].sort((left, right) => left - right);
  const result: Array<number | "ellipsis"> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("ellipsis");
    result.push(value);
  });
  return result;
}
