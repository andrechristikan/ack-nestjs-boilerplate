FROM node:lts-alpine
LABEL maintainer "andrechristikan@gmail.com"

WORKDIR /app

COPY package.json .
RUN set -x && yarn 

COPY . .

RUN mv .env.docker .env
RUN yarn prebuild && yarn build
EXPOSE 3000

CMD yarn start:prod

