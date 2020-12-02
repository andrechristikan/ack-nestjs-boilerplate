FROM node:lts-alpine
LABEL maintainer "andrechristikan@gmail.com"

WORKDIR /app

COPY package.json ./app/
RUN set -x && yarn

COPY . ./app/

EXPOSE 3000

CMD [ "yarn", "start:dev" ]
