FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

CMD ["sh", "-c", "bun run db:migrate && exec bun run dev"]
