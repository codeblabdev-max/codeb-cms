#!/bin/bash

# 서버 환경 설정 스크립트
# Podman으로 PostgreSQL과 Redis 컨테이너 구성

set -e

echo "🚀 CodeB CMS 서버 환경 설정 시작..."

# 1. Podman 설치 확인
echo "📦 Podman 설치 확인..."
if ! command -v podman &> /dev/null; then
    echo "❌ Podman이 설치되어 있지 않습니다."
    echo "설치 방법: https://podman.io/getting-started/installation"
    exit 1
fi
echo "✅ Podman 설치됨: $(podman --version)"

# 2. Caddy 설치 확인
echo "🌐 Caddy 설치 확인..."
if ! command -v caddy &> /dev/null; then
    echo "❌ Caddy가 설치되어 있지 않습니다."
    echo "설치 방법: https://caddyserver.com/docs/install"
    exit 1
fi
echo "✅ Caddy 설치됨: $(caddy version)"

# 3. 네트워크 생성
echo "🔗 Podman 네트워크 생성..."
podman network exists codeb-network || podman network create codeb-network

# 4. PostgreSQL 컨테이너 실행
echo "🐘 PostgreSQL 컨테이너 설정..."
DB_PASSWORD="codeb_secure_password_$(date +%s)"
DB_NAME="codeb_cms"
DB_USER="codeb_user"

# 기존 컨테이너 제거 (있다면)
podman stop codeb-postgres 2>/dev/null || true
podman rm codeb-postgres 2>/dev/null || true

# PostgreSQL 컨테이너 실행
podman run -d \
  --name codeb-postgres \
  --network codeb-network \
  -p 5432:5432 \
  -e POSTGRES_DB=$DB_NAME \
  -e POSTGRES_USER=$DB_USER \
  -e POSTGRES_PASSWORD=$DB_PASSWORD \
  -v codeb-postgres-data:/var/lib/postgresql/data \
  postgres:15-alpine

echo "✅ PostgreSQL 컨테이너 실행 완료"
echo "   - 데이터베이스: $DB_NAME"
echo "   - 사용자: $DB_USER"
echo "   - 포트: 5432"

# 5. Redis 컨테이너 실행
echo "📦 Redis 컨테이너 설정..."

# 기존 컨테이너 제거 (있다면)
podman stop codeb-redis 2>/dev/null || true
podman rm codeb-redis 2>/dev/null || true

# Redis 컨테이너 실행
podman run -d \
  --name codeb-redis \
  --network codeb-network \
  -p 6379:6379 \
  -v codeb-redis-data:/data \
  redis:7-alpine redis-server --appendonly yes

echo "✅ Redis 컨테이너 실행 완료"
echo "   - 포트: 6379"

# 6. 환경 변수 파일 생성
echo "⚙️ 환경 설정 파일 생성..."
cat > .env.server <<EOF
# 서버 환경 설정
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
REDIS_URL="redis://localhost:6379"
SESSION_SECRET="$DB_PASSWORD"
NODE_ENV="production"

# 데이터베이스 정보
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASSWORD="$DB_PASSWORD"
EOF

echo "✅ 환경 설정 파일 생성 완료: .env.server"

# 7. 컨테이너 상태 확인
echo "🔍 컨테이너 상태 확인..."
sleep 5

if podman ps | grep -q codeb-postgres; then
    echo "✅ PostgreSQL 컨테이너 실행 중"
else
    echo "❌ PostgreSQL 컨테이너 실행 실패"
    podman logs codeb-postgres
fi

if podman ps | grep -q codeb-redis; then
    echo "✅ Redis 컨테이너 실행 중"
else
    echo "❌ Redis 컨테이너 실행 실패"
    podman logs codeb-redis
fi

# 8. 연결 테스트
echo "🔌 데이터베이스 연결 테스트..."
sleep 10

# PostgreSQL 연결 테스트
if podman exec codeb-postgres pg_isready -h localhost -p 5432 -U $DB_USER; then
    echo "✅ PostgreSQL 연결 성공"
else
    echo "❌ PostgreSQL 연결 실패"
fi

# Redis 연결 테스트
if podman exec codeb-redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis 연결 성공"
else
    echo "❌ Redis 연결 실패"
fi

echo ""
echo "🎉 서버 환경 설정 완료!"
echo ""
echo "📋 연결 정보:"
echo "   PostgreSQL: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo "   Redis: redis://localhost:6379"
echo ""
echo "📄 환경 설정 파일: .env.server"
echo ""
echo "🔧 다음 단계:"
echo "   1. .env.server 파일을 .env로 복사"
echo "   2. npx prisma migrate deploy (프로덕션)"
echo "   3. npx prisma db push (개발)"
echo "   4. npm run build && npm start"
echo ""
echo "🛠️ 컨테이너 관리 명령어:"
echo "   - 시작: podman start codeb-postgres codeb-redis"
echo "   - 정지: podman stop codeb-postgres codeb-redis"
echo "   - 로그: podman logs codeb-postgres"
echo "   - 상태: podman ps"