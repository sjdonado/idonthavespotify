FROM oven/bun:1-alpine

EXPOSE 3000/tcp

WORKDIR /usr/src/app

RUN apk update && apk add --no-cache chromium nodejs python3

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package.json bun.lockb .
RUN bun install --frozen-lockfile

COPY src src
COPY www www

COPY tsconfig.json .
COPY tailwind.config.js .
COPY postcss.config.js .
COPY vite.config.js .

RUN bun run build

COPY public public

ENV NODE_ENV production

CMD ["bun", "www/bin.ts"]
