# Production image (not deployed; deployment needs owner approval). Build: docker build -t marketplace .
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS run
ENV NODE_ENV=production APP_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN useradd --uid 10001 --create-home app
COPY --from=build --chown=app /app ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Run migrations as a separate release step: `npm run db:migrate` (all-or-nothing). Worker: `npm run worker`.
CMD ["npx", "next", "start", "-p", "3000"]
