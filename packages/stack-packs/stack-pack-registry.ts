/**
 * Stack Pack Registry — Phase 5
 *
 * Central registry for production-ready, opinionated templates.
 * Each stack pack includes scaffold, build/test harness, security config,
 * observability hooks, and deployment target configuration.
 */

export interface StackPack {
  id: string;
  name: string;
  language: string;
  framework: string;
  description: string;
  buildTool: string;
  testFramework: string;
  linter: string;
  formatter: string;
  dockerSupport: boolean;
  kubernetesSupport: boolean;
  serverlessSupport: boolean;
  dependencyPolicy: DependencyPolicy;
  testStrategy: TestStrategy;
  securityDefaults: SecurityDefaults;
  deploymentTargets: DeploymentTarget[];
  scaffoldFiles: ScaffoldFile[];
  observabilityHooks: ObservabilityHook[];
}

export interface DependencyPolicy {
  lockfileRequired: boolean;
  auditOnInstall: boolean;
  allowedLicenses: string[];
  maxVulnerabilitySeverity: "critical" | "high" | "medium" | "low";
}

export interface TestStrategy {
  unitTestCommand: string;
  integrationTestCommand: string;
  coverageCommand: string;
  minCoveragePercent: number;
  e2eCommand?: string;
}

export interface SecurityDefaults {
  staticAnalysisCommand: string;
  dependencyAuditCommand: string;
  secretScanEnabled: boolean;
  helmSecurityContext?: Record<string, unknown>;
}

export interface DeploymentTarget {
  type: "kubernetes" | "serverless";
  cloud: "azure" | "aws";
  service: string;
}

export interface ScaffoldFile {
  path: string;
  template: string;
}

export interface ObservabilityHook {
  type: "traces" | "metrics" | "logs";
  library: string;
  setupInstructions: string;
}

export class StackPackRegistry {
  private packs: Map<string, StackPack> = new Map();

  constructor() {
    // Register all default stack packs
    for (const pack of DEFAULT_STACK_PACKS) {
      this.packs.set(pack.id, pack);
    }
  }

  get(id: string): StackPack | undefined {
    return this.packs.get(id);
  }

  getAll(): StackPack[] {
    return Array.from(this.packs.values());
  }

  register(pack: StackPack): void {
    this.packs.set(pack.id, pack);
  }

  /**
   * Generate scaffold files for a new service
   */
  generateScaffold(
    packId: string,
    serviceName: string,
    outputPath: string
  ): { path: string; content: string }[] {
    const pack = this.packs.get(packId);
    if (!pack) throw new Error(`Stack pack not found: ${packId}`);

    return pack.scaffoldFiles.map((file) => ({
      path: `${outputPath}/${file.path}`,
      content: file.template
        .replace(/\{\{serviceName\}\}/g, serviceName)
        .replace(/\{\{SERVICE_NAME\}\}/g, serviceName.toUpperCase())
        .replace(/\{\{service_name\}\}/g, serviceName.toLowerCase().replace(/[^a-z0-9]/g, "_")),
    }));
  }
}

// ── Default Stack Packs ──

