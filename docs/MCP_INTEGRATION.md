# 블리CMS MCP (Model Context Protocol) 통합 가이드

## 📋 개요

블리CMS는 Contest Continuity MCP를 통해 프로젝트 컨텍스트를 관리하고, 개발 연속성을 보장합니다.

## 🔧 MCP 서버 설정

### Contest Continuity MCP
- **목적**: 개발 컨텍스트 관리 및 연속성 보장
- **현재 Context ID**: `nextjs-contest-2025-09-05T05-57-07-242Z`
- **이전 Context ID**: `nextjs-contest-2025-09-05T05-54-46-591Z` (Remix)
- **상태**: Active

## 🔄 프레임워크 마이그레이션

### Remix → Next.js 전환
- **마이그레이션 일자**: 2025-09-05
- **이전 프레임워크**: Remix
- **현재 프레임워크**: Next.js
- **마이그레이션 상태**: 진행중

## 📊 프로젝트 분석 결과

### 코드 구조 분석
- **분석된 컴포넌트**: 113개
- **파일 수**: 215개
- **평균 복잡도**: 0.57
- **프레임워크**: Next.js (이전: Remix)

### 품질 메트릭스
- **보안 수준**: Good
- **유지보수성**: 100/100
- **코드 커버리지**: 구현 필요

## 🚀 주요 기능

### 1. 컨텍스트 캡처
```bash
# 현재 개발 상태 캡처
mcp capture-context --name "BleeCMS-Feature-X"
```

### 2. 컨텍스트 복원
```bash
# 이전 개발 상태 복원
mcp resume-context --id "nextjs-contest-2025-09-05T05-54-46-591Z"
```

### 3. 테스트 문서 생성
```bash
# 컨텍스트 기반 테스트 문서 생성
mcp generate-tests --context-id "nextjs-contest-2025-09-05T05-54-46-591Z"
```

## 📁 프로젝트 구조 맵핑

### 핵심 디렉토리
```
blee-cms/
├── app/                    # Remix 애플리케이션
│   ├── components/         # React 컴포넌트 (UI 구성요소)
│   ├── lib/               # 서버사이드 로직 및 유틸리티
│   ├── routes/            # Remix 라우트 (페이지 및 API)
│   └── stores/            # Zustand 상태 관리
├── prisma/                # 데이터베이스 스키마 및 마이그레이션
├── tests/                 # 테스트 파일
└── docs/                  # 프로젝트 문서
```

### 기술 스택 맵핑
- **Frontend**: Remix, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Prisma, PostgreSQL
- **실시간**: Socket.io, Redis
- **인증**: JWT, OAuth (카카오, 네이버)
- **결제**: 토스페이먼츠
- **알림**: 네이버 SENS

## 🔍 코드 패턴 분석

### 컴포넌트 패턴
- Shadcn/ui 기반 컴포넌트 시스템
- React Hook Form 폼 관리
- Zod 스키마 검증

### 데이터 플로우
1. **Client → Route**: 사용자 요청
2. **Route → Loader/Action**: 데이터 처리
3. **Prisma → PostgreSQL**: 데이터베이스 작업
4. **Redis**: 캐싱 및 세션 관리
5. **Socket.io**: 실시간 통신

### 보안 패턴
- CSRF 토큰 보호
- 입력 검증 (Zod)
- JWT 기반 인증
- 환경변수 관리

## 📈 개발 워크플로우

### 1. 기능 개발
```bash
# 컨텍스트 캡처
mcp capture-context --name "feature-name"

# 개발 진행
npm run dev

# 테스트 실행
npm run test
```

### 2. 코드 리뷰
```bash
# 현재 컨텍스트 분석
mcp analyze-context

# 코드 품질 검사
npm run lint
npm run typecheck
```

### 3. 배포 준비
```bash
# 프로덕션 빌드
npm run build

# 테스트 문서 생성
mcp generate-tests
```

## 🔄 연속성 보장 전략

### 개발 중단 시
1. 현재 컨텍스트 자동 저장
2. 작업 내역 문서화
3. 다음 단계 명확화

### 개발 재개 시
1. 컨텍스트 복원
2. 변경사항 확인
3. 테스트 실행

## 📝 베스트 프랙티스

### 코드 작성
- TypeScript 타입 안정성 유지
- Prisma 스키마 일관성
- 컴포넌트 재사용성

### 테스트
- 단위 테스트 우선
- 통합 테스트 필수
- E2E 테스트 자동화

### 문서화
- 코드 변경사항 기록
- API 문서 업데이트
- 사용자 가이드 관리

## 🚨 주의사항

### 보안
- 환경변수 노출 금지
- 민감정보 암호화
- 정기적 보안 감사

### 성능
- 번들 크기 모니터링
- 데이터베이스 쿼리 최적화
- 캐싱 전략 적용

## 📊 모니터링

### 메트릭스
- 응답 시간
- 에러율
- 사용자 활동

### 알림
- 시스템 장애
- 성능 저하
- 보안 이슈

## 🔗 관련 문서

- [개발 설정 가이드](./DEVELOPMENT_SETUP.md)
- [카카오 OAuth 설정](./kakao-oauth-setup.md)
- [네이버 OAuth 설정](./naver-oauth-setup.md)
- [컨텍스트 문서](./CONTEXT_DOCUMENTATION.md)

## 📅 업데이트 이력

- 2025-09-05: MCP 통합 초기 설정
- Context ID: nextjs-contest-2025-09-05T05-54-46-591Z

---

이 문서는 Contest Continuity MCP와 함께 자동으로 관리됩니다.