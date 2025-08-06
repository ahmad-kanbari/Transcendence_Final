FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expose the port your frontend runs on
EXPOSE 3003

# Start the development server
CMD ["npm", "run", "all"]