const DEFAULT_STACK_PACKS: StackPack[] = [
  // 1. TypeScript + React + Next.js
  {
    id: "typescript-react-nextjs",
    name: "TypeScript + React + Next.js",
    language: "TypeScript",
    framework: "Next.js",
    description: "Full-stack web application with React frontend and Next.js API routes",
    buildTool: "npm",
    testFramework: "vitest",
    linter: "eslint",
    formatter: "prettier",
    dockerSupport: true,
    kubernetesSupport: true,
    serverlessSupport: true,
    dependencyPolicy: {
      lockfileRequired: true,
      auditOnInstall: true,
      allowedLicenses: ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"],
      maxVulnerabilitySeverity: "high",
    },
    testStrategy: {
      unitTestCommand: "npx vitest run",
      integrationTestCommand: "npx vitest run --config vitest.integration.config.ts",
      coverageCommand: "npx vitest run --coverage",
      minCoveragePercent: 80,
      e2eCommand: "npx playwright test",
    },
    securityDefaults: {
      staticAnalysisCommand: "npx eslint src/ --ext .ts,.tsx",
      dependencyAuditCommand: "npm audit --audit-level=high",
      secretScanEnabled: true,
    },
    deploymentTargets: [
      { type: "kubernetes", cloud: "azure", service: "AKS" },
      { type: "kubernetes", cloud: "aws", service: "EKS" },
      { type: "serverless", cloud: "azure", service: "Azure Functions" },
      { type: "serverless", cloud: "aws", service: "AWS Lambda" },
    ],
    observabilityHooks: [
      { type: "traces", library: "@opentelemetry/sdk-trace-node", setupInstructions: "Initialize OTel SDK in instrumentation.ts" },
      { type: "metrics", library: "@opentelemetry/sdk-metrics", setupInstructions: "Configure metrics exporter in instrumentation.ts" },
      { type: "logs", library: "pino", setupInstructions: "Use pino logger with OpenTelemetry log bridge" },
    ],
    scaffoldFiles: [
      {
        path: "package.json",
        template: `{
  "name": "{{service_name}}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src/ --ext .ts,.tsx",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "eslint": "^9.0.0"
  }
}`,
      },
      {
        path: "tsconfig.json",
        template: `{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "incremental": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`,
      },
      {
        path: "Dockerfile",
        template: `FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["npm", "start"]`,
      },
      {
        path: "k8s/deployment.yaml",
        template: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{service_name}}
  labels:
    app: {{service_name}}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: {{service_name}}
  template:
    metadata:
      labels:
        app: {{service_name}}
    spec:
      containers:
        - name: {{service_name}}
          image: {{service_name}}:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: {{service_name}}
spec:
  selector:
    app: {{service_name}}
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP`,
      },
      {
        path: "src/app/api/health/route.ts",
        template: `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "{{serviceName}}",
    timestamp: new Date().toISOString(),
  });
}`,
      },
      {
        path: "src/app/page.tsx",
        template: `export default function Home() {
  return (
    <main>
      <h1>{{serviceName}}</h1>
      <p>Generated by Nebula</p>
    </main>
  );
}`,
      },
      {
        path: ".gitignore",
        template: `node_modules/
.next/
dist/
coverage/
.env
.env.local
*.log`,
      },
    ],
  },

  // 2. Python + Django
  {
    id: "python-django",
    name: "Python + Django",
    language: "Python",
    framework: "Django",
    description: "Backend web application with Django REST framework",
    buildTool: "pip",
    testFramework: "pytest",
    linter: "ruff",
    formatter: "black",
    dockerSupport: true,
    kubernetesSupport: true,
    serverlessSupport: false,
    dependencyPolicy: {
      lockfileRequired: true,
      auditOnInstall: true,
      allowedLicenses: ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "PSF"],
      maxVulnerabilitySeverity: "high",
    },
    testStrategy: {
      unitTestCommand: "pytest tests/unit -v",
      integrationTestCommand: "pytest tests/integration -v",
      coverageCommand: "pytest --cov=src --cov-report=term-missing",
      minCoveragePercent: 80,
    },
    securityDefaults: {
      staticAnalysisCommand: "ruff check src/",
      dependencyAuditCommand: "pip-audit",
      secretScanEnabled: true,
    },
    deploymentTargets: [
      { type: "kubernetes", cloud: "azure", service: "AKS" },
      { type: "kubernetes", cloud: "aws", service: "EKS" },
    ],
    observabilityHooks: [
      { type: "traces", library: "opentelemetry-instrumentation-django", setupInstructions: "Add OTel middleware to Django settings" },
      { type: "metrics", library: "opentelemetry-sdk", setupInstructions: "Configure metrics in manage.py" },
      { type: "logs", library: "structlog", setupInstructions: "Configure structlog with OTel context" },
    ],
    scaffoldFiles: [
      {
        path: "requirements.txt",
        template: `django>=5.0,<6.0
djangorestframework>=3.15,<4.0
psycopg2-binary>=2.9
gunicorn>=22.0
pytest>=8.0
pytest-django>=4.8
pytest-cov>=5.0
ruff>=0.5
black>=24.0
pip-audit>=2.7
opentelemetry-api>=1.25
opentelemetry-sdk>=1.25
opentelemetry-instrumentation-django>=0.46
structlog>=24.0`,
      },
      {
        path: "Dockerfile",
        template: `FROM python:3.12-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS runtime
