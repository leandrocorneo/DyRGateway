"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
  LoaderCircle,
  Play,
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
  if (container.orchestration.reason === "unsupported-state") return "O estado atual do Docker nao permite iniciar ou parar este container.";
  return "Acao indisponivel para o estado atual.";
};

export default function ContainerOrchestrationActions({
  container,
  compact = false,
  disabled = false,
  onCompleted,
  onRemoved,
}: Props) {
  const [busy, setBusy] = useState<ContainerAction | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmStop) confirmButtonRef.current?.focus();
  }, [confirmStop]);

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
      setNotice({
        tone: "success",
        message: response.changed
          ? (action === "start" ? "Container iniciado." : "Container parado.")
          : (action === "start" ? "O container ja estava em execucao." : "O container ja estava parado."),
      });
      setConfirmStop(false);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) onRemoved?.();
      setNotice({ tone: "error", message: actionErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const closeModal = () => {
    if (!busy) setConfirmStop(false);
  };

  const renderAction = () => {
    const orchestration = container.orchestration;
    if (orchestration.canStart) {
      const label = busy === "start" ? "Iniciando" : "Iniciar container";
      return compact ? (
        <IconButton label={label} onClick={() => void execute("start")} disabled={disabled || busy !== null}>
          {busy === "start" ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}
        </IconButton>
      ) : (
        <Button variant="secondary" icon={busy === "start" ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />} onClick={() => void execute("start")} disabled={disabled || busy !== null}>
          {label}
        </Button>
      );
    }

    if (orchestration.canStop) {
      const label = busy === "stop" ? "Parando" : "Parar container";
      return compact ? (
        <IconButton label={label} className="danger" onClick={() => setConfirmStop(true)} disabled={disabled || busy !== null}>
          {busy === "stop" ? <LoaderCircle size={15} className="animate-spin" /> : <Square size={14} />}
        </IconButton>
      ) : (
        <Button variant="danger" icon={busy === "stop" ? <LoaderCircle size={15} className="animate-spin" /> : <Square size={14} />} onClick={() => setConfirmStop(true)} disabled={disabled || busy !== null}>
          {label}
        </Button>
      );
    }

    const reason = unavailableReason(container);
    return compact ? (
      <IconButton label={reason} disabled>
        {orchestration.protected ? <ShieldCheck size={15} /> : <TriangleAlert size={15} />}
      </IconButton>
    ) : (
      <Button variant="secondary" icon={orchestration.protected ? <ShieldCheck size={15} /> : <TriangleAlert size={15} />} disabled title={reason}>
        {orchestration.protected ? "Container protegido" : "Acao indisponivel"}
      </Button>
    );
  };

  return (
    <div className={compact ? "container-action-compact" : "container-action-detail"}>
      {renderAction()}

      {notice ? (
        <div className={"orchestration-toast " + (notice.tone === "error" ? "is-error" : "is-success")} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.tone === "error" ? <TriangleAlert size={16} /> : <span className="orchestration-toast-mark" />}
          <span>{notice.message}</span>
        </div>
      ) : null}

      {confirmStop ? (
        <div
          className="orchestration-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeModal();
          }}
        >
          <section
            className="orchestration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={"stop-container-title-" + container.id}
            aria-describedby={"stop-container-description-" + container.id}
          >
            <header className="orchestration-modal-header">
              <div>
                <p className="eyebrow">Operacao Docker</p>
                <h2 id={"stop-container-title-" + container.id}>Parar {container.name}</h2>
              </div>
              <IconButton label="Fechar confirmacao" onClick={closeModal} disabled={disabled || busy !== null}>
                <X size={16} />
              </IconButton>
            </header>

            <div className="orchestration-container-summary">
              <span className="orchestration-stop-icon"><Square size={15} /></span>
              <div>
                <strong>{container.name}</strong>
                <p>{container.image}</p>
                <small>{container.compose ? container.compose.project + " / " + (container.compose.service || "-") : "Standalone"}</small>
              </div>
            </div>

            <p id={"stop-container-description-" + container.id} className="orchestration-warning">
              O Docker tentara encerrar o processo de forma graciosa por 10 segundos. Conexoes ativas neste container podem ser interrompidas.
            </p>

            <footer className="orchestration-modal-actions">
              <Button variant="secondary" onClick={closeModal} disabled={disabled || busy !== null}>Cancelar</Button>
              <button
                ref={confirmButtonRef}
                type="button"
                className="button button-danger"
                onClick={() => void execute("stop")}
                disabled={disabled || busy !== null}
              >
                {busy === "stop" ? <LoaderCircle size={15} className="animate-spin" /> : <Square size={14} />}
                {busy === "stop" ? "Parando container" : "Parar container"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
