FROM node:20-alpine
WORKDIR /app

# Copy package and server code
COPY package*.json ./
COPY server.js ./
COPY public ./public

# Set Port and expose
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
