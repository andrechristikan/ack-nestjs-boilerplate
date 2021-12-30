FROM node:lts-alpine
LABEL maintainer "andrechristikan@gmail.com"

WORKDIR /app
EXPOSE 3000

COPY package.json .
COPY yarn.lock .
RUN touch .env

RUN set -x && yarn

COPY . .

RUN yarn build

CMD [ "yarn", "start:prod" ]