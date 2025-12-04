FROM oven/bun:1-alpine AS builder

WORKDIR /usr/src/app

RUN apk update && apk add --no-cache nodejs python3

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build
RUN bun run build:prod

FROM alpine:3.20

RUN apk add --no-cache ca-certificates libstdc++ libgcc
WORKDIR /app

COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/dist/idonthavespotify /usr/local/bin/idonthavespotify

ENV NODE_ENV=production
EXPOSE 3000/tcp

CMD ["idonthavespotify"]
