FROM node:alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY . .

CMD [ "node", "demo/server.js", "8000", "Garbler", "99df2da20f81a2f76b2e8b0b6fef6021d4b78de466b1254b669b7d6e4a5e4b22", "hex", "sha-256-flipped.txt" ]
