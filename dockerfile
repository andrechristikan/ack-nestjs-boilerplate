FROM node:lts-alpine
LABEL maintainer "andrechristikan@gmail.com"

WORKDIR /app

COPY package.json .
COPY yarn.lock .
COPY .env .
RUN set -x && yarn

COPY . .

RUN yarn run prebuild && yarn run build
RUN ls -la .

EXPOSE 3000

CMD [ "yarn", "run", "start:prod" ]