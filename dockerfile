FROM node:lts-alpine
LABEL maintainer "andrechristikan@gmail.com"

WORKDIR /app

COPY package.json ./
RUN set -x && yarn

COPY . .

EXPOSE 3000

CMD [ "yarn", "run", "start:dev" ]
