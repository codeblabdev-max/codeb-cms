# 서버 배포 및 관리 매뉴얼

## 서버 정보

**서버 주소:** 141.164.60.51
**OS:** Ubuntu 22.04 LTS
**스펙:** 2 vCPU, 16GB RAM, 200GB SSD
**컨테이너 런타임:** Podman
**프로세스 관리:** PM2

---

## 1. 아키텍처 개요

### 1.1 Podman + PM2 조합 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     Host Server (Ubuntu)                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  PM2 (Process Manager)                                       │
│  ├── Project 1 Orchestrator                                  │
│  ├── Project 2 Orchestrator                                  │
│  └── Project N Orchestrator                                  │
│       │                                                       │
│       ├── Podman Container: PostgreSQL                       │
│       ├── Podman Container: Redis                            │
│       └── Podman Container: Application                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 포트 할당 전략

각 프로젝트는 다음과 같은 포트 범위를 사용:

| 프로젝트 | App Port | PostgreSQL | Redis | 설명 |
|---------|----------|------------|-------|------|
| vsvs.kr | 3100 | 5440 | 6390 | CMS 플랫폼 |
| warehouse-rental | 3010 | 5436 | 6310 | 창고 렌탈 |
| codeb-api | 3020 | 5437 | 6320 | CodeB API |
| codeb-web | 3021 | - | - | CodeB Web UI |
| saju-naming | 3030 | 5438 | 6330 | 사주명명 서비스 |
| starpick | 3040 | 5439 | 6340 | 스타픽 플랫폼 |
| starpick-platform | 3041 | 5441 | 6341 | 스타픽 플랫폼 v2 |
| misopin-cms | 3050 | 5442 | 6350 | 미소핀 CMS |

---

## 2. 프로젝트 배포 표준 절차

### 2.1 디렉토리 구조

```
/opt/[project-name]/
├── app/                    # 애플리케이션 소스
├── .env.production         # 환경 변수
├── Dockerfile.production   # Docker 이미지 정의
├── deploy-podman.sh        # 배포 스크립트
├── ecosystem.config.js     # PM2 설정
└── logs/                   # 로그 디렉토리
```

### 2.2 환경 변수 템플릿 (.env.production)

```bash
# 기본 설정
NODE_ENV=production
APP_PORT=3000
DOMAIN=example.com
APP_URL=https://example.com

# 데이터베이스 (Podman 컨테이너)
DATABASE_URL=postgresql://user:password@141.164.60.51:5440/dbname?schema=public
POSTGRES_DB=dbname
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_PORT=5432

# Redis (단일 인스턴스)
USE_REDIS_CLUSTER=false
REDIS_HOST=141.164.60.51
REDIS_PORT=6390

# 보안
JWT_SECRET=random_secret_key_here
ENCRYPTION_KEY=random_encryption_key_here
SESSION_SECRET=random_session_secret_here

# OAuth (선택)
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

### 2.3 Dockerfile.production 템플릿

```dockerfile
# 멀티스테이지 빌드
FROM node:20-alpine AS base
RUN apk add --no-cache curl dumb-init
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production --ignore-scripts && npm cache clean --force
RUN npx prisma generate

FROM base AS builder
RUN apk add --no-cache python3 make g++
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate
COPY . .
ARG NODE_ENV=production
ARG SKIP_ENV_VALIDATION=1
RUN npm run build && npm prune --production

FROM base AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache vips-dev
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/build ./build
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --chown=nextjs:nodejs ./scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /app/uploads /app/logs && chown -R nextjs:nodejs /app/uploads /app/logs
USER nextjs
EXPOSE 3000
ENTRYPOINT ["dumb-init", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "start"]
```

### 2.4 docker-entrypoint.sh 템플릿

```bash
#!/bin/sh
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

# 데이터베이스 시드 (선택적)
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

# 업로드 디렉토리 권한 설정
if [ -d "/app/uploads" ]; then
  chmod -R 755 /app/uploads
fi

# 로그 디렉토리 권한 설정
if [ -d "/app/logs" ]; then
  chmod -R 755 /app/logs
fi

# 애플리케이션 시작
echo "Starting application..."
exec "$@"
```

### 2.5 deploy-podman.sh 템플릿

```bash
#!/bin/bash

