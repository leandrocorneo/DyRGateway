export type Application = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
};

export type Domain = {
  id: string;
  host: string;
  applicationId: string;
  createdAt: string;
};

export type Service = {
  id: string;
  applicationId: string;
  serviceTypeId: string;
  path: string;
  targetHost: string;
  targetPort: number;
  active: boolean;
  createdAt: string;
};

export type HealthStatus = {
  server: string;
  database: string;
  redis: string;
  timestamp: string;
  uptimeSeconds?: number;
  databaseLatencyMs?: number;
  redisLatencyMs?: number;
};

export type HealthLive = {
  server: string;
  timestamp: string;
  uptimeSeconds: number;
};

export type HealthReady = {
  server: string;
  database: string;
  redis: string;
  databaseLatencyMs: number;
  redisLatencyMs: number;
  timestamp: string;
};

export type ResolvedApplication = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type ResolvedService = {
  id: string;
  applicationId: string;
  serviceTypeId: string;
  serviceType: {
    id: string;
    description: string;
  };
  path: string;
  targetHost: string;
  targetPort: number;
  active: boolean;
};

export type ResolvedHost = {
  host: string;
  domainId: string;
  application: ResolvedApplication;
  services: ResolvedService[];
};

export type ResolvedTarget = {
  host: string;
  path: string;
  domainId: string;
  application: ResolvedApplication;
  service: ResolvedService;
};

export type MonitoringRange = "15m" | "1h" | "6h" | "24h" | "7d" | "15d";
export type CapabilityState = "supported" | "unsupported" | "unknown";
export type MetricStatus = "up" | "down" | "healthy" | "unhealthy" | "starting" | "unknown" | string;

export type MonitoringMeta = {
  range: MonitoringRange;
  from: string;
  to: string;
  stepSeconds: number;
  partial: boolean;
  capabilities: {
    replicaLag: CapabilityState;
    hostDowntime: CapabilityState;
    percentiles: CapabilityState;
  };
};

export type LatencySummary = {
  count: number;
  averageMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  minMs: number | null;
  maxMs: number | null;
};

export type ApiMetricAggregate = {
  requestCount: number;
  status2xx: number;
  status4xx: number;
  status5xx: number;
  timeoutCount: number;
  errorCount: number;
  errorRate: number;
  clientErrorRate: number;
  concurrentMax: number;
  latency: LatencySummary;
  ttfb: LatencySummary;
};

export type ApiMetricPoint = ApiMetricAggregate & {
  timestamp: string;
  rps: number;
};

export type ApiEndpointMetric = ApiMetricAggregate & {
  endpoint: string;
};

export type ApiMonitoringResponse = {
  meta: MonitoringMeta;
  current: ApiMetricPoint | null;
  summary: ApiMetricAggregate & { averageRps: number };
  series: ApiMetricPoint[];
  breakdown: ApiEndpointMetric[];
};

export type InfrastructureSummary = {
  samples: number;
  components: number;
};

export type SlowQueryMetric = {
  queryId: string;
  calls: number | string;
  meanMs: number;
  maxMs: number;
  totalMs: number;
};

export type ContainerVolumeMetric = {
  name: string;
  destination: string;
  usedBytes: number | null;
};

export type InfrastructureMetrics = {
  latencyMs?: number | null;
  statusCode?: number | null;
  memoryUsedBytes?: number | null;
  memoryRssBytes?: number | null;
  memoryLimitBytes?: number | null;
  memoryPercent?: number | null;
  hits?: number;
  misses?: number;
  hitRate?: number | null;
  evictions?: number;
  evictionsPerSecond?: number;
  connectedClients?: number;
  blockedClients?: number;
  operationsPerSecond?: number;
  commandsPerSecond?: number;
  rejectedConnections?: number;
  totalErrorReplies?: number;
  queriesPerSecond?: number;
  transactionsPerSecond?: number;
  connectionsUsed?: number;
  connectionsMax?: number;
  connectionPercent?: number | null;
  deadlocks?: number;
  deadlocksDelta?: number;
  cacheHitRate?: number | null;
  databaseSizeBytes?: number;
  blockReadTimeMs?: number;
  blockWriteTimeMs?: number;
  slowQueries?: SlowQueryMetric[];
  replicaLag?: number | null;
  containerId?: string;
  name?: string;
  uptimeSeconds?: number;
  restartCount?: number;
  cpuPercent?: number;
  pids?: number;
  networkRxBytes?: number;
  networkTxBytes?: number;
  blockReadBytes?: number;
  blockWriteBytes?: number;
  writableLayerBytes?: number;
  volumes?: ContainerVolumeMetric[];
  collectionError?: boolean;
};

export type InfrastructureSnapshot = InfrastructureMetrics & {
  component: string;
  status: MetricStatus;
  sampledAt: string;
};

export type InfrastructureSeriesComponent = InfrastructureMetrics & {
  status: MetricStatus;
};

export type InfrastructureSeriesPoint = {
  timestamp: string;
  components: Record<string, InfrastructureSeriesComponent>;
};

export type DependencySummary = {
  calls: number;
  errors: number;
  slow: number;
  errorRate: number;
  latency: LatencySummary;
  replicaLag?: number | null;
};

export type DependencyBreakdown = {
  operation: string;
  calls: number;
  errors: number;
  slow: number;
  latency: LatencySummary;
};

export type InfrastructureMonitoringResponse = {
  meta: MonitoringMeta;
  current: InfrastructureSnapshot | Record<string, InfrastructureSnapshot> | null;
  summary: InfrastructureSummary;
  series: InfrastructureSeriesPoint[];
  breakdown: InfrastructureSnapshot[];
};

export type RedisMonitoringResponse = Omit<InfrastructureMonitoringResponse, "summary" | "breakdown"> & {
  summary: { infrastructure: InfrastructureSummary; commands: DependencySummary };
  breakdown: DependencyBreakdown[];
};

export type DatabaseMonitoringResponse = Omit<InfrastructureMonitoringResponse, "summary" | "breakdown"> & {
  summary: { infrastructure: InfrastructureSummary; queries: DependencySummary };
  breakdown: DependencyBreakdown[];
};

export type MonitoringOverviewResponse = {
  meta: MonitoringMeta;
  current: {
    api: ApiMetricPoint | null;
    infrastructure: Record<string, InfrastructureSnapshot>;
  };
  summary: {
    api: ApiMetricAggregate & { averageRps: number };
    infrastructure: InfrastructureSummary;
  };
  series: ApiMetricPoint[];
  breakdown: InfrastructureSnapshot[];
};