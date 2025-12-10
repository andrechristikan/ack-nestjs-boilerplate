FROM node:lts-alpine

LABEL maintainer="andrechristikan@gmail.com"

WORKDIR /app
EXPOSE 3000

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN touch .env

RUN set -x && pnpm install --frozen-lockfile

COPY . .

CMD [ "pnpm", "start:dev" ]
