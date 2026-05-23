#!/bin/sh
set -e

# DATABASE_URL は App Runner の runtimeEnvironmentSecrets により JSON 文字列で渡される場合がある。
# Prisma CLI は postgresql:// 形式を期待するため、Node で変換してから export し直す。
if [ "${DATABASE_URL#\{}" != "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL is JSON; converting to postgresql:// URL"
  DATABASE_URL=$(node -e "
    const v = process.env.DATABASE_URL;
    const p = JSON.parse(v);
    const u = encodeURIComponent(p.username);
    const w = encodeURIComponent(p.password);
    process.stdout.write('postgresql://' + u + ':' + w + '@' + p.host + ':' + p.port + '/' + p.dbname);
  ")
  export DATABASE_URL
fi

echo "[entrypoint] Running prisma db push (idempotent schema sync)"
npx prisma db push --skip-generate --accept-data-loss

echo "[entrypoint] Starting API server"
exec node dist/main.js