COPY . .
RUN python manage.py collectstatic --noinput || true
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/')" || exit 1
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]`,
      },
      {
        path: "manage.py",
        template: `#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()`,
      },
      {
        path: "config/settings.py",
        template: `import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "change-me-in-production")
DEBUG = os.environ.get("DJANGO_DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "{{service_name}}"),
        "USER": os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
}`,
      },
      {
        path: "config/urls.py",
        template: `from django.contrib import admin
from django.urls import path, include
from core.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("health/", health_check),
]`,
      },
      {
        path: "core/views.py",
        template: `from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@permission_classes([AllowAny])
def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "{{serviceName}}",
    })`,
      },
      {
        path: "core/__init__.py",
        template: "",
      },
      {
        path: "core/urls.py",
        template: `from django.urls import path

urlpatterns = []`,
      },
      {
        path: "config/__init__.py",
        template: "",
      },
      {
        path: "config/wsgi.py",
        template: `import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()`,
      },
      {
        path: "k8s/deployment.yaml",
        template: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{service_name}}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: {{service_name}}
  template:
    metadata:
      labels:
        app: {{service_name}}
    spec:
      containers:
        - name: {{service_name}}
          image: {{service_name}}:latest
          ports:
            - containerPort: 8000
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health/
              port: 8000
          readinessProbe:
            httpGet:
              path: /health/
              port: 8000`,
      },
      {
        path: ".gitignore",
        template: `__pycache__/
*.py[cod]
*.egg-info/
dist/
.env
db.sqlite3
staticfiles/
.coverage
htmlcov/`,
      },
    ],
  },

  // 3. Erlang on BEAM
  {
    id: "erlang-beam",
    name: "Erlang on BEAM",
    language: "Erlang",
    framework: "OTP",
    description: "Erlang/OTP application with rebar3 build system",
    buildTool: "rebar3",
    testFramework: "eunit",
    linter: "elvis",
    formatter: "erlfmt",
    dockerSupport: true,
    kubernetesSupport: true,
    serverlessSupport: false,
    dependencyPolicy: {
      lockfileRequired: true,
      auditOnInstall: false,
      allowedLicenses: ["Apache-2.0", "MIT", "BSD"],
      maxVulnerabilitySeverity: "high",
    },
    testStrategy: {
      unitTestCommand: "rebar3 eunit",
      integrationTestCommand: "rebar3 ct",
      coverageCommand: "rebar3 cover",
      minCoveragePercent: 70,
    },
    securityDefaults: {
      staticAnalysisCommand: "rebar3 dialyzer",
      dependencyAuditCommand: "rebar3 deps",
      secretScanEnabled: true,
    },
    deploymentTargets: [
      { type: "kubernetes", cloud: "azure", service: "AKS" },
      { type: "kubernetes", cloud: "aws", service: "EKS" },
    ],
    observabilityHooks: [
      { type: "traces", library: "opentelemetry_api", setupInstructions: "Add opentelemetry to rebar.config deps" },
      { type: "metrics", library: "prometheus", setupInstructions: "Use prometheus.erl for metrics" },
      { type: "logs", library: "logger", setupInstructions: "Configure OTP logger with structured output" },
    ],
    scaffoldFiles: [
      {
        path: "rebar.config",
        template: `{erl_opts, [debug_info, warnings_as_errors]}.
{deps, [
  {cowboy, "2.12.0"},
  {jsx, "3.1.0"},
  {opentelemetry_api, "1.3.1"},
  {opentelemetry, "1.4.0"}
]}.
{relx, [
  {release, {{{service_name}}, "0.1.0"}, [{{service_name}}, sasl]},
  {mode, dev},
  {sys_config, "./config/sys.config"},
  {vm_args, "./config/vm.args"}
]}.
{profiles, [
  {prod, [{relx, [{mode, prod}]}]},
  {test, [{deps, [{meck, "0.9.2"}]}]}
]}.`,
      },
      {
        path: "src/{{service_name}}_app.erl",
        template: `-module({{service_name}}_app).
