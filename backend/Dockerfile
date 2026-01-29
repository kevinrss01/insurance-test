FROM node:20-bullseye-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "pnpm db:setup && pnpm start:prod"]
