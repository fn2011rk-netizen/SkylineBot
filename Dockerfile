FROM node:22-alpine

WORKDIR /app

COPY deploy/package.json ./
RUN npm install

COPY deploy/src ./src
COPY deploy/config.json ./config.json

CMD ["npm", "start"]