# 프로젝트 설정
PROJECT_NAME="your-project"
APP_PORT=3100
POSTGRES_PORT=5440
REDIS_PORT=6390

# 환경 변수 로드
source .env.production

echo "🚀 Deploying ${PROJECT_NAME}..."

# 기존 컨테이너 정리
echo "📦 Cleaning up old containers..."
podman rm -f ${PROJECT_NAME}_postgres 2>/dev/null || true
podman rm -f ${PROJECT_NAME}_redis 2>/dev/null || true
podman rm -f ${PROJECT_NAME}_app 2>/dev/null || true

# PostgreSQL 시작
echo "🐘 Starting PostgreSQL..."
podman run -d --name ${PROJECT_NAME}_postgres \
  -e POSTGRES_DB=${POSTGRES_DB} \
  -e POSTGRES_USER=${POSTGRES_USER} \
  -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
  -p ${POSTGRES_PORT}:5432 \
  -v ${PROJECT_NAME}_pgdata:/var/lib/postgresql/data \
  --restart=unless-stopped \
  postgres:15-alpine

# Redis 시작
echo "📮 Starting Redis..."
podman run -d --name ${PROJECT_NAME}_redis \
  -p ${REDIS_PORT}:6379 \
  -v ${PROJECT_NAME}_redis:/data \
  --restart=unless-stopped \
  redis:7-alpine redis-server --appendonly yes

# 대기
echo "⏳ Waiting for databases to be ready..."
sleep 10

# Docker 이미지 빌드
echo "🔨 Building Docker image..."
podman build -t ${PROJECT_NAME}:latest -f Dockerfile.production .

# 애플리케이션 시작
echo "🎯 Starting application..."
podman run -d --name ${PROJECT_NAME}_app \
  -p ${APP_PORT}:3000 \
  -e NODE_ENV=production \
  -e USE_REDIS_CLUSTER=false \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@141.164.60.51:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public" \
  -e REDIS_HOST="141.164.60.51" \
  -e REDIS_PORT="${REDIS_PORT}" \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
  -e SESSION_SECRET="${SESSION_SECRET}" \
  -v ${PROJECT_NAME}_uploads:/app/uploads \
  -v ${PROJECT_NAME}_logs:/app/logs \
  --restart=unless-stopped \
  localhost/${PROJECT_NAME}:latest

echo "✅ Deployment complete!"
echo "📍 App URL: http://141.164.60.51:${APP_PORT}"
echo ""
echo "Check logs with:"
echo "  podman logs -f ${PROJECT_NAME}_app"
```

### 2.6 PM2 Ecosystem 설정 (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'your-project-orchestrator',
    script: './deploy-podman.sh',
    interpreter: '/bin/bash',
    watch: false,
    autorestart: false,
    max_restarts: 3,
    min_uptime: '10s',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

---

## 3. PM2로 프로젝트 관리

### 3.1 PM2 설치

```bash
npm install -g pm2
```

### 3.2 프로젝트 시작

```bash
cd /opt/your-project
pm2 start ecosystem.config.js
```

### 3.3 상태 확인

```bash
# 전체 프로세스 목록
pm2 list

# 특정 프로젝트 상세 정보
pm2 show your-project-orchestrator

# 로그 확인
pm2 logs your-project-orchestrator

# 실시간 모니터링
pm2 monit
```

### 3.4 프로젝트 재시작

```bash
# 단일 프로젝트
pm2 restart your-project-orchestrator

# 전체 프로젝트
pm2 restart all
```

### 3.5 프로젝트 중지

```bash
pm2 stop your-project-orchestrator
pm2 delete your-project-orchestrator
```

### 3.6 부팅 시 자동 시작

```bash
pm2 startup
pm2 save
```

---

## 4. Podman 컨테이너 관리

### 4.1 컨테이너 상태 확인

```bash
# 모든 컨테이너 목록
podman ps -a

# 실행 중인 컨테이너만
podman ps

# 특정 프로젝트 컨테이너
podman ps -a | grep project-name
```

### 4.2 컨테이너 로그 확인

```bash
# 실시간 로그
podman logs -f project_app

