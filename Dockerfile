FROM node:19-alpine

EXPOSE 5000

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

CMD ["node", "./dist/server.js"]
