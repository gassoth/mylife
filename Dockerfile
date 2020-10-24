FROM node:12.11.0

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start"]