# 최근 100줄
podman logs --tail 100 project_app
```

### 4.3 컨테이너 재시작

```bash
podman restart project_app
```

### 4.4 컨테이너 접속 (디버깅)

```bash
podman exec -it project_app sh
```

### 4.5 볼륨 관리

```bash
# 볼륨 목록
podman volume ls

# 볼륨 상세 정보
podman volume inspect project_pgdata

# 볼륨 삭제 (주의!)
podman volume rm project_pgdata
```

---

## 5. 배포된 프로젝트 목록

### 5.1 vsvs.kr CMS
- **상태:** ✅ 배포 완료
- **포트:** 3100 (App), 5440 (PostgreSQL), 6390 (Redis)
- **디렉토리:** `/opt/vsvs/app`
- **접속:** http://141.164.60.51:3100

### 5.2 warehouse-rental
- **상태:** ⚠️ 재배포 필요
- **포트:** 3010 (App), 5436 (PostgreSQL), 6310 (Redis)
- **디렉토리:** `/opt/warehouse-rental`

### 5.3 codeb-api-server
- **상태:** 🔴 미배포
- **포트:** 3020 (App), 5437 (PostgreSQL), 6320 (Redis)
- **디렉토리:** `/opt/codeb` 또는 `/opt/codeb-v36`

### 5.4 codeb-web
- **상태:** 🔴 미배포
- **포트:** 3021 (App)
- **디렉토리:** `/opt/codeb/codeb-remix`

### 5.5 saju-naming
- **상태:** 🔴 미배포
- **포트:** 3030 (App), 5438 (PostgreSQL), 6330 (Redis)
- **디렉토리:** `/opt/saju-naming`

### 5.6 starpick
- **상태:** 🔴 미배포
- **포트:** 3040 (App), 5439 (PostgreSQL), 6340 (Redis)
- **디렉토리:** `/opt/starpick`

### 5.7 starpick-platform
- **상태:** 🔴 미배포
- **포트:** 3041 (App), 5441 (PostgreSQL), 6341 (Redis)
- **디렉토리:** `/opt/starpick-platform`

### 5.8 misopin-cms
- **상태:** 🔴 미배포
- **포트:** 3050 (App), 5442 (PostgreSQL), 6350 (Redis)
- **디렉토리:** `/opt/Misopin`

---

## 6. 서버 관리 툴 (개발 예정)

### 6.1 기능 요구사항

#### 모니터링 대시보드
- 모든 프로젝트 실시간 상태 확인
- CPU, 메모리, 디스크 사용량 모니터링
- 컨테이너 헬스체크 상태
- 네트워크 트래픽 통계

#### 배포 자동화
- 원클릭 배포
- 롤백 기능
- 환경 변수 관리
- 시크릿 키 자동 생성

#### 로그 뷰어
- 통합 로그 검색
- 실시간 로그 스트리밍
- 에러 필터링 및 알림
- 로그 다운로드

#### 알림 시스템
- 컨테이너 다운 알림
- 디스크 공간 부족 알림
- 높은 CPU/메모리 사용 알림
- 배포 완료/실패 알림

### 6.2 기술 스택 (제안)

```
Frontend: React + TypeScript + Tailwind CSS
Backend: Node.js + Express + Socket.io
Database: SQLite (경량) 또는 PostgreSQL
Authentication: JWT
Real-time: WebSocket
Monitoring: Prometheus + Grafana (선택)
```

### 6.3 API 엔드포인트 (예상)

```
GET  /api/projects              # 모든 프로젝트 목록
GET  /api/projects/:id          # 특정 프로젝트 상세
POST /api/projects/:id/deploy   # 프로젝트 배포
POST /api/projects/:id/restart  # 프로젝트 재시작
POST /api/projects/:id/stop     # 프로젝트 중지
GET  /api/projects/:id/logs     # 프로젝트 로그
GET  /api/system/stats          # 시스템 리소스 통계
GET  /api/containers            # 모든 컨테이너 상태
POST /api/containers/:id/exec   # 컨테이너 명령 실행
```

---

## 7. 트러블슈팅

### 7.1 컨테이너가 시작되지 않을 때

```bash
# 로그 확인
podman logs project_app

# 컨테이너 상태 확인
podman inspect project_app

# 포트 충돌 확인
netstat -tulpn | grep PORT_NUMBER

