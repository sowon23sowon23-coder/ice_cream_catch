# Yogurtland 아이스크림 캐처 + 쿠폰 시스템

아이스크림 캐처 게임 + 매장용 쿠폰 검증/사용 처리 시스템 (MVP)

---

## 시스템 아키텍처

```
[게임 웹앱]           [매장 직원]           [관리자]
    │                     │                    │
    ▼                     ▼                    ▼
/api/coupons/issue   /redeem (직원 로그인)  /admin/coupons
    │                     │                    │
    └─────────────────────┼────────────────────┘
                          ▼
                   Supabase PostgreSQL
                  (coupons / redeem_logs)
                          │
                    POS 수동 처리
                 (Aloha Cloud POS 별도)
```

**흐름 요약:**
1. 게임 점수 10점 이상 달성 → `/api/coupons/issue` 호출 → QR 코드 발급
2. 매장 직원 QR 스캔 → `/redeem` 페이지에서 쿠폰 검증
3. 유효 확인 후 [사용 처리] 버튼 클릭 → `/api/coupons/redeem` → DB 원자적 업데이트
4. 직원이 POS에서 수동으로 할인 적용
5. 관리자는 `/admin/coupons`에서 통계/로그 확인

---

## 폴더 구조

```
app/
├── api/
│   ├── coupons/
│   │   ├── issue/route.ts          # 쿠폰 발급 API
│   │   ├── validate/route.ts       # 쿠폰 유효성 검사 API
│   │   ├── redeem/route.ts         # 쿠폰 사용 처리 API (동시성 안전)
│   │   └── info/route.ts           # 쿠폰 정보 조회 (로깅 없음)
│   └── admin/
│       ├── coupon-stats/route.ts   # 관리자 통계
│       ├── coupon-logs/route.ts    # 사용 로그 조회
│       ├── coupons/route.ts        # 쿠폰 목록 조회 / 수동 생성
│       └── coupon-csv/route.ts     # CSV 다운로드
├── coupon/page.tsx                 # 사용자 쿠폰 화면 (QR 코드 표시)
├── redeem/page.tsx                 # 매장 직원용 검증/사용 화면
├── admin/coupons/page.tsx          # 관리자 대시보드
└── lib/
    ├── couponUtils.ts              # 코드 생성, 점수 티어 로직
    └── supabaseServer.ts           # 서버사이드 Supabase 클라이언트

supabase/migrations/
└── 20260319_coupon_system.sql      # DB 스키마 + 시드 데이터
```

---

## DB 스키마

### `coupons`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL | PK |
| code | TEXT UNIQUE | 8자리 영숫자 코드 (예: YG7A92K3) |
| user_id | TEXT | 게임 사용자 ID (nullable) |
| reward_type | TEXT | 보상 유형 (기본: 'discount') |
| discount_amount | INTEGER | 할인 금액 (원, 예: 3000) |
| status | TEXT | unused / used / expired |
| issued_at | TIMESTAMPTZ | 발급 시간 |
| expires_at | TIMESTAMPTZ | 만료 시간 |
| redeemed_at | TIMESTAMPTZ | 사용 시간 |
| redeemed_store_id | TEXT | 사용 매장 ID |
| redeemed_staff_id | TEXT | 처리 직원 ID |
| order_number | TEXT | 주문 번호 (선택) |

### `redeem_logs`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL | PK |
| coupon_id | BIGINT | 쿠폰 FK |
| code | TEXT | 쿠폰 코드 |
| action_type | TEXT | validate / redeem_success / redeem_fail |
| reason | TEXT | 실패 사유 |
| store_id | TEXT | 매장 ID |
| staff_id | TEXT | 직원 ID |
| order_number | TEXT | 주문 번호 |

### `stores`, `staff_users`
매장 및 직원 마스터 데이터 (선택적 사용).

---

## 점수별 쿠폰 발급 기준

| 점수 | 할인 금액 | 유효 기간 |
|------|-----------|-----------|
| 90점 이상 | 3,000원 | 30일 |
| 70점 이상 | 2,000원 | 30일 |
| 50점 이상 | 1,000원 | 30일 |
| 10점 이상 | 1,000원 | 30일 |

---

## API 명세

### `POST /api/coupons/issue`
게임 점수 기반 쿠폰 발급

**요청:**
```json
{ "userId": "user_123", "score": 92 }
```

**응답:**
```json
{
  "success": true,
  "coupon": { "code": "YG7A92K3", "discountAmount": 3000, "expiresAt": "..." },
  "qrPayload": "https://your-domain.com/redeem?code=YG7A92K3"
}
```

---

### `POST /api/coupons/validate`
쿠폰 유효성 검사 (로그 기록 포함)

**요청:**
```json
{ "code": "YG7A92K3" }
```

**응답 (유효):**
```json
{ "valid": true, "status": "unused", "coupon": { ... } }
```

**응답 (사용됨):**
```json
{ "valid": false, "status": "used", "reason": "이미 사용된 쿠폰입니다." }
```

---

### `POST /api/coupons/redeem`
쿠폰 사용 처리 (인증 필요, 동시성 안전)

**헤더:** `Authorization: Bearer <STAFF_TOKEN>`

**요청:**
```json
{
  "code": "YG7A92K3",
  "storeId": "store_001",
  "staffId": "staff_001",
  "orderNumber": "A1024"
}
```

**동시성 처리:** PostgreSQL `SELECT ... FOR UPDATE`를 사용하는 저장 프로시저(`redeem_coupon`)로 처리.
동시에 2개 요청이 오면 1개만 성공, 나머지는 409로 실패.

---

