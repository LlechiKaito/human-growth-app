# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
WORKDIR /workspace

# ----- deps -----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY infra/package.json infra/
RUN npm install --workspaces --include-workspace-root

# ----- dev (used by docker-compose) -----
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/web ./apps/web
WORKDIR /workspace/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ----- build (static export to S3) -----
FROM base AS build
COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/web ./apps/web
WORKDIR /workspace/apps/web
RUN npm run build

# ----- artifact (静的ファイル取り出し用) -----
FROM scratch AS artifact
COPY --from=build /workspace/apps/web/out /out
