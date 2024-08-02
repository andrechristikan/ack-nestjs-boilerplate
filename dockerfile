FROM node:lts-alpine
LABEL maintainer "andrechristikan@gmail.com"

ENV NODE_ENV=${NODE_ENV}

WORKDIR /app
EXPOSE 3000

COPY package.json yarn.lock ./
RUN touch .env

RUN set -x && yarn --frozen-lockfile

COPY . .

CMD [ "yarn", "start:dev" ]