-behaviour(application).
-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    Dispatch = cowboy_router:compile([
        {'_', [
            {"/health", {{service_name}}_health_handler, []},
            {"/api/[...]", {{service_name}}_api_handler, []}
        ]}
    ]),
    {ok, _} = cowboy:start_clear(http, [{port, 8080}], #{
        env => #{dispatch => Dispatch}
    }),
    {{service_name}}_sup:start_link().

stop(_State) ->
    ok = cowboy:stop_listener(http).`,
      },
      {
        path: "src/{{service_name}}_sup.erl",
        template: `-module({{service_name}}_sup).
-behaviour(supervisor).
-export([start_link/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    {ok, {#{strategy => one_for_one, intensity => 5, period => 10}, []}}.`,
      },
      {
        path: "src/{{service_name}}_health_handler.erl",
        template: `-module({{service_name}}_health_handler).
-export([init/2]).

init(Req0, State) ->
    Body = jsx:encode(#{
        <<"status">> => <<"healthy">>,
        <<"service">> => <<"{{serviceName}}">>
    }),
    Req = cowboy_req:reply(200,
        #{<<"content-type">> => <<"application/json">>},
        Body, Req0),
    {ok, Req, State}.`,
      },
      {
        path: "src/{{service_name}}.app.src",
        template: `{application, {{service_name}}, [
  {description, "{{serviceName}} service"},
  {vsn, "0.1.0"},
  {registered, []},
  {mod, {{{service_name}}_app, []}},
  {applications, [kernel, stdlib, cowboy, jsx]},
  {env, []},
  {modules, []}
]}.`,
      },
      {
        path: "Dockerfile",
        template: `FROM erlang:26-alpine AS build
WORKDIR /app
COPY rebar.config rebar.lock ./
RUN rebar3 deps
COPY . .
RUN rebar3 as prod release

FROM alpine:3.19
RUN apk add --no-cache openssl ncurses-libs libstdc++
WORKDIR /app
COPY --from=build /app/_build/prod/rel/{{service_name}} .
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["bin/{{service_name}}", "foreground"]`,
      },
      {
        path: ".gitignore",
        template: `_build/
deps/
*.beam
erl_crash.dump
.rebar3/`,
      },
    ],
  },

  // 4. Elixir on BEAM
  {
    id: "elixir-beam",
    name: "Elixir on BEAM",
    language: "Elixir",
    framework: "Phoenix",
    description: "Elixir/Phoenix web application on the BEAM VM",
    buildTool: "mix",
    testFramework: "ExUnit",
    linter: "credo",
    formatter: "mix format",
    dockerSupport: true,
    kubernetesSupport: true,
    serverlessSupport: false,
    dependencyPolicy: {
      lockfileRequired: true,
      auditOnInstall: true,
      allowedLicenses: ["Apache-2.0", "MIT", "BSD"],
      maxVulnerabilitySeverity: "high",
    },
    testStrategy: {
      unitTestCommand: "mix test",
      integrationTestCommand: "mix test --only integration",
      coverageCommand: "mix test --cover",
      minCoveragePercent: 80,
    },
    securityDefaults: {
      staticAnalysisCommand: "mix credo --strict",
      dependencyAuditCommand: "mix deps.audit",
      secretScanEnabled: true,
    },
    deploymentTargets: [
      { type: "kubernetes", cloud: "azure", service: "AKS" },
      { type: "kubernetes", cloud: "aws", service: "EKS" },
    ],
    observabilityHooks: [
      { type: "traces", library: "opentelemetry", setupInstructions: "Add :opentelemetry to mix.exs deps" },
      { type: "metrics", library: "telemetry_metrics", setupInstructions: "Configure Telemetry.Metrics reporters" },
      { type: "logs", library: "logger", setupInstructions: "Configure Logger with JSON formatter" },
    ],
    scaffoldFiles: [
      {
        path: "mix.exs",
        template: `defmodule {{serviceName}}.MixProject do
  use Mix.Project

  def project do
    [
      app: :{{service_name}},
      version: "0.1.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      test_coverage: [tool: ExCoveralls]
    ]
  end

  def application do
    [
      extra_applications: [:logger, :runtime_tools],
      mod: {{{serviceName}}.Application, []}
    ]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:phoenix_live_dashboard, "~> 0.8"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:jason, "~> 1.4"},
      {:bandit, "~> 1.5"},
      {:opentelemetry_api, "~> 1.3"},
      {:opentelemetry, "~> 1.4"},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:excoveralls, "~> 0.18", only: :test}
    ]
  end
end`,
      },
      {
        path: "lib/{{service_name}}/application.ex",
        template: `defmodule {{serviceName}}.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {{serviceName}}Web.Endpoint
    ]

    opts = [strategy: :one_for_one, name: {{serviceName}}.Supervisor]
    Supervisor.start_link(children, opts)
  end
end`,
      },
      {
        path: "lib/{{service_name}}_web/controllers/health_controller.ex",
        template: `defmodule {{serviceName}}Web.HealthController do
  use Phoenix.Controller, formats: [:json]

  def index(conn, _params) do
    json(conn, %{status: "healthy", service: "{{serviceName}}"})
  end
end`,
      },
      {
        path: "Dockerfile",
        template: `FROM elixir:1.16-alpine AS build
WORKDIR /app
RUN mix local.hex --force && mix local.rebar --force
ENV MIX_ENV=prod
COPY mix.exs mix.lock ./
RUN mix deps.get --only prod && mix deps.compile
COPY . .
RUN mix release

FROM alpine:3.19
RUN apk add --no-cache openssl ncurses-libs libstdc++
WORKDIR /app
COPY --from=build /app/_build/prod/rel/{{service_name}} .
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["bin/{{service_name}}", "start"]`,
      },
      {
        path: ".gitignore",
        template: `_build/
deps/
*.ez
.elixir_ls/
cover/`,
      },
    ],
  },

  // 5. Rust services
  {
    id: "rust-services",
    name: "Rust Services",
    language: "Rust",
    framework: "Axum",
    description: "High-performance Rust backend service with Axum web framework",
    buildTool: "cargo",
    testFramework: "cargo test",
    linter: "clippy",
    formatter: "rustfmt",
    dockerSupport: true,
    kubernetesSupport: true,
    serverlessSupport: false,
    dependencyPolicy: {
      lockfileRequired: true,
      auditOnInstall: true,
      allowedLicenses: ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause"],
      maxVulnerabilitySeverity: "high",
    },
    testStrategy: {
      unitTestCommand: "cargo test",
      integrationTestCommand: "cargo test --test '*'",
      coverageCommand: "cargo tarpaulin --out Html",
      minCoveragePercent: 75,
    },
    securityDefaults: {
      staticAnalysisCommand: "cargo clippy -- -D warnings",
      dependencyAuditCommand: "cargo audit",
      secretScanEnabled: true,
    },
    deploymentTargets: [
      { type: "kubernetes", cloud: "azure", service: "AKS" },
      { type: "kubernetes", cloud: "aws", service: "EKS" },
    ],
    observabilityHooks: [
      { type: "traces", library: "tracing + opentelemetry", setupInstructions: "Add tracing-opentelemetry to Cargo.toml" },
      { type: "metrics", library: "metrics", setupInstructions: "Use metrics crate with OTel exporter" },
      { type: "logs", library: "tracing-subscriber", setupInstructions: "Configure tracing-subscriber with JSON layer" },
    ],
    scaffoldFiles: [
      {
        path: "Cargo.toml",
        template: `[package]
name = "{{service_name}}"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["json", "env-filter"] }
tower-http = { version = "0.5", features = ["cors", "trace"] }
uuid = { version = "1", features = ["v4"] }
anyhow = "1"
thiserror = "1"`,
      },
      {
        path: "src/main.rs",
        template: `use axum::{routing::get, Json, Router};
use serde_json::{json, Value};
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/status", get(status));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("{{serviceName}} listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "healthy",
        "service": "{{serviceName}}"
    }))
}

async fn status() -> Json<Value> {
    Json(json!({
        "service": "{{serviceName}}",
        "version": env!("CARGO_PKG_VERSION")
    }))
}`,
      },
      {
        path: "Dockerfile",
        template: `FROM rust:1.79-slim AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && cargo build --release && rm -rf src
COPY src/ src/
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/{{service_name}} /usr/local/bin/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/health || exit 1
CMD ["{{service_name}}"]`,
      },
      {
        path: ".gitignore",
        template: `target/
Cargo.lock
*.swp`,
      },
    ],
  },
];
