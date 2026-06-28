FROM node:20.19.0-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN corepack enable && groupadd -r app && useradd -r -g app app

WORKDIR /app/services/worker

COPY services/worker/package.json services/worker/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY services/worker ./

USER app
CMD ["pnpm", "start"]
