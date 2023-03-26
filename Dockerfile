FROM node:19-alpine

ARG VITE_RECAPTCHA_SITE_KEY=''
ENV VITE_RECAPTCHA_SITE_KEY ${VITE_RECAPTCHA_SITE_KEY}

WORKDIR /app

COPY package*.json ./

RUN yarn install

COPY . .

RUN yarn build

CMD ["node", "./dist/server.js"]
