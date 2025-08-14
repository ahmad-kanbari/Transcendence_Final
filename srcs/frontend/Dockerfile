FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build the production assets
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install only production dependencies
RUN npm install

COPY --from=build /app/dist /app/dist
COPY . .

# Expose the port the frontend runs on to other containers
EXPOSE 3003

CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'production' ]; then echo 'Building production files...' && npm run build && echo 'Production build complete. Files ready to be served by Nginx.'; else exec npm run dev; fi"]