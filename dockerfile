FROM node:lts-alpine
LABEL maintainer "andrechristikan@gmail.com"

WORKDIR /app
EXPOSE 3000

COPY package.json .
COPY yarn.lock .
RUN touch .env

RUN set -x && yarn

COPY . .

RUN yarn run prebuild && yarn run build

CMD [ "yarn", "run", "start:prod" ]