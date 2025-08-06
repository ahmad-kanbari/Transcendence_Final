FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Create the db directory if it doesn't exist
RUN mkdir -p db

EXPOSE 3000

CMD ["npm", "start"]