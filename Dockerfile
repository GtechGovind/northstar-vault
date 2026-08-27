FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY ui ./ui
COPY scripts/build-icons.mjs ./scripts/build-icons.mjs
COPY public ./public
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY --from=deps /app/public ./public
USER app
EXPOSE 8080
CMD ["node", "src/server.js"]
