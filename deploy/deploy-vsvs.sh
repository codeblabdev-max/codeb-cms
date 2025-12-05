#!/bin/bash

# vsvs.kr 배포 스크립트
# 141.164.60.51 서버에 Podman으로 배포

set -e  # 에러 발생 시 즉시 종료

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 설정 변수
SERVER_IP="141.164.60.51"
SERVER_USER="root"
APP_NAME="vsvs-cms"
APP_PORT="3100"
POSTGRES_PORT="5440"
REDIS_PORT="6390"
REMOTE_DIR="/opt/vsvs"

log_info "=== vsvs.kr 배포 시작 ==="

# 1. 서버 접속 확인
log_info "서버 접속 확인 중..."
if ! ssh -q ${SERVER_USER}@${SERVER_IP} exit; then
    log_error "서버에 접속할 수 없습니다."
    exit 1
fi
log_success "서버 접속 성공"

# 2. 원격 디렉토리 생성
log_info "원격 디렉토리 생성 중..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_DIR}/{app,database,logs,uploads}"
log_success "디렉토리 생성 완료"

# 3. 필요한 파일 업로드
log_info "프로젝트 파일 업로드 중..."

# .env.production 파일 확인
if [ ! -f ".env.production" ]; then
    log_error ".env.production 파일이 없습니다. .env.production.example을 복사하여 설정하세요."
    exit 1
fi

# 업로드할 파일 목록
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'build' \
    --exclude '.DS_Store' \
    --exclude '*.log' \
    ./ ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/app/

log_success "파일 업로드 완료"

# 4. Caddyfile 업데이트
log_info "Caddy 설정 업데이트 중..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    # Caddyfile 백업
    cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup.$(date +%Y%m%d_%H%M%S)

    # vsvs.kr 설정 추가 (중복 체크)
    if ! grep -q "vsvs.kr {" /etc/caddy/Caddyfile; then
        cat /opt/vsvs/app/deploy/vsvs-caddy.conf >> /etc/caddy/Caddyfile
        echo "Caddy 설정 추가 완료"
    else
        echo "Caddy 설정이 이미 존재함"
    fi

    # Caddy 설정 검증
    caddy validate --config /etc/caddy/Caddyfile

    # Caddy 리로드
    caddy reload --config /etc/caddy/Caddyfile
ENDSSH
log_success "Caddy 설정 완료"

# 5. Podman 컨테이너 배포
log_info "Podman 컨테이너 배포 중..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    cd ${REMOTE_DIR}/app

    # 기존 컨테이너 중지 및 제거 (있을 경우)
    podman-compose -f docker-compose.podman.yml down 2>/dev/null || true

    # 이미지 빌드
    podman build -t vsvs-cms:latest -f Dockerfile.production .

    # 컨테이너 실행
    podman-compose -f docker-compose.podman.yml up -d

    # 컨테이너 상태 확인
    sleep 5
    podman ps | grep vsvs
ENDSSH
log_success "컨테이너 배포 완료"

# 6. 데이터베이스 마이그레이션
log_info "데이터베이스 마이그레이션 실행 중..."
ssh ${SERVER_USER}@${SERVER_IP} << ENDSSH
    cd ${REMOTE_DIR}/app

    # 마이그레이션 실행
    podman exec vsvs-cms-app npx prisma migrate deploy

    # Prisma 클라이언트 생성
    podman exec vsvs-cms-app npx prisma generate
ENDSSH
log_success "마이그레이션 완료"

# 7. 헬스체크
log_info "서비스 헬스체크 중..."
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if ssh ${SERVER_USER}@${SERVER_IP} "curl -f http://localhost:${APP_PORT}/api/health" > /dev/null 2>&1; then
        log_success "서비스가 정상적으로 실행 중입니다."
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT+1))
    log_warning "헬스체크 대기 중... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "서비스 시작에 실패했습니다. 로그를 확인하세요."
    ssh ${SERVER_USER}@${SERVER_IP} "podman logs vsvs-cms-app --tail 50"
    exit 1
fi

# 8. 배포 정보 출력
log_success "=== 배포 완료! ==="
echo ""
echo "📊 배포 정보:"
echo "  - 서버: ${SERVER_IP}"
echo "  - 도메인: https://vsvs.kr"
echo "  - 앱 포트: ${APP_PORT}"
echo "  - DB 포트: ${POSTGRES_PORT}"
echo "  - Redis 포트: ${REDIS_PORT}"
echo ""
echo "🔍 다음 명령어로 상태 확인:"
echo "  ssh ${SERVER_USER}@${SERVER_IP}"
echo "  podman ps"
echo "  podman logs vsvs-cms-app"
echo ""
echo "🌐 DNS 설정:"
echo "  vsvs.kr A 레코드 → ${SERVER_IP}"
echo "  www.vsvs.kr CNAME → vsvs.kr"
echo ""
log_warning "DNS 설정이 완료되면 https://vsvs.kr 에서 접속 가능합니다."
