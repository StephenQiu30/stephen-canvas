FROM oven/bun:1.3.13 AS web-build

WORKDIR /app/web
COPY web/package.json web/bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile --cache-dir=/root/.bun/install/cache
COPY CHANGELOG.md /app/CHANGELOG.md
COPY web ./
RUN bun run build

FROM node:24-alpine AS runner

WORKDIR /app/web
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000

COPY --from=web-build /app/web/.next/standalone ./
COPY --from=web-build /app/web/.next/static ./.next/static
COPY --from=web-build /app/web/public ./public
COPY web/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
CMD ["sh", "-c", "./docker-entrypoint.sh && node server.js"]
