FROM node:20-slim AS builder
WORKDIR /app
ENV HUSKY=0
COPY package*.json vite.config.js ./
RUN npm ci --ignore-scripts
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3737
ENV HUSKY=0
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server.js ./
COPY src/server ./src/server
COPY --from=builder /app/dist ./dist
EXPOSE 3737
CMD ["node", "server.js"]
