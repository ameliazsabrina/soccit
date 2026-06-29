FROM node:22-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN npm install --global corepack@latest && corepack enable && corepack prepare pnpm@10.28.2 --activate && groupadd -r app && useradd -r -g app app

WORKDIR /app/services/worker

COPY services/worker/package.json services/worker/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY services/worker ./

USER app
CMD ["pnpm", "start"]
