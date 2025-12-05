#!/bin/bash

# CodeB CMS 개발 환경 초기화 스크립트
# 사용법: ./scripts/init-dev.sh

set -e

echo "🚀 CodeB CMS 개발 환경 초기화 시작..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Docker 실행 확인
echo "📦 Docker 상태 확인..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker가 실행되지 않았습니다.${NC}"
    echo "   Docker Desktop을 시작한 후 다시 실행해주세요."
    exit 1
fi
echo -e "${GREEN}✅ Docker 실행 중${NC}"
echo ""

# .env 파일 확인
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env 파일이 없습니다. .env.example을 복사합니다...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env 파일 생성 완료${NC}"
    echo -e "${YELLOW}   ⚠️  .env 파일을 열어 필요한 설정을 수정해주세요.${NC}"
    echo ""
fi

# Docker Compose 서비스 시작
echo "🐳 Docker Compose 서비스 시작..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ 데이터베이스 헬스체크 대기 중 (최대 30초)..."
sleep 5

# PostgreSQL 연결 대기
MAX_ATTEMPTS=10
ATTEMPT=0
until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U codeb_user -d codeb_cms > /dev/null 2>&1 || [ $ATTEMPT -eq $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT+1))
    echo "   대기 중... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 3
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ PostgreSQL 연결 실패${NC}"
    echo "   docker-compose logs postgres 명령으로 로그를 확인해주세요."
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL 준비 완료${NC}"
echo ""

# Prisma 마이그레이션
echo "🔄 Prisma 마이그레이션 실행..."
npx prisma migrate dev --name init

echo ""

# 데이터베이스 시드
echo "🌱 초기 데이터 입력..."
npm run seed

echo ""
echo -e "${GREEN}✅ 개발 환경 초기화 완료!${NC}"
echo ""
echo "📊 서비스 상태:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🎉 개발 서버를 시작하려면 다음 명령을 실행하세요:"
echo -e "${GREEN}   npm run dev${NC}"
echo ""
echo "📝 유용한 명령어:"
echo "   - 서비스 중지: docker-compose -f docker-compose.dev.yml down"
echo "   - 로그 확인: docker-compose -f docker-compose.dev.yml logs -f"
echo "   - DB 접속: docker-compose -f docker-compose.dev.yml exec postgres psql -U codeb_user -d codeb_cms"
echo ""
