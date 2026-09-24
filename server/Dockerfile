# API + WebSocket (Express + Socket.io)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
USER node
EXPOSE 3005
ENV PORT=3005
CMD ["node", "server.js"]
