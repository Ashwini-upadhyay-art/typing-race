# syntax=docker/dockerfile:1
# Socket.io server image — deployed to Fly.io.
# The Next.js frontend is NOT in this image; it deploys separately to Vercel.

FROM node:20-alpine AS build
WORKDIR /app

# Prisma schema must be present before `npm ci` because postinstall runs `prisma generate`.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# Compile the server-only subset of the codebase to dist/.
COPY tsconfig.json tsconfig.server.json ./
COPY server ./server
COPY socket ./socket
COPY types ./types
COPY lib ./lib
RUN npx tsc -p tsconfig.server.json

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV SOCKET_PORT=8080

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 8080
CMD ["node", "dist/server/index.js"]
