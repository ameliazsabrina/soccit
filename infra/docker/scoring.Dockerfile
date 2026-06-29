FROM node:22-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN npm install --global corepack@latest && corepack enable && groupadd -r app && useradd -r -g app app

WORKDIR /app/services/scoring

COPY services/scoring/package.json services/scoring/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY services/scoring ./
COPY infra/e2e ./infra/e2e

USER app
CMD ["pnpm", "start"]
