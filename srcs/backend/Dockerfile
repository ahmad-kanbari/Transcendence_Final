FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Create the db directory if it doesn't exist
RUN mkdir -p db

# Expose the port the backend runs on to other containers
EXPOSE 3000

# Use a shell form CMD to switch based on NODE_ENV
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'production' ]; then exec npm run start; else exec npm run dev; fi"]