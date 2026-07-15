import type { InfrastructureSnapshot, MetricStatus, MonitoringRange } from "./types";

export const monitoringRanges: Array<{ value: MonitoringRange; label: string }> = [
  { value: "15m", label: "15 min" },
  { value: "1h", label: "1 h" },
  { value: "6h", label: "6 h" },
  { value: "24h", label: "24 h" },
  { value: "7d", label: "7 d" },
  { value: "15d", label: "15 d" },
];

export function isMonitoringRange(value: string | null): value is MonitoringRange {
  return monitoringRanges.some((item) => item.value === value);
}

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(value);
}

export function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number | null | undefined, ratio = false) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const normalized = ratio ? value * 100 : value;
  return `${formatNumber(normalized, normalized < 1 ? 2 : 1)}%`;
}

export function formatLatency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return value >= 1000 ? `${formatNumber(value / 1000, 2)} s` : `${formatNumber(value, value < 10 ? 2 : 1)} ms`;
}

export function formatBytes(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(Math.abs(value)) / Math.log(1024)), units.length - 1);
  return `${formatNumber(value / 1024 ** index, 1)} ${units[index]}`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function formatChartTime(value: string | number, range: MonitoringRange) {
  const date = new Date(value);
  const longRange = range === "7d" || range === "15d";
  return new Intl.DateTimeFormat("pt-BR", longRange
    ? { day: "2-digit", month: "2-digit", hour: "2-digit" }
    : { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sem leitura";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

export function addTimeGaps<T extends { timestamp: string }>(items: T[], stepSeconds: number): Array<T | { timestamp: string }> {
  if (items.length < 2 || stepSeconds <= 0) return items;
  const result: Array<T | { timestamp: string }> = [];
  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    result.push(current);
    const next = items[index + 1];
    if (!next) continue;
    const currentTime = new Date(current.timestamp).getTime();
    const nextTime = new Date(next.timestamp).getTime();
    if (nextTime - currentTime > stepSeconds * 1500) {
      result.push({ timestamp: new Date(currentTime + stepSeconds * 1000).toISOString() });
    }
  }
  return result;
}

export function statusLabel(status: MetricStatus | null | undefined) {
  if (status === "up" || status === "healthy" || status === "ok") return "Disponivel";
  if (status === "down" || status === "unhealthy" || status === "error") return "Indisponivel";
  if (status === "starting") return "Inicializando";
  return "Desconhecido";
}

export function statusTone(status: MetricStatus | null | undefined) {
  if (status === "up" || status === "healthy" || status === "ok") return "status-up";
  if (status === "down" || status === "unhealthy" || status === "error") return "status-down";
  if (status === "starting") return "status-warning";
  return "status-unknown";
}

export function componentLabel(component: string) {
  const labels: Record<string, string> = {
    api: "API",
    database: "PostgreSQL",
    redis: "Redis",
  };
  return labels[component] || component.replace("container:", "");
}

export function asSnapshot(value: InfrastructureSnapshot | Record<string, InfrastructureSnapshot> | null) {
  if (!value || !("component" in value)) return null;
  return value as InfrastructureSnapshot;
}

export function dockerStateLabel(state: string | null | undefined) {
  const labels: Record<string, string> = {
    running: "Em execucao",
    exited: "Parado",
    created: "Criado",
    restarting: "Reiniciando",
    paused: "Pausado",
    removing: "Removendo",
    dead: "Inativo",
  };
  if (!state) return "Desconhecido";
  return labels[state.toLowerCase()] || state;
}

export function containerIdentityLabel(source: string | null | undefined) {
  if (source === "compose") return "Docker Compose";
  if (source === "name") return "Nome do container";
  return source || "Desconhecida";
}

export function shortContainerId(value: string | null | undefined) {
  if (!value) return "-";
  return value.length > 12 ? value.slice(0, 12) : value;
}
