FROM node:lts-alpine
LABEL maintainer="andrechristikan@gmail.com"

WORKDIR /app

RUN npm install -g corepack && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN set -x && pnpm install --frozen-lockfile

RUN touch .env

COPY . .

EXPOSE 3000

# The container owns its src/generated (a tmpfs over the ./src bind) and fills it at every start.
CMD [ "sh", "-c", "pnpm generate; pnpm start:dev" ]
