FROM node:22-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN npm install --global pnpm@10.28.2 && groupadd -r app && useradd -r -m -g app app

WORKDIR /app

COPY services/onchain/package.json services/onchain/pnpm-lock.yaml ./services/onchain/
COPY services/scoring/package.json services/scoring/pnpm-lock.yaml ./services/scoring/
COPY services/api/package.json services/api/pnpm-lock.yaml ./services/api/
COPY services/onchain ./services/onchain
COPY services/scoring ./services/scoring

WORKDIR /app/services/api
RUN pnpm install --frozen-lockfile

COPY services/api ./

USER app
EXPOSE 8787
CMD ["pnpm", "start"]
