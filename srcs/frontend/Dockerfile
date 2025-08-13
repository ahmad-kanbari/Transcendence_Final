FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expose the port the frontend runs on to other containers
EXPOSE 3003

CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'production' ]; then exec npm run start; else exec npm run dev; fi"]