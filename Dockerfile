FROM node:20-alpine
WORKDIR /app

# Copy package descriptors and source files
COPY package*.json ./
COPY server.js ./
COPY public ./public
COPY data ./data

# Environment configuration
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
