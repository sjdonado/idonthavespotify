FROM oven/bun:alpine

EXPOSE 3000/tcp

WORKDIR /usr/src/app

RUN apk update && apk add --no-cache chromium

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV NODE_ENV production

COPY package.json .
COPY bun.lockb .

RUN bun install

COPY src src
COPY www www

COPY tsconfig.json .
COPY tailwind.config.js .
COPY postcss.config.js .
COPY vite.config.js .

RUN bun run build

COPY public public

CMD ["bun", "www/bin.ts"]
