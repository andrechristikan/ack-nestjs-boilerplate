FROM node:lts-alpine
LABEL maintainer "ack@baibay.com"

WORKDIR /app
EXPOSE 3000

COPY package.json .
COPY yarn.lock .
RUN touch .env .env.share

RUN set -x && yarn

COPY . .

RUN yarn build

CMD [ "yarn", "start:prod" ]