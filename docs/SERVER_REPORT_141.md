# 141.164.60.51 서버 현황 리포트

**작성일**: 2025-10-27
**목적**: vsvs.kr 도메인 배포를 위한 서버 환경 분석

---

## 📊 서버 기본 정보

### 시스템 사양
- **호스트명**: vultr
- **OS**: Ubuntu 22.04.5 LTS (Jammy Jellyfish)
- **커널**: Linux 5.15.0-156-generic
- **아키텍처**: x86_64

### 하드웨어
- **CPU**: AMD EPYC-Rome Processor
  - 코어 수: 2
  - 스레드: 2 per core
- **메모리**:
  - 총 16GB
  - 사용 중: 1.4GB (13GB 여유)
  - Swap: 8GB (거의 미사용)
- **디스크**:
  - `/dev/vda2` (루트): 94GB (66% 사용 - 32GB 여유)
  - `/dev/vdb` (블록스토리지): 98GB (6% 사용 - 89GB 여유)

---

## 🐳 컨테이너 환경

### Podman 정보
- **버전**: 3.4.4
- **상태**: 정상 동작
- **실행 중인 컨테이너**: 5개

### 실행 중인 서비스
| 컨테이너명 | 이미지 | 상태 | CPU | 메모리 | 포트 |
|----------|--------|------|-----|--------|------|
| staronpick-app | staronpick-platform | Up 4주 | 9.95% | 104.5MB | - |
| warehouse-rental_web | warehouse-rental_web | Up 10일 | 1.97% | 485.2MB | 3010 |
| warehouse-rental_postgres | postgres:15-alpine | Up 10일 | 6.00% | 32.16MB | 5436 |
| saju-naming-postgres | postgres:15-alpine | Up 12일 | 1.77% | 45.04MB | 5437 |
| saju-naming-redis | redis:7-alpine | Up 12일 | 0.00% | 10.54MB | 6382 |

### Podman 볼륨
- `saju-naming-postgres-data`
- `saju-naming-redis-data`
- `warehouse-rental_postgres_data`
- `celly-creative-data`
- 기타 3개 볼륨

### Podman 네트워크
- `codeb-network` ⚠️ (CNI 버전 경고)
- `warehouse-network`
- `warehouse-rental_warehouse-network`
- `podman` (기본)
- `host`

---

## 🌐 네트워크 서비스

### 포트 사용 현황
| 포트 | 서비스 | 상태 |
|-----|--------|------|
| 80 | Caddy | ✅ 사용 중 |
| 443 | Caddy | ✅ 사용 중 (HTTPS) |
| 3000 | Next.js (staronpick) | ✅ localhost only |
| 3010 | warehouse-rental_web | ✅ 공개 |
| 5432 | PostgreSQL (메인) | ✅ 공개 |
| 5436 | PostgreSQL (warehouse) | ✅ 공개 |
| 5437 | PostgreSQL (saju) | ✅ 공개 |
| 6379 | Redis (메인) | ✅ 공개 |
| 6382 | Redis (saju) | ✅ 공개 |
| 8081 | PowerDNS | ✅ DNS 서버 |
| 8095 | Node.js (demo) | ✅ 공개 |

---

## 🔧 웹 서버 (Caddy)

### Caddy 정보
- **버전**: v2.10.2
- **설정 파일**: `/etc/caddy/Caddyfile`
- **상태**: 정상 동작 (PID 380934)
- **실행 시간**: 10월 23일부터 (4일 이상)

### 현재 서비스 중인 도메인
1. **staronpick.com** (HTTPS)
   - → localhost:3000
   - www 리다이렉트 설정

2. **misopin.one-q.xyz** (HTTP)
   - 정적 사이트: `/var/www/misopin.com`
   - API: → localhost:3001

3. **cms.one-q.xyz** (HTTPS)
   - → localhost:3001

4. **saju.one-q.xyz** (HTTPS)
   - → localhost:10281

5. **saju-naming.one-q.xyz** (HTTPS)
   - → localhost:10281

6. **box.one-q.xyz** (HTTPS)
   - → localhost:3010

7. **starpick.one-q.xyz** (HTTP only)
   - → localhost:3002

