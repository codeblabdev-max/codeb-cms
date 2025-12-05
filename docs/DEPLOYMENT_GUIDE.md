# vsvs.kr 배포 가이드

**도메인**: vsvs.kr
**서버**: 141.164.60.51 (Ubuntu 22.04, Podman 3.4.4, Caddy v2.10.2)
**배포일**: 2025-10-27

---

## 📋 목차
1. [사전 준비](#사전-준비)
2. [DNS 설정](#dns-설정)
3. [환경 변수 설정](#환경-변수-설정)
4. [배포 실행](#배포-실행)
5. [배포 확인](#배포-확인)
6. [트러블슈팅](#트러블슈팅)

---

## 1. 사전 준비

### 필수 파일 확인
```bash
# 프로젝트 루트에서 확인
cd /Users/admin/new_project/codeb-cms

# 필수 파일
ls -l .env.production              # 환경 변수 파일
ls -l docker-compose.podman.yml    # Podman Compose 설정
ls -l Dockerfile.production        # 프로덕션 Dockerfile
ls -l deploy/deploy-vsvs.sh        # 배포 스크립트
ls -l deploy/vsvs-caddy.conf       # Caddy 설정
```

### SSH 접속 확인
```bash
# 서버 접속 테스트
ssh root@141.164.60.51

# 접속 성공 시
exit
```

---

## 2. DNS 설정

### PowerDNS 설정 (서버 내부)

#### A. PowerDNS 데이터베이스 접속
```bash
ssh root@141.164.60.51

# PostgreSQL 접속 (PowerDNS DB)
psql -U pdns -d pdns -h localhost -p 5432
```

#### B. vsvs.kr 도메인 추가
```sql
-- 1. 도메인 추가
INSERT INTO domains (name, type) VALUES ('vsvs.kr', 'MASTER');

-- 2. 도메인 ID 확인
SELECT id FROM domains WHERE name = 'vsvs.kr';
-- 결과 예: id = 1 (실제 ID로 변경)

-- 3. SOA 레코드 추가
INSERT INTO records (domain_id, name, type, content, ttl, prio) VALUES
(1, 'vsvs.kr', 'SOA', 'ns1.vsvs.kr hostmaster.vsvs.kr 1 10800 3600 604800 3600', 86400, NULL);

-- 4. NS 레코드 추가
INSERT INTO records (domain_id, name, type, content, ttl, prio) VALUES
(1, 'vsvs.kr', 'NS', 'ns1.vsvs.kr', 86400, NULL),
(1, 'vsvs.kr', 'NS', 'ns2.vsvs.kr', 86400, NULL);

-- 5. A 레코드 추가 (메인 도메인)
INSERT INTO records (domain_id, name, type, content, ttl, prio) VALUES
(1, 'vsvs.kr', 'A', '141.164.60.51', 3600, NULL);

-- 6. WWW CNAME 추가
INSERT INTO records (domain_id, name, type, content, ttl, prio) VALUES
(1, 'www.vsvs.kr', 'CNAME', 'vsvs.kr', 3600, NULL);

-- 7. 네임서버 A 레코드 (필수)
INSERT INTO records (domain_id, name, type, content, ttl, prio) VALUES
(1, 'ns1.vsvs.kr', 'A', '141.164.60.51', 3600, NULL),
(1, 'ns2.vsvs.kr', 'A', '141.164.60.51', 3600, NULL);

-- 8. 서브도메인 추가 (선택사항)
INSERT INTO records (domain_id, name, type, content, ttl, prio) VALUES
(1, 'api.vsvs.kr', 'A', '141.164.60.51', 3600, NULL),
(1, 'admin.vsvs.kr', 'A', '141.164.60.51', 3600, NULL);

-- 9. 레코드 확인
SELECT * FROM records WHERE domain_id = 1;

-- 10. 종료
\q
```

#### C. PowerDNS 재시작
```bash
systemctl restart pdns
systemctl status pdns
```

### 도메인 등록기관 설정

**vsvs.kr을 구입한 도메인 등록기관(가비아, 후이즈, AWS Route53 등)에서 네임서버 설정:**

```
네임서버 1: ns1.vsvs.kr (141.164.60.51)
네임서버 2: ns2.vsvs.kr (141.164.60.51)
```

또는 직접 A 레코드 설정:
```
vsvs.kr        A    141.164.60.51
www.vsvs.kr    CNAME    vsvs.kr
api.vsvs.kr    A    141.164.60.51
admin.vsvs.kr  A    141.164.60.51
```

### DNS 전파 확인
```bash
# 로컬에서 확인
dig vsvs.kr +short
nslookup vsvs.kr

# 또는 온라인 도구 사용
# https://www.whatsmydns.net/
# https://dnschecker.org/
```

**주의**: DNS 전파는 최대 24-48시간 소요될 수 있습니다.

---

## 3. 환경 변수 설정

### .env.production 파일 생성
```bash
# .env.production.example 복사
cp .env.production.example .env.production

# 편집
nano .env.production
```

### 필수 변경 사항
```bash
# 데이터베이스 비밀번호 변경 (강력한 비밀번호 사용)
POSTGRES_PASSWORD=your_strong_password_here_min_16_chars

# JWT 시크릿 변경 (32자 이상)
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_long_random

# 암호화 키 변경 (32자)
ENCRYPTION_KEY=your_encryption_key_exactly_32_chars

# OAuth 설정 (카카오, 네이버 개발자 센터에서 발급)
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret

NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

### 랜덤 시크릿 생성 (도움말)
```bash
# JWT_SECRET 생성 (32자)
openssl rand -base64 32

# ENCRYPTION_KEY 생성 (정확히 32자)
openssl rand -base64 24
```

---

## 4. 배포 실행

### 자동 배포 스크립트 사용 (권장)
```bash
# 프로젝트 루트에서 실행
cd /Users/admin/new_project/codeb-cms

# 배포 스크립트 실행
./deploy/deploy-vsvs.sh
```

### 수동 배포 (단계별)

#### 4.1. 서버에 디렉토리 생성
```bash
ssh root@141.164.60.51
mkdir -p /opt/vsvs/{app,database,logs,uploads}
```

#### 4.2. 파일 업로드
```bash
# 로컬에서 실행
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'build' \
    ./ root@141.164.60.51:/opt/vsvs/app/
```

#### 4.3. Caddyfile 업데이트
```bash
ssh root@141.164.60.51

# Caddyfile 백업
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup.$(date +%Y%m%d_%H%M%S)

# vsvs.kr 설정 추가
cat /opt/vsvs/app/deploy/vsvs-caddy.conf >> /etc/caddy/Caddyfile

# Caddy 설정 검증
caddy validate --config /etc/caddy/Caddyfile

# Caddy 리로드
caddy reload --config /etc/caddy/Caddyfile
```

#### 4.4. Podman 컨테이너 실행
```bash
cd /opt/vsvs/app

# 이미지 빌드
podman build -t vsvs-cms:latest -f Dockerfile.production .

# 컨테이너 실행
podman-compose -f docker-compose.podman.yml up -d

# 컨테이너 상태 확인
podman ps | grep vsvs
```

#### 4.5. 데이터베이스 마이그레이션
```bash
# 마이그레이션 실행
podman exec vsvs-cms-app npx prisma migrate deploy

# Prisma 클라이언트 생성
podman exec vsvs-cms-app npx prisma generate
```

---

## 5. 배포 확인

### 서비스 상태 확인
```bash
ssh root@141.164.60.51

# 컨테이너 상태
podman ps | grep vsvs

# 애플리케이션 로그
podman logs vsvs-cms-app --tail 50 -f

# 헬스체크
curl http://localhost:3100/api/health

# Caddy 로그
tail -f /var/log/caddy/vsvs.kr.log
```

### 웹 브라우저 확인
1. **HTTP로 접속**: http://vsvs.kr
   - 자동으로 HTTPS로 리다이렉트되어야 함

2. **HTTPS로 접속**: https://vsvs.kr
   - SSL 인증서 자동 발급 (Let's Encrypt)
   - 첫 접속 시 인증서 발급까지 몇 초 소요

3. **헬스체크**: https://vsvs.kr/api/health
   - `{"status":"ok"}` 응답 확인

### SSL 인증서 확인
```bash
# Caddy가 자동으로 Let's Encrypt 인증서 발급
# 인증서 위치: /data/caddy/certificates/

# SSL 테스트
curl -I https://vsvs.kr

# 인증서 만료일 확인
echo | openssl s_client -servername vsvs.kr -connect 141.164.60.51:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 6. 트러블슈팅

### 문제 1: DNS가 연결되지 않음
```bash
# DNS 전파 확인
dig vsvs.kr +short

# 결과가 141.164.60.51이 아니면 DNS 전파 대기 필요
# 임시로 /etc/hosts에 추가하여 테스트 가능
echo "141.164.60.51 vsvs.kr" >> /etc/hosts
```

### 문제 2: 컨테이너가 시작되지 않음
```bash
# 로그 확인
podman logs vsvs-cms-app

# 포트 충돌 확인
ss -tlnp | grep 3100

# 컨테이너 재시작
podman restart vsvs-cms-app
```

### 문제 3: 데이터베이스 연결 오류
```bash
# PostgreSQL 컨테이너 상태 확인
podman ps | grep postgres

# PostgreSQL 로그 확인
podman logs vsvs-cms-postgres

# 데이터베이스 연결 테스트
podman exec vsvs-cms-postgres psql -U vsvs_admin -d vsvs_cms -c "SELECT 1;"
```

### 문제 4: SSL 인증서 발급 실패
```bash
# Caddy 로그 확인
tail -f /var/log/caddy/vsvs.kr.log

# DNS가 제대로 설정되었는지 확인 (필수!)
dig vsvs.kr +short

# Caddy 재시작
systemctl restart caddy
```

### 문제 5: 페이지가 로드되지 않음
```bash
# Nginx/Apache 등 다른 웹서버 확인
ss -tlnp | grep ':80\|:443'

# 방화벽 확인
ufw status

# Caddy가 80/443 포트를 사용하는지 확인
```

---

## 📊 배포 후 체크리스트

- [ ] DNS vsvs.kr → 141.164.60.51 연결 확인
- [ ] HTTPS 자동 리다이렉트 동작 확인
- [ ] SSL 인증서 자동 발급 확인
- [ ] 메인 페이지 접속 확인
- [ ] 로그인/회원가입 동작 확인
- [ ] 데이터베이스 연결 확인
- [ ] Redis 캐시 동작 확인
- [ ] 이미지 업로드 테스트
- [ ] 관리자 페이지 접속 확인
- [ ] 모니터링 설정 (선택사항)

---

## 🔐 보안 권장사항

1. **방화벽 설정**
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ufw enable
   ```

2. **PostgreSQL 외부 접근 차단**
   ```bash
   # docker-compose.podman.yml에서 ports 제거
   # ports:
   #   - "5440:5432"  # 이 줄 주석 처리
   ```

3. **Redis 비밀번호 설정**
   ```bash
   # .env.production에 추가
   REDIS_PASSWORD=your_strong_redis_password
   ```

4. **정기 백업 설정**
   ```bash
   # Cron으로 매일 백업
   0 3 * * * /opt/vsvs/app/scripts/backup-simple.sh
   ```

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 서버 리포트: `docs/SERVER_REPORT_141.md`
2. Caddy 로그: `/var/log/caddy/vsvs.kr.log`
3. 애플리케이션 로그: `podman logs vsvs-cms-app`
4. 데이터베이스 로그: `podman logs vsvs-cms-postgres`

---

**배포 작성자**: Claude Code
**마지막 업데이트**: 2025-10-27
