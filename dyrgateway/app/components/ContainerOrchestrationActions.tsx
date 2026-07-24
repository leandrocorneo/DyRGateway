"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
  LoaderCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";
import { api } from "@/lib/apiClient";
import type {
  ContainerAction,
  ContainerActionResponse,
  MonitoredContainer,
} from "@/lib/types";
import { Button, IconButton } from "./ui";

type Props = {
  container: Pick<MonitoredContainer, "id" | "name" | "image" | "compose" | "state" | "orchestration">;
  compact?: boolean;
  disabled?: boolean;
  onCompleted: (response: ContainerActionResponse) => void;
  onRemoved?: () => void;
};

type Notice = { tone: "success" | "error"; message: string };

const actionErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) return "Nao foi possivel concluir a acao.";
  switch (error.response?.status) {
    case 403:
      return "Este container pertence a stack protegida do DyRGateway.";
    case 404:
      return "O container foi removido antes da operacao.";
    case 409:
      return "O estado do container mudou ou outra acao ainda esta em andamento.";
    case 502:
      return "O Docker daemon nao aceitou a operacao.";
    case 504:
      return "A operacao excedeu o tempo limite configurado.";
    default:
      return "Nao foi possivel concluir a acao.";
  }
};

const unavailableReason = (container: Props["container"]) => {
  if (container.orchestration.protected) return "Container protegido: a stack DyRGateway nao pode ser interrompida pelo painel.";
  if (container.orchestration.reason === "unsupported-state") return "O estado atual do Docker nao permite operar este container.";
  return "Acao indisponivel para o estado atual.";
};

const actionLabel = (action: ContainerAction, busy = false) => {
  if (action === "start") return busy ? "Iniciando" : "Iniciar container";
  if (action === "stop") return busy ? "Parando" : "Parar container";
  if (action === "restart") return busy ? "Reiniciando" : "Reiniciar container";
  return action;
};

const actionIcon = (action: ContainerAction, busy: ContainerAction | null, size = 15) => {
  if (busy === action) return <LoaderCircle size={size} className="animate-spin" />;
  if (action === "start") return <Play size={size} />;
  if (action === "restart") return <RotateCcw size={size} />;
  return <Square size={size === 15 ? 14 : size} />;
};

const successMessage = (action: ContainerAction, changed: boolean) => {
  if (action === "start") return changed ? "Container iniciado." : "O container ja estava em execucao.";
  if (action === "stop") return changed ? "Container parado." : "O container ja estava parado.";
  if (action === "restart") return changed ? "Container reiniciado." : "O container nao precisou ser reiniciado.";
  return "Acao concluida.";
};

export default function ContainerOrchestrationActions({
  container,
  compact = false,
  disabled = false,
  onCompleted,
  onRemoved,
}: Props) {
  const [busy, setBusy] = useState<ContainerAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<ContainerAction | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmAction) confirmButtonRef.current?.focus();
  }, [confirmAction]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const execute = async (action: ContainerAction) => {
    setBusy(action);
    setNotice(null);
    try {
      const response = (await api.post<ContainerActionResponse>(
        "/monitoring/containers/" + encodeURIComponent(container.id) + "/" + action,
      )).data;
      onCompleted(response);
      setNotice({ tone: "success", message: successMessage(action, response.changed) });
      setConfirmAction(null);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) onRemoved?.();
      setNotice({ tone: "error", message: actionErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const closeModal = () => {
    if (!busy) setConfirmAction(null);
  };

  const renderButton = (action: ContainerAction, danger = false) => {
    const label = actionLabel(action, busy === action);
    const onClick = action === "start" ? () => void execute(action) : () => setConfirmAction(action);
    return compact ? (
      <IconButton key={action} label={label} className={danger ? "danger" : ""} onClick={onClick} disabled={disabled || busy !== null}>
        {actionIcon(action, busy)}
      </IconButton>
    ) : (
      <Button key={action} variant={danger ? "danger" : "secondary"} icon={actionIcon(action, busy)} onClick={onClick} disabled={disabled || busy !== null}>
        {label}
      </Button>
    );
  };

  const actions = [];
  if (container.orchestration.canStart) actions.push(renderButton("start"));
  if (container.orchestration.canStop) actions.push(renderButton("stop", true));
  if (container.orchestration.canRestart) actions.push(renderButton("restart", true));

  const reason = unavailableReason(container);

  return (
    <div className={compact ? "container-action-compact" : "container-action-detail"}>
      {actions.length ? actions : compact ? (
        <IconButton label={reason} disabled>
          {container.orchestration.protected ? <ShieldCheck size={15} /> : <TriangleAlert size={15} />}
        </IconButton>
      ) : (
        <Button variant="secondary" icon={container.orchestration.protected ? <ShieldCheck size={15} /> : <TriangleAlert size={15} />} disabled title={reason}>
          {container.orchestration.protected ? "Container protegido" : "Acao indisponivel"}
        </Button>
      )}

      {notice ? (
        <div className={"orchestration-toast " + (notice.tone === "error" ? "is-error" : "is-success")} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.tone === "error" ? <TriangleAlert size={16} /> : <span className="orchestration-toast-mark" />}
          <span>{notice.message}</span>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="orchestration-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }} onKeyDown={(event) => { if (event.key === "Escape") closeModal(); }}>
          <section className="orchestration-modal" role="dialog" aria-modal="true" aria-labelledby={"container-action-title-" + container.id} aria-describedby={"container-action-description-" + container.id}>
            <header className="orchestration-modal-header">
              <div>
                <p className="eyebrow">Operacao Docker</p>
                <h2 id={"container-action-title-" + container.id}>{actionLabel(confirmAction)}?</h2>
              </div>
              <IconButton label="Fechar confirmacao" onClick={closeModal} disabled={disabled || busy !== null}><X size={16} /></IconButton>
            </header>
            <div className="orchestration-container-summary">
              <span className="orchestration-stop-icon">{confirmAction === "restart" ? <RotateCcw size={15} /> : <Square size={15} />}</span>
              <div>
                <strong>{container.name}</strong>
                <p>{container.image}</p>
                <small>{container.compose ? container.compose.project + " / " + (container.compose.service || "-") : "Standalone"}</small>
              </div>
            </div>
            <p id={"container-action-description-" + container.id} className="orchestration-warning">
              {confirmAction === "restart" ? "O Docker reiniciara este container. Conexoes ativas podem ser interrompidas durante a recriacao do processo." : "O Docker tentara encerrar o processo de forma graciosa. Conexoes ativas neste container podem ser interrompidas."}
            </p>
            <footer className="orchestration-modal-actions">
              <Button variant="secondary" onClick={closeModal} disabled={disabled || busy !== null}>Cancelar</Button>
              <button ref={confirmButtonRef} type="button" className="button button-danger" onClick={() => void execute(confirmAction)} disabled={disabled || busy !== null}>
                {actionIcon(confirmAction, busy)}{actionLabel(confirmAction, busy === confirmAction)}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}