FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native modules (e.g., argon2, sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/storage/uploads /app/data

EXPOSE 5000

CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm start"]

