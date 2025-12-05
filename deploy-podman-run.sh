#!/bin/bash
# vsvs.kr Manual Podman Deployment Script
# Uses podman run instead of podman-compose for better network control

set -e

cd /opt/vsvs/app

echo "🧹 Cleaning up old containers..."
podman stop app_app_1 app_postgres_1 app_redis_1 2>/dev/null || true
podman rm app_app_1 app_postgres_1 app_redis_1 2>/dev/null || true

# Create network if needed
echo "🌐 Creating network..."
podman network exists vsvs_network || podman network create vsvs_network

# Load environment variables
source .env.production

echo ""
echo "🚀 Starting PostgreSQL..."
podman run -d \
  --name app_postgres_1 \
  --network vsvs_network \
  -p 5440:5432 \
  -e POSTGRES_DB="${POSTGRES_DB}" \
  -e POSTGRES_USER="${POSTGRES_USER}" \
  -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  -e POSTGRES_INITDB_ARGS="--encoding=UTF-8 --locale=ko_KR.UTF-8" \
  -v postgres_data:/var/lib/postgresql/data \
  --health-cmd="pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}" \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=5 \
  --restart=unless-stopped \
  docker.io/library/postgres:15-alpine

echo "⏳ Waiting for PostgreSQL to be healthy..."
until podman healthcheck run app_postgres_1 >/dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo " ✅ PostgreSQL is healthy!"

echo ""
echo "🚀 Starting Redis..."
podman run -d \
  --name app_redis_1 \
  --network vsvs_network \
  -p 6390:6379 \
  -v redis_data:/data \
  --health-cmd="redis-cli ping" \
  --health-interval=10s \
  --health-timeout=3s \
  --health-retries=3 \
  --restart=unless-stopped \
  docker.io/library/redis:7-alpine \
  redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru

echo "⏳ Waiting for Redis to be healthy..."
until podman healthcheck run app_redis_1 >/dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo " ✅ Redis is healthy!"

echo ""
echo "🚀 Starting Application..."
podman run -d \
  --name app_app_1 \
  --network vsvs_network \
  -p 3100:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@app_postgres_1:5432/${POSTGRES_DB}?schema=public" \
  -e REDIS_URL="redis://app_redis_1:6379" \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
  -e SESSION_SECRET="${SESSION_SECRET}" \
  -e KAKAO_CLIENT_ID="${KAKAO_CLIENT_ID}" \
  -e KAKAO_CLIENT_SECRET="${KAKAO_CLIENT_SECRET}" \
  -e NAVER_CLIENT_ID="${NAVER_CLIENT_ID}" \
  -e NAVER_CLIENT_SECRET="${NAVER_CLIENT_SECRET}" \
  -v app_uploads:/app/uploads \
  -v app_logs:/app/logs \
  --health-cmd="curl -f http://localhost:3000/api/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=40s \
  --restart=unless-stopped \
  ${APP_IMAGE:-localhost/vsvs-cms:latest}

echo "⏳ Waiting for application to start..."
sleep 15

echo ""
echo "✅ Container Status:"
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🏥 Health Check:"
sleep 5
curl -s http://localhost:3100/api/health && echo "" || echo "Application still starting..."

echo ""
echo "📋 Application Logs:"
podman logs app_app_1 --tail 20

echo ""
echo "✨ Deployment complete!"
echo "🌐 Service available at: http://localhost:3100"
echo "🌐 Domain: https://vsvs.kr (after DNS propagation)"
