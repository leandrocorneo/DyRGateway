"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { LoaderCircle, Play, ShieldCheck, Square, TriangleAlert } from "lucide-react";
import { api } from "@/lib/apiClient";
import type {
  ContainerAction,
  ContainerComposeGroupItem,
  ContainerGroupActionResponse,
} from "@/lib/types";
import { IconButton } from "./ui";

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
      return "Este projeto pertence a stack protegida do DyRGateway.";
    case 404:
      return "O projeto nao existe mais no Docker daemon.";
    case 409:
      return "Um container deste projeto ja possui uma acao em andamento.";
    case 502:
      return "O Docker daemon nao aceitou a operacao do projeto.";
    case 504:
      return "A descoberta do projeto excedeu o tempo limite.";
    default:
      return "Nao foi possivel concluir a acao do projeto.";
  }
};

export default function ContainerGroupActions({ group, disabled = false, onBusyChange, onCompleted }: Props) {
  const [busy, setBusy] = useState<ContainerAction | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

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
      setNotice({
        tone: failed ? "error" : "success",
        message: `${changed} alterado(s), ${unchanged} inalterado(s), ${failed} com falha.`,
      });
    } catch (error) {
      setNotice({ tone: "error", message: errorMessage(error) });
    } finally {
      setBusy(null);
      onBusyChange(false);
    }
  };

  if (group.orchestration.protected) {
    return (
      <div className="container-group-actions">
        <IconButton label="Projeto protegido: a stack DyRGateway nao pode ser operada pelo painel" disabled>
          <ShieldCheck size={15} />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="container-group-actions">
      {group.orchestration.canStart ? (
        <IconButton label="Iniciar containers parados do projeto" onClick={() => void execute("start")} disabled={disabled || busy !== null}>
          {busy === "start" ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}
        </IconButton>
      ) : null}
      {group.orchestration.canStop ? (
        <IconButton label="Parar containers em execucao do projeto" className="danger" onClick={() => void execute("stop")} disabled={disabled || busy !== null}>
          {busy === "stop" ? <LoaderCircle size={15} className="animate-spin" /> : <Square size={14} />}
        </IconButton>
      ) : null}
      {!group.orchestration.canStart && !group.orchestration.canStop ? (
        <IconButton label="Nenhuma acao disponivel para os estados atuais" disabled><TriangleAlert size={15} /></IconButton>
      ) : null}
      {notice ? (
        <div className={"orchestration-toast " + (notice.tone === "error" ? "is-error" : "is-success")} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.tone === "error" ? <TriangleAlert size={16} /> : <span className="orchestration-toast-mark" />}
          <span>{notice.message}</span>
        </div>
      ) : null}
    </div>
  );
}
