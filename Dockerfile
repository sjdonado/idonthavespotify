FROM oven/bun:1-alpine

EXPOSE 3000/tcp

WORKDIR /usr/src/app

RUN apk update && apk add --no-cache nodejs python3

COPY package.json bun.lock .
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

COPY public public

ENV NODE_ENV production

CMD ["bun", "src/index.ts"]
