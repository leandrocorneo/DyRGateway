"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  CircleStop,
  ExternalLink,
  FilterX,
  HeartPulse,
  PlayCircle,
  Search,
  ShieldAlert,
} from "lucide-react";
import ContainerOrchestrationActions from "@/app/components/ContainerOrchestrationActions";
import { KpiCard, StatusBadge } from "@/app/components/monitoring";
import { Button, EmptyState, Input, Select } from "@/app/components/ui";
import {
  dockerStateLabel,
  formatBytes,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  statusLabel,
} from "@/lib/monitoring";
import type {
  ContainerActionResponse,
  ContainerCatalogItem,
  ContainerCatalogResponse,
  ContainerCatalogState,
} from "@/lib/types";


type Props = {
  metrics: ContainerCatalogResponse;
  state: ContainerCatalogState;
  project: string;
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
  project,
  search,
  page,
  take,
  onQueryChange,
  onRefresh,
  detailHref,
}: Props) {
  const [actionOverrides, setActionOverrides] = useState<Record<string, ContainerActionResponse>>({});
  const totalPages = Math.max(1, Math.ceil(metrics.meta.pagination.total / take));
  const currentPage = Math.min(page, totalPages);
  const pages = paginationWindow(currentPage, totalPages);

  const handleCompleted = (response: ContainerActionResponse) => {
    setActionOverrides((current) => ({ ...current, [response.container.id]: response }));
    void onRefresh();
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextSearch = String(form.get("search") || "").trim();
    const nextProject = String(form.get("project") || "").trim();
    onQueryChange({
      search: nextSearch || null,
      project: nextProject || null,
      page: null,
    });
  };

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Containers" value={formatNumber(metrics.summary.total, 0)} detail="No escopo atual" icon={<Boxes size={18} />} accent="neutral" />
        <KpiCard label="Em execucao" value={formatNumber(metrics.summary.running, 0)} detail="Estado running" icon={<PlayCircle size={18} />} accent="blue" />
        <KpiCard label="Parados" value={formatNumber(metrics.summary.stopped, 0)} detail="Estados nao running" icon={<CircleStop size={18} />} accent="neutral" />
        <KpiCard label="Saudaveis" value={formatNumber(metrics.summary.healthy, 0)} detail="Healthcheck healthy" icon={<HeartPulse size={18} />} accent="sky" />
        <KpiCard label="Com falha" value={formatNumber(metrics.summary.unhealthy, 0)} detail="Healthcheck unhealthy" icon={<ShieldAlert size={18} />} accent={metrics.summary.unhealthy > 0 ? "red" : "neutral"} />
        <KpiCard label="Desconhecidos" value={formatNumber(metrics.summary.unknown, 0)} detail="Sem health observavel" icon={<CircleHelp size={18} />} accent="neutral" />
      </section>

      <section className="panel overflow-hidden">
        <form className="container-catalog-filters" key={project + ":" + search} onSubmit={submitFilters}>
          <div className="container-state-control" role="group" aria-label="Estado dos containers">
            {(["running", "stopped", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={state === value ? "is-active" : ""}
                aria-pressed={state === value}
                onClick={() => onQueryChange({ state: value === "running" ? null : value, page: null })}
              >
                {value === "running" ? "Em execucao" : value === "stopped" ? "Parados" : "Todos"}
              </button>
            ))}
          </div>

          <div className="container-filter-fields">
            <label className="container-search-field">
              <Search size={15} aria-hidden="true" />
              <Input name="search" defaultValue={search} maxLength={100} placeholder="Buscar nome, imagem, projeto ou servico" aria-label="Buscar containers" />
            </label>
            <Input name="project" defaultValue={project} maxLength={100} placeholder="Projeto Compose exato" aria-label="Filtrar por projeto Compose" />
            <Button type="submit" variant="secondary" icon={<Search size={15} />}>Aplicar</Button>
            {search || project ? (
              <Button type="button" variant="ghost" icon={<FilterX size={15} />} onClick={() => onQueryChange({ search: null, project: null, page: null })}>Limpar</Button>
            ) : null}
          </div>
        </form>

        <div className="data-table-wrap">
          <table className="data-table analytics-table container-catalog-table min-w-[1240px]">
            <thead>
              <tr>
                <th>Container</th>
                <th>Estado</th>
                <th>Projeto / servico</th>
                <th>CPU</th>
                <th>Memoria</th>
                <th>Uptime</th>
                <th>Reinicios</th>
                <th>Ultima amostra</th>
                <th aria-label="Acoes" />
              </tr>
            </thead>
            <tbody>
              {metrics.items.map((item) => {
                const override = actionOverrides[item.id];
                const displayedItem = override ? {
                  ...item,
                  state: override.container.state,
                  health: override.container.health,
                  currentContainerId: override.container.instanceId,
                  orchestration: override.orchestration,
                } : item;
                return (
                  <ContainerRow
                    key={item.id}
                    item={displayedItem}
                    href={detailHref(item.id)}
                    onCompleted={handleCompleted}
                    onRemoved={() => void onRefresh()}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {!metrics.items.length ? <EmptyState text="Nenhum container corresponde aos filtros atuais." /> : null}

        <footer className="catalog-pagination">
          <p>
            {metrics.meta.pagination.total
              ? (metrics.meta.pagination.skip + 1) + "-" + (metrics.meta.pagination.skip + metrics.items.length) + " de " + metrics.meta.pagination.total
              : "0 resultados"}
          </p>
          <div className="catalog-page-size">
            <span>Itens por pagina</span>
            <Select value={take} onChange={(event) => onQueryChange({ take: event.target.value === "25" ? null : event.target.value, page: null })} aria-label="Itens por pagina">
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </div>
          <nav className="catalog-pages" aria-label="Paginacao dos containers">
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

function ContainerRow({
  item,
  href,
  onCompleted,
  onRemoved,
}: {
  item: ContainerCatalogItem;
  href: string;
  onCompleted: (response: ContainerActionResponse) => void;
  onRemoved: () => void;
}) {
  const status = item.state === "running" ? item.health || "up" : "down";
  return (
    <tr>
      <td>
        <Link href={href} className="table-primary container-name-link">{item.name}</Link>
        <p className="table-secondary mono" title={item.image}>{item.image}</p>
      </td>
      <td>
        <StatusBadge status={status} />
        <p className="table-secondary">{dockerStateLabel(item.state)}{item.health ? " / " + statusLabel(item.health) : ""}</p>
      </td>
      <td>
        <p className="table-primary">{item.compose?.project || "Standalone"}</p>
        <p className="table-secondary">{item.compose ? (item.compose.service || "-") + (item.compose.containerNumber ? " #" + item.compose.containerNumber : "") : "Container externo ao Compose"}</p>
      </td>
      <td>{formatPercent(item.current?.cpuPercent)}</td>
      <td>
        <p>{formatBytes(item.current?.memoryUsedBytes)}</p>
        <p className="table-secondary">{formatPercent(item.current?.memoryPercent)} de {formatBytes(item.current?.memoryLimitBytes)}</p>
      </td>
      <td>{formatDuration(item.current?.uptimeSeconds)}</td>
      <td>{formatNumber(item.current?.restartCount, 0)}</td>
      <td>
        <p>{formatDateTime(item.current?.sampledAt)}</p>
        <p className="table-secondary">{item.current ? "Worker de metricas" : "Sem amostra"}</p>
      </td>
      <td>
        <div className="container-row-actions">
          <ContainerOrchestrationActions container={item} compact onCompleted={onCompleted} onRemoved={onRemoved} />
          <Link href={href} className="icon-button" title="Abrir detalhes" aria-label={"Abrir detalhes de " + item.name}><ExternalLink size={15} /></Link>
        </div>
      </td>
    </tr>
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
