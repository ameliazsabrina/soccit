FROM node:20.19.0-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN npm install --global corepack@latest && corepack enable && groupadd -r app && useradd -r -g app app

WORKDIR /app

COPY services/scoring/package.json services/scoring/pnpm-lock.yaml ./services/scoring/
COPY services/api/package.json services/api/pnpm-lock.yaml ./services/api/
COPY services/scoring ./services/scoring

WORKDIR /app/services/api
RUN pnpm install --frozen-lockfile

COPY services/api ./

USER app
EXPOSE 8787
CMD ["pnpm", "start"]
