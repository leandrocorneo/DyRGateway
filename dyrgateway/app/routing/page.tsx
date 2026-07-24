"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, CheckCircle2, Globe2, LoaderCircle, RefreshCw, Route, ServerCog, ShieldAlert, TriangleAlert } from "lucide-react";
import ContainerOrchestrationActions from "@/app/components/ContainerOrchestrationActions";
import { KpiCard, StatusBadge } from "@/app/components/monitoring";
import { Button, EmptyState, Feedback, PageHeader, Select } from "@/app/components/ui";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/errors";
import { dockerStateLabel, formatContainerPorts, formatDateTime, statusLabel } from "@/lib/monitoring";
import type { RoutingContainerSummary, RoutingOverviewEntry, RoutingOverviewResponse, RoutingTlsStatus } from "@/lib/types";

const tlsLabel: Record<RoutingTlsStatus, string> = {
  valid: "Valido",
  invalid: "Invalido",
  expired: "Expirado",
  unavailable: "Indisponivel",
  "not-applicable": "Nao avaliado",
};

const tlsClass = (status: RoutingTlsStatus) => {
  if (status === "valid") return "badge badge-success";
  if (status === "not-applicable") return "badge badge-neutral";
  return "badge routing-badge-danger";
};

const containerStatus = (container: RoutingContainerSummary | null) => {
  if (!container) return "unknown";
  return container.state === "running" ? container.health || "up" : "down";
};

export default function RoutingPage() {
  const [data, setData] = useState<RoutingOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<RoutingOverviewResponse>("/routing/overview");
      setData(response.data);
    } catch (err) {
      setError(apiErrorMessage(err, "Nao foi possivel carregar dominios e proxy."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const containers = useMemo(() => data?.containers || [], [data]);
  const containerById = useMemo(() => new Map(containers.map((container) => [container.id, container])), [containers]);

  const updatePreference = async (entry: RoutingOverviewEntry, containerId: string) => {
    if (!entry.service) return;
    setSavingServiceId(entry.service.id);
    setMessage("");
    setError("");
    try {
      await api.put("/routing/preferences/" + encodeURIComponent(entry.service.id), { containerId: containerId || null });
      setMessage(containerId ? "Preferencia visual salva." : "Preferencia visual removida.");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Nao foi possivel salvar a preferencia."));
    } finally {
      setSavingServiceId(null);
    }
  };

  const onContainerCompleted = () => void load();

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Roteamento"
        title="Dominios e proxy"
        description="Visao operacional dos hosts, rotas, targets, containers e TLS observados pela API."
        actions={<Button variant="secondary" icon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />} onClick={load} disabled={loading}>Atualizar</Button>}
      />
      <Feedback message={message} error={error} />

      {data ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <KpiCard label="Dominios" value={data.summary.domains} detail="hosts cadastrados" icon={<Globe2 size={18} />} accent="blue" />
          <KpiCard label="Rotas" value={data.summary.routes} detail="servicos HTTP" icon={<Route size={18} />} accent="neutral" />
          <KpiCard label="TLS valido" value={data.summary.tlsValid} detail={data.meta.tlsBaseDomain} icon={<CheckCircle2 size={18} />} accent="sky" />
          <KpiCard label="TLS com problema" value={data.summary.tlsProblems} detail="checagem HTTPS" icon={<ShieldAlert size={18} />} accent={data.summary.tlsProblems ? "red" : "neutral"} />
          <KpiCard label="Sugeridos" value={data.summary.suggested} detail="por target" icon={<ServerCog size={18} />} accent="neutral" />
          <KpiCard label="Preferidos" value={data.summary.selected} detail="escolha visual" icon={<Boxes size={18} />} accent="neutral" />
        </section>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div><h2 className="panel-title">Mapa de entrada</h2><p className="panel-subtitle">{data ? `${data.entries.length} vinculos avaliados` : "Carregando vinculos"}</p></div>
          {loading ? <LoaderCircle size={17} className="animate-spin text-[var(--accent)]" /> : <Globe2 size={17} className="text-[var(--accent)]" />}
        </div>
        {!data?.entries.length ? <EmptyState loading={loading} text="Nenhum dominio com rota foi encontrado." /> : (
          <div className="data-table-wrap">
            <table className="data-table routing-table min-w-[1180px]">
              <thead><tr><th>Dominio</th><th>Aplicacao / rota</th><th>Target</th><th>Container</th><th>Portas</th><th>Estado</th><th className="text-right">Acoes</th></tr></thead>
              <tbody>{data.entries.map((entry) => {
                const activeContainer = entry.selectedContainer || entry.suggestedContainer;
                const selectedId = entry.selectedContainer?.id || "";
                const status = containerStatus(activeContainer);
                return (
                  <tr key={entry.domain.id + ":" + (entry.service?.id || "domain")}>
                    <td>
                      <div className="routing-domain-cell">
                        <span className="routing-domain-icon"><Globe2 size={17} /></span>
                        <div><p className="table-primary">{entry.domain.host}</p><p className="table-secondary">{entry.tls.validTo ? "Expira " + formatDateTime(entry.tls.validTo) : entry.tls.error || "HTTPS"}</p></div>
                      </div>
                      <span className={tlsClass(entry.tls.status)}><span className="badge-dot" />{tlsLabel[entry.tls.status]}</span>
                    </td>
                    <td><p className="table-primary">{entry.application.name}</p><p className="table-secondary">{entry.service ? entry.service.path : "Sem servico ativo"}</p></td>
                    <td><p className="table-primary mono">{entry.target ? `${entry.target.host}:${entry.target.port}` : "-"}</p><p className="table-secondary">{entry.service?.active ? "Ativo" : "Inativo"}</p></td>
                    <td>
                      {entry.service ? (
                        <div className="routing-container-select">
                          <Select value={selectedId} onChange={(event) => void updatePreference(entry, event.target.value)} disabled={savingServiceId === entry.service.id} aria-label={"Container preferido para " + entry.domain.host + entry.service.path}>
                            <option value="">{entry.suggestedContainer ? "Sugestao: " + entry.suggestedContainer.name : "Sem preferencia"}</option>
                            {containers.map((container) => <option key={container.id} value={container.id}>{container.name}</option>)}
                          </Select>
                          <p className="table-secondary">{entry.matchSource === "preference" ? "Preferencia visual" : entry.matchSource === "suggestion" ? "Sugerido por target" : "Sem sugestao"}</p>
                        </div>
                      ) : <span className="table-secondary">-</span>}
                    </td>
                    <td><p className="table-primary mono" title={formatContainerPorts(activeContainer?.ports, 6)}>{formatContainerPorts(activeContainer?.ports)}</p><p className="table-secondary">{activeContainer?.image || "-"}</p></td>
                    <td>{activeContainer ? <div className="routing-state-cell"><StatusBadge status={status} /><span>{dockerStateLabel(activeContainer.state)}{activeContainer.health ? " / " + statusLabel(activeContainer.health) : ""}</span></div> : <span className="badge badge-neutral"><span className="badge-dot" />Sem container</span>}</td>
                    <td>
                      <div className="table-actions">
                        {activeContainer ? <ContainerOrchestrationActions container={containerById.get(activeContainer.id) || activeContainer} compact onCompleted={onContainerCompleted} onRemoved={load} /> : <TriangleAlert size={16} className="text-[var(--muted)]" />}
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}