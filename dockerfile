FROM node:lts-alpine
LABEL maintainer="andrechristikan@gmail.com"

WORKDIR /app

RUN npm install -g corepack && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN set -x && pnpm install --frozen-lockfile

RUN touch .env

COPY . .

EXPOSE 3000

CMD [ "sh", "-c", "pnpm start:dev" ]
