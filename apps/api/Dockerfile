# Dockerfile for the API service of the multi-tenant SaaS application.
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/billing/package.json packages/billing/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @multitenant-saas/db generate
RUN pnpm turbo run build --filter=@multitenant-saas/api...

# openssl is required by Prisma's query engine at runtime.
FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo
COPY --from=build /repo .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
