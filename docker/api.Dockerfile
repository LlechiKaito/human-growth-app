# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
WORKDIR /workspace
RUN apk add --no-cache openssl

# ----- deps -----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY infra/package.json infra/
COPY tests/e2e/package.json tests/e2e/
RUN npm install --workspaces --include-workspace-root

# ----- dev (used by docker-compose) -----
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/api ./apps/api
WORKDIR /workspace/apps/api
RUN npx prisma generate || true
EXPOSE 8080
CMD ["npm", "run", "dev"]

# ----- build (for App Runner) -----
FROM base AS build
COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/api ./apps/api
WORKDIR /workspace/apps/api
RUN npx prisma generate
RUN npm run build

# ----- prod -----
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/package.json ./
COPY --from=build /workspace/apps/api/prisma ./prisma
COPY --from=build /workspace/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "dist/main.js"]
