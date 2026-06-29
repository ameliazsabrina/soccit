FROM node:22-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN npm install --global pnpm@10.28.2 && groupadd -r app && useradd -r -m -g app app

WORKDIR /app/services/worker

COPY services/worker/package.json services/worker/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY services/worker ./

USER app
CMD ["pnpm", "start"]
