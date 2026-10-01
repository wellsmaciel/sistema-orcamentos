import { defineRailway, github, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "sfo" });
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });
  const Backend = service("Backend", {
    source: github("wellsmaciel/sistema-orcamentos", { checkSuites: true, rootDirectory: "/backend" }),
    build: { buildEnvironment: "V3", builder: "RAILPACK", watchPatterns: ["/backend/**"] },
    start: "npm start",
    healthcheck: "/health",
    preDeploy: "npm run db:migrate",
    replicas: { "sfo": 1 },
    networking: {
      privateNetworkEndpoint: "backend",
      serviceDomains: { "backend-production-4ec1.up.railway.app": {} },
    },
    env: { ANTHROPIC_API_KEY: preserve(), AUTH0_AUDIENCE: preserve(), AUTH0_DOMAIN: preserve(), CLIENT_ORIGIN_URL: preserve(), DB_HOST: preserve(), DB_NAME: preserve(), DB_PASSWORD: preserve(), DB_PORT: preserve(), DB_USER: preserve() },
  });
  const Frontend = service("Frontend", {
    source: github("wellsmaciel/sistema-orcamentos", { checkSuites: true, rootDirectory: "/frontend" }),
    build: { buildEnvironment: "V3", builder: "RAILPACK", watchPatterns: ["/frontend/**"] },
    start: "npm start",
    healthcheck: "/",
    preDeploy: "npm run build",
    replicas: { "sfo": 1 },
    networking: {
      privateNetworkEndpoint: "frontend",
      serviceDomains: { "frontend-production-dd49.up.railway.app": {} },
    },
    env: { VITE_API_BASE_URL: preserve(), VITE_AUTH0_AUDIENCE: preserve(), VITE_AUTH0_CLIENT_ID: preserve(), VITE_AUTH0_DOMAIN: preserve() },
  });

  return project("sistema-orcamentos", {
    resources: [Postgres, Backend, Frontend, postgresVolume],
  });
});
