FROM node:12.11.0

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx knex migrate:latest

EXPOSE 3000
CMD ["npm", "run", "start"]