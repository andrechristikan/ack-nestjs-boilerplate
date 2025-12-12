FROM node:lts-alpine
LABEL maintainer="andrechristikan@gmail.com"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/


RUN set -x && pnpm install --frozen-lockfile
RUN pnpm db:generate

RUN touch .env

COPY . .

EXPOSE 3000


CMD [ "pnpm", "start:dev" ]