# 볼륨 권한 확인
podman volume inspect project_uploads
```

### 7.2 데이터베이스 연결 실패

```bash
# PostgreSQL 컨테이너 확인
podman logs project_postgres

# 데이터베이스 접속 테스트
podman exec -it project_postgres psql -U username -d dbname

# 환경 변수 확인
podman exec project_app env | grep DATABASE_URL
```

### 7.3 Redis 연결 실패

```bash
# Redis 컨테이너 확인
podman logs project_redis

# Redis 접속 테스트
podman exec -it project_redis redis-cli ping
```

### 7.4 디스크 공간 부족

```bash
# 디스크 사용량 확인
df -h

# 사용하지 않는 이미지 삭제
podman image prune -a

# 사용하지 않는 볼륨 삭제
podman volume prune

# 로그 파일 정리
find /opt/*/logs -name "*.log" -mtime +7 -delete
```

### 7.5 메모리 부족

```bash
# 메모리 사용량 확인
free -h

# 각 컨테이너 메모리 사용량
podman stats --no-stream

# 스왑 메모리 확인
swapon --show
```

---

## 8. 백업 및 복구

### 8.1 데이터베이스 백업

```bash
# PostgreSQL 백업
podman exec project_postgres pg_dump -U username dbname > backup_$(date +%Y%m%d).sql

# 자동 백업 크론잡 (매일 2시)
0 2 * * * /opt/scripts/backup-databases.sh
```

### 8.2 데이터베이스 복구

```bash
# PostgreSQL 복구
cat backup_20251027.sql | podman exec -i project_postgres psql -U username -d dbname
```

### 8.3 파일 백업 (업로드, 로그)

```bash
# 볼륨 백업
podman run --rm -v project_uploads:/source -v /backup:/backup alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /source .
```

---

## 9. 보안 체크리스트

- [ ] 모든 시크릿 키는 안전하게 생성 (32자 이상 랜덤)
- [ ] `.env.production` 파일 권한 600으로 설정
- [ ] 데이터베이스 포트는 외부 접근 차단 (방화벽)
- [ ] Redis는 비밀번호 설정 (프로덕션 환경)
- [ ] SSL/TLS 인증서 설정 (Caddy 또는 Nginx)
- [ ] 정기적인 보안 업데이트 적용
- [ ] 백업 자동화 설정
- [ ] 로그 로테이션 설정

---

## 10. 성능 최적화

### 10.1 컨테이너 리소스 제한

```bash
podman run -d \
  --memory=2g \
  --cpus=1.5 \
  --name project_app \
  localhost/project:latest
```

### 10.2 PostgreSQL 최적화

```sql
-- shared_buffers 조정
ALTER SYSTEM SET shared_buffers = '4GB';

-- max_connections 조정
ALTER SYSTEM SET max_connections = 200;

-- 설정 적용
SELECT pg_reload_conf();
```

### 10.3 Redis 최적화

```bash
# maxmemory 설정
podman exec project_redis redis-cli CONFIG SET maxmemory 256mb
podman exec project_redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

## 부록: 유용한 스크립트

### A. 전체 프로젝트 상태 확인 스크립트

```bash
#!/bin/bash
# check-all-projects.sh

echo "📊 Server Status Report"
echo "======================="
echo ""

echo "🖥️  System Resources:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
echo "RAM: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3"/"$2" ("$5")"}')"
echo ""

echo "📦 Containers:"
podman ps --format "{{.Names}}: {{.Status}}" | grep -E "(app|postgres|redis)"
echo ""

echo "🔌 Listening Ports:"
netstat -tulpn | grep LISTEN | grep -E "(3[0-9]{3}|5[0-9]{3}|6[0-9]{3})"
```

### B. 빠른 배포 스크립트

```bash
#!/bin/bash
# quick-deploy.sh

PROJECT=$1

if [ -z "$PROJECT" ]; then
  echo "Usage: ./quick-deploy.sh <project-name>"
  exit 1
fi

cd /opt/${PROJECT}
./deploy-podman.sh
pm2 restart ${PROJECT}-orchestrator
```

---

**문서 버전:** 1.0
**최종 수정일:** 2025-10-27
**작성자:** CodeB Server Management Team
