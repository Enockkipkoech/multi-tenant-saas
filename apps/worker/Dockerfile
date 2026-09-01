# Same shape as apps/api/Dockerfile — this is the service that gets retired
# in favor of Fargate in Phase 2 (README §7); keeping it containerized now
# means that swap changes deployment target, not build tooling.
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @switchboard/db generate
RUN pnpm turbo run build --filter=@switchboard/worker...

# openssl is required by Prisma's query engine at runtime.
FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo
COPY --from=build /repo .
ENV NODE_ENV=production
CMD ["node", "apps/worker/dist/index.js"]
