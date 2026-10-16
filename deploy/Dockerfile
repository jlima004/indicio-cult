FROM node:22-alpine3.24@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine3.24@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Coolify provides these as Build Variables. Next.js embeds NEXT_PUBLIC_*
# values in the browser bundle. No server secret belongs in an ARG.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG APP_VERSION

# APP_VERSION must be the SOURCE_COMMIT selected by Coolify; next.config.ts
# embeds it in the public release and Sentry release during this build.
RUN test -n "$APP_VERSION" && npm run build

# Prepare the complete Alpine userspace with the official zlib security fix.
FROM alpine:3.24@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 AS runtime-rootfs

RUN apk add --no-cache libstdc++ zlib=1.3.2-r1 \
    && addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node

# Copy only the prepared filesystem; its old zlib layer is not inherited.
FROM scratch AS runner
COPY --from=runtime-rootfs / /

COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY --from=build /usr/local/bin/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}

COPY --chown=node:node --from=build /app/.next/standalone ./
COPY --chown=node:node --from=build /app/.next/static ./.next/static
COPY --chown=node:node --from=build /app/public ./public
RUN mkdir -p /app/.next/cache && chown node:node /app/.next/cache

USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
