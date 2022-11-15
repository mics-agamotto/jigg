FROM node:alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY . .

CMD [ "node", "demo/server.js", "8000", "Garbler", "6a09e667bb67ae853c6ef372a54ff53a510e527f9b05688c1f83d9ab5be0cd19", "hex", "sha-256-flipped.txt" ]
