FROM node:18-slim
WORKDIR /web
COPY package.json .
RUN npm install
COPY . .
CMD ["npx", "jest"]
