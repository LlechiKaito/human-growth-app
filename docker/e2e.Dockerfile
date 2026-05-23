# syntax=docker/dockerfile:1.7
FROM mcr.microsoft.com/playwright:v1.60.0-jammy AS base
WORKDIR /workspace

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY infra/package.json infra/
COPY tests/e2e/package.json tests/e2e/
RUN npm install --workspaces --include-workspace-root

FROM base AS run
COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY tests/e2e ./tests/e2e
WORKDIR /workspace/tests/e2e
CMD ["npx", "playwright", "test"]
