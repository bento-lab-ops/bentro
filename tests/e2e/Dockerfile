FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /e2e

COPY package.json .
RUN npm install

COPY playwright.config.ts .
COPY specs ./specs

CMD ["npx", "playwright", "test"]
