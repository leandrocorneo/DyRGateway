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