### HTTP :80 경로 라우팅
- `/starpick-platform/*` → localhost:3002
- `/starpick/*` → localhost:3000
- `/codeb-web/*` → localhost:8081
- `/codeb-api/*` → localhost:8080
- `/` → localhost:3002 (기본)

---

## 🌍 DNS 서버

### PowerDNS
- **상태**: Active (running)
- **PID**: 377825
- **메모리**: 53.1MB
- **설정 포트**: 8081
- **실행 시간**: 10월 23일부터

### DNS 레코드
- **vsvs.kr**: ❌ 아직 설정되지 않음

---

## 📁 서버 디렉토리 구조

### Caddy 설정 파일 위치
```
/etc/caddy/Caddyfile (메인)
/opt/codeb/Caddyfile
/opt/jump-platform-app/Caddyfile
/root/jump-platform-source/Caddyfile
/root/hr-talent-pipeline/deploy/Caddyfile
```

---

## ⚠️ 주의사항 및 개선 필요 사항

### 보안
1. ✅ Caddy HTTPS 자동 설정 활성화
2. ⚠️ PostgreSQL 포트가 외부에 공개됨 (5432, 5436, 5437)
   - **권장**: 방화벽으로 내부 네트워크만 허용
3. ⚠️ Redis 포트가 외부에 공개됨 (6379, 6382)
   - **권장**: 로컬 호스트만 허용 또는 비밀번호 설정

### 네트워크
1. ⚠️ CNI 플러그인 버전 경고 (Podman 네트워크)
   - `plugin firewall does not support config version "1.0.0"`
   - **영향**: 기능적으로는 동작하지만 경고 로그 발생
   - **권장**: Podman 3.4.4 → 최신 버전 업그레이드 고려

### 디스크
1. ⚠️ 루트 파티션 66% 사용 (32GB 여유)
   - **권장**: 로그 로테이션 설정 확인
   - **블록스토리지**: 89GB 여유 (충분)

### 리소스
1. ✅ 메모리: 13GB 여유 (충분)
2. ✅ CPU: 평균 사용률 낮음
3. ✅ 컨테이너들이 안정적으로 실행 중

---

## 🚀 vsvs.kr 배포 준비 상태

### ✅ 준비 완료
1. Podman 환경 구축
2. Caddy 웹 서버 실행 중
3. PostgreSQL 사용 가능
4. Redis 사용 가능
5. 충분한 디스크 및 메모리 여유
6. 80/443 포트 Caddy에서 관리 중

### 📋 배포 필요 작업
1. **DNS 설정**
   - vsvs.kr A 레코드 → 141.164.60.51
   - www.vsvs.kr CNAME → vsvs.kr
   - PowerDNS 또는 도메인 등록기관에서 설정

2. **Caddy 설정 추가**
   - `/etc/caddy/Caddyfile`에 vsvs.kr 블록 추가
   - 자동 SSL 인증서 발급 (Let's Encrypt)

3. **애플리케이션 배포**
   - Podman Compose로 컨테이너 실행
   - 전용 네트워크 생성 (vsvs-network)
   - PostgreSQL + Redis + App 컨테이너

4. **환경 변수 설정**
   - `.env.production` 파일 생성
   - DB/Redis 연결 정보
   - OAuth 키 설정

---

## 💡 권장 배포 방식

### 옵션 1: 독립 포트 사용 (권장)
- App: localhost:3100
- PostgreSQL: localhost:5440
- Redis: localhost:6390
- Caddy에서 vsvs.kr → localhost:3100 프록시

### 옵션 2: 컨테이너 직접 노출
- App 컨테이너를 외부 포트에 직접 바인딩
- Caddy 없이 직접 HTTPS (Let's Encrypt 필요)

**선택**: 옵션 1 (Caddy 리버스 프록시) 추천
- 기존 설정과 일관성 유지
- 자동 SSL 인증서 관리
- 로드 밸런싱 및 보안 헤더 자동 적용

---

## 📝 다음 단계

1. ✅ 서버 리포트 작성 완료
2. 🔄 DNS vsvs.kr 레코드 설정
3. 🔄 Caddyfile에 vsvs.kr 설정 추가
4. 🔄 Podman Compose로 애플리케이션 배포
5. 🔄 SSL 인증서 자동 발급 확인
6. 🔄 서비스 동작 테스트

---

**작성자**: Claude Code
**서버 관리자**: root@141.164.60.51
