"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Hammer, LoaderCircle, Play, RotateCcw, ShieldCheck, Square, TriangleAlert, UploadCloud, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import type {
  ContainerAction,
  ContainerComposeGroupItem,
  ContainerGroupActionResponse,
} from "@/lib/types";
import { Button, IconButton } from "./ui";

type Props = {
  group: Pick<ContainerComposeGroupItem, "id" | "project" | "orchestration">;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
  onCompleted: (response: ContainerGroupActionResponse) => void;
};

type Notice = { tone: "success" | "error"; message: string };

const errorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) return "Nao foi possivel concluir a acao do projeto.";
  switch (error.response?.status) {
    case 403:
      return error.response.data?.message || "Este projeto nao esta autorizado para esta operacao.";
    case 404:
      return "O projeto nao existe mais no Docker daemon.";
    case 409:
      return "Um container deste projeto ja possui uma acao em andamento.";
    case 502:
      return "O Docker ou o runner Compose nao aceitou a operacao.";
    case 504:
      return "A operacao excedeu o tempo limite.";
    default:
      return "Nao foi possivel concluir a acao do projeto.";
  }
};

const actionLabel = (action: ContainerAction, busy = false) => {
  if (action === "start") return busy ? "Iniciando" : "Iniciar projeto";
  if (action === "stop") return busy ? "Parando" : "Parar projeto";
  if (action === "restart") return busy ? "Reiniciando" : "Reiniciar projeto";
  if (action === "rebuild") return busy ? "Rebuilding" : "Rebuild";
  if (action === "redeploy") return busy ? "Redeploying" : "Redeploy";
  return action;
};

const actionIcon = (action: ContainerAction, busy: ContainerAction | null) => {
  if (busy === action) return <LoaderCircle size={15} className="animate-spin" />;
  if (action === "start") return <Play size={15} />;
  if (action === "stop") return <Square size={14} />;
  if (action === "restart") return <RotateCcw size={15} />;
  if (action === "rebuild") return <Hammer size={15} />;
  return <UploadCloud size={15} />;
};

const warningText = (action: ContainerAction) => {
  if (action === "restart") return "Os containers em execucao deste projeto serao reiniciados. Conexoes ativas podem cair durante a operacao.";
  if (action === "rebuild") return "O projeto executara build e up -d. Containers podem ser recriados e conexoes ativas podem ser interrompidas.";
  if (action === "redeploy") return "O projeto executara pull e up -d. Imagens podem mudar e containers podem ser recriados.";
  return "Containers em execucao deste projeto serao encerrados de forma graciosa. Conexoes ativas podem ser interrompidas.";
};

export default function ContainerGroupActions({ group, disabled = false, onBusyChange, onCompleted }: Props) {
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
    onBusyChange(true);
    try {
      const response = (await api.post<ContainerGroupActionResponse>(
        "/monitoring/container-groups/" + encodeURIComponent(group.id) + "/" + action,
      )).data;
      onCompleted(response);
      const changed = response.results.filter((item) => item.status === "changed").length;
      const unchanged = response.results.filter((item) => item.status === "unchanged").length;
      const failed = response.results.filter((item) => item.status === "failed").length;
      setNotice({ tone: failed ? "error" : "success", message: `${changed} alterado(s), ${unchanged} inalterado(s), ${failed} com falha.` });
      setConfirmAction(null);
    } catch (error) {
      setNotice({ tone: "error", message: errorMessage(error) });
    } finally {
      setBusy(null);
      onBusyChange(false);
    }
  };

  const closeModal = () => {
    if (!busy) setConfirmAction(null);
  };

  if (group.orchestration.protected) {
    return (
      <div className="container-group-actions">
        <IconButton label="Projeto protegido: a stack DyRGateway nao pode ser operada pelo painel" disabled><ShieldCheck size={15} /></IconButton>
      </div>
    );
  }

  const buttons: Array<{ action: ContainerAction; danger?: boolean }> = [];
  if (group.orchestration.canStart) buttons.push({ action: "start" });
  if (group.orchestration.canStop) buttons.push({ action: "stop", danger: true });
  if (group.orchestration.canRestart) buttons.push({ action: "restart", danger: true });
  if (group.orchestration.canRebuild) buttons.push({ action: "rebuild", danger: true });
  if (group.orchestration.canRedeploy) buttons.push({ action: "redeploy", danger: true });

  return (
    <div className="container-group-actions">
      {buttons.map(({ action, danger }) => (
        <IconButton key={action} label={actionLabel(action, busy === action)} className={danger ? "danger" : ""} onClick={() => action === "start" ? void execute(action) : setConfirmAction(action)} disabled={disabled || busy !== null}>
          {actionIcon(action, busy)}
        </IconButton>
      ))}
      {!buttons.length ? <IconButton label="Nenhuma acao disponivel para os estados atuais ou projeto sem cadastro operacional" disabled><TriangleAlert size={15} /></IconButton> : null}
      {notice ? (
        <div className={"orchestration-toast " + (notice.tone === "error" ? "is-error" : "is-success")} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.tone === "error" ? <TriangleAlert size={16} /> : <span className="orchestration-toast-mark" />}
          <span>{notice.message}</span>
        </div>
      ) : null}
      {confirmAction ? (
        <div className="orchestration-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }} onKeyDown={(event) => { if (event.key === "Escape") closeModal(); }}>
          <section className="orchestration-modal" role="dialog" aria-modal="true" aria-labelledby={"group-action-title-" + group.id} aria-describedby={"group-action-description-" + group.id}>
            <header className="orchestration-modal-header">
              <div><p className="eyebrow">Projeto Compose</p><h2 id={"group-action-title-" + group.id}>{actionLabel(confirmAction)}?</h2></div>
              <IconButton label="Fechar confirmacao" onClick={closeModal} disabled={disabled || busy !== null}><X size={16} /></IconButton>
            </header>
            <div className="orchestration-container-summary">
              <span className="orchestration-stop-icon">{actionIcon(confirmAction, null)}</span>
              <div><strong>{group.project}</strong><p>Docker Compose</p><small>Acao autorizada pela API</small></div>
            </div>
            <p id={"group-action-description-" + group.id} className="orchestration-warning">{warningText(confirmAction)}</p>
            <footer className="orchestration-modal-actions">
              <Button variant="secondary" onClick={closeModal} disabled={disabled || busy !== null}>Cancelar</Button>
              <button ref={confirmButtonRef} type="button" className="button button-danger" onClick={() => void execute(confirmAction)} disabled={disabled || busy !== null}>{actionIcon(confirmAction, busy)}{actionLabel(confirmAction, busy === confirmAction)}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}