#!/bin/sh

# 프로덕션 Docker 엔트리포인트 스크립트

set -e

# 환경 변수 검증
required_vars="DATABASE_URL JWT_SECRET ENCRYPTION_KEY"
for var in $required_vars; do
  if [ -z "$(eval echo \$$var)" ]; then
    echo "Error: Required environment variable $var is not set"
    exit 1
  fi
done

# 데이터베이스 연결 대기 및 마이그레이션
echo "Waiting for database connection..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx prisma migrate deploy 2>/dev/null; then
    echo "Database migrations applied successfully!"
    break
  elif npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; then
    echo "Database schema synced successfully!"
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for database... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
  fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Failed to connect to database after $MAX_RETRIES attempts"
  exit 1
fi

# 데이터베이스 시드 (프로덕션에서는 선택적)
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

# 업로드 디렉토리 권한 설정
if [ -d "/app/uploads" ]; then
  chmod -R 755 /app/uploads 2>/dev/null || echo "Warning: Could not set permissions for /app/uploads"
fi

# 로그 디렉토리 권한 설정
if [ -d "/app/logs" ]; then
  chmod -R 755 /app/logs 2>/dev/null || echo "Warning: Could not set permissions for /app/logs"
fi

# 애플리케이션 시작
echo "Starting application..."
exec "$@"