### `GET /api/admin/coupon-stats`
통계 (인증 필요)

### `GET /api/admin/coupon-logs?page=1&limit=20&action_type=redeem_success`
로그 조회 (인증 필요)

### `GET /api/admin/coupons?page=1&status=unused&search=TEST`
쿠폰 목록 (인증 필요)

### `POST /api/admin/coupons`
쿠폰 수동 생성 (인증 필요)

### `GET /api/admin/coupon-csv?type=coupons|logs`
CSV 다운로드 (BOM 포함, Excel 한글 지원)

---

## 화면 목록

| URL | 설명 | 대상 |
|-----|------|------|
| `/` | 게임 메인 | 사용자 |
| `/coupon?code=XXXXXXXX` | 쿠폰 확인 (QR 코드 포함) | 사용자 |
| `/redeem` | 쿠폰 검증/사용 처리 | 매장 직원 |
| `/redeem?code=XXXXXXXX` | QR 스캔 시 직접 진입 | 매장 직원 |
| `/admin/coupons` | 관리자 대시보드 | 관리자 |

---

## 로컬 개발 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.local` 파일을 열고 아래 값을 설정:

| 변수 | 설명 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 (RPC용) | ✅ |
| `ADMIN_PANEL_TOKEN` | 관리자 비밀번호 | ✅ |
| `STAFF_TOKEN` | 직원 비밀번호 (미설정 시 ADMIN_PANEL_TOKEN 사용) | 권장 |
| `NEXT_PUBLIC_BASE_URL` | 배포 URL (QR 코드 URL 생성용) | 권장 |

> **`SUPABASE_SERVICE_ROLE_KEY`** 는 Supabase 대시보드 → Settings → API → `service_role` 키입니다.
> 쿠폰 중복 사용 방지용 원자적 RPC 호출에 필요합니다.

### 3. DB 마이그레이션
Supabase SQL Editor에서 아래 파일을 실행:
```
supabase/migrations/20260319_coupon_system.sql
```

또는 Supabase CLI 사용:
```bash
npx supabase db push
```

### 4. 개발 서버 시작
```bash
npm run dev
```

---

## 배포 (Vercel)

```bash
# Vercel CLI
vercel --prod

# 또는 GitHub 연동 후 자동 배포
```

**Vercel 환경변수 설정:**
Vercel 대시보드 → Settings → Environment Variables에 `.env.local`의 모든 변수 추가.

`NEXT_PUBLIC_BASE_URL`은 배포 후 실제 도메인으로 변경:
```
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

---

## 테스트 시나리오

### 시나리오 1: 기본 쿠폰 발급 및 사용
```
1. 게임 실행 → 50점 이상 달성
2. 화면 하단에 "쿠폰 발급 완료!" 배너 표시
3. "쿠폰 보기" 클릭 → /coupon?code=XXXXXXXX 페이지에서 QR 확인
4. /redeem 접속 → 직원 로그인 (비밀번호: STAFF_TOKEN 값)
5. 코드 입력 후 Enter 또는 "검증" → 초록색 "사용 가능" 표시
6. "사용 처리" 클릭 → "사용 처리 완료" 확인
```

### 시나리오 2: 중복 사용 방지
```
1. 시드 쿠폰 "USED0001" 입력
2. "이미 사용된 쿠폰입니다." 회색 배너 표시
```

### 시나리오 3: 만료 쿠폰
```
1. 시드 쿠폰 "EXPR0001" 입력
2. "만료된 쿠폰입니다." 주황색 배너 표시
```

### 시나리오 4: 동시 사용 방지 (두 탭에서 동시 시도)
```
1. "TEST0001" 코드로 두 탭에서 동시에 [사용 처리] 클릭
2. 한 탭만 성공, 나머지는 409 에러 반환
   → PostgreSQL SELECT FOR UPDATE 기반 원자적 처리
```

### 시나리오 5: QR 스캔 (바코드 웨지 스캐너)
```
1. /redeem 접속
2. 스캐너로 QR 코드 스캔 → 코드 자동 입력
3. Enter 키 → 자동 검증 실행
```

### API 직접 테스트
```bash
# 쿠폰 발급
curl -X POST http://localhost:3000/api/coupons/issue \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","score":92}'

# 쿠폰 검증
curl -X POST http://localhost:3000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST0001"}'

# 쿠폰 사용 처리
curl -X POST http://localhost:3000/api/coupons/redeem \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer staff1234" \
  -d '{"code":"TEST0001","storeId":"store_001","staffId":"staff_001","orderNumber":"A1024"}'

# 관리자 통계
curl http://localhost:3000/api/admin/coupon-stats \
  -H "Authorization: Bearer sowon"
```

---

## 보안 고려사항

- **인증:** STAFF_TOKEN (직원), ADMIN_PANEL_TOKEN (관리자) — 환경변수로 관리
- **동시성:** PostgreSQL `SELECT ... FOR UPDATE` 기반 원자적 처리
- **입력 검증:** 모든 API에 zod 스키마 검증 적용
- **서비스 롤 키:** 서버사이드 전용 (`SUPABASE_SERVICE_ROLE_KEY`), 브라우저에 절대 노출 금지

---

## 시드 테스트 코드

| 코드 | 상태 | 할인 |
|------|------|------|
| `TEST0001` | 미사용 (unused) | 3,000원 |
| `TEST0002` | 미사용 (unused) | 2,000원 |
| `TEST0003` | 미사용 (unused) | 1,000원 |
| `USED0001` | 사용됨 (used) | 3,000원 |
| `EXPR0001` | 만료됨 (expired) | 2,000원 |
