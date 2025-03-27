# Utilisation d'une image officielle Node.js
FROM node:20

WORKDIR /workspace

COPY package*.json ./
RUN npm install

COPY ./src ./src
COPY ./storage ./storage

EXPOSE 4000

CMD ["node", "src/storageServer.js"]
