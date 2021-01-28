FROM node:lts-alpine
LABEL maintainer "andrechristikan@gmail.com"

WORKDIR /app

COPY package.json .
RUN set -x && yarn

COPY . .

RUN yarn run prebuild && yarn run build
RUN ls .

EXPOSE 3000

CMD [ "yarn", "run", "start:prod" ]
