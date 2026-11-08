#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')
  sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${SECRET}|" .env
  echo "Created .env with a generated JWT_SECRET"
fi
[ -f apps/web/.env.local ] || echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > apps/web/.env.local

docker compose up -d --wait
pnpm install
pnpm --filter api prisma:generate
pnpm --filter api db:deploy
pnpm --filter api poi:import
echo "Done. Start: pnpm --filter api dev   and   pnpm --filter web dev"
