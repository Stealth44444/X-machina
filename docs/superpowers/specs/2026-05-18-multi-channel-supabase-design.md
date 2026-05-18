# Multi-Channel Platform — Supabase Backend + Dashboard UI
Date: 2026-05-18

## Overview

현재 단일 채널(GYMSPIRE) localStorage 기반 도구를 5개 독립 인스타그램 채널을 운영하는 멀티채널 플랫폼으로 확장한다. 1~2인 공유, 하루 채널당 1~2 포스트, 카드뉴스(이미지 캐러셀) 포맷. 이 문서는 **1단계 — Supabase 백엔드 구축 + 대시보드 UI**만 다룬다.

2단계(Instagram 자동 발행), 3단계(자동 생성 파이프라인)는 별도 스펙으로 관리한다.

---

## Goals

- localStorage 5MB 한도 문제 완전 제거
- 이미지 base64 저장 제거 → Supabase Storage URL로 대체
- 2인 공유 로그인 (Supabase Auth)
- 채널별 독립 작업 공간 및 이력 관리
- 발행 대기 포스트 시각화: 캘린더 + 칸반 결합 대시보드
- 기존 캔버스 편집 환경 완전 보존

---

## 아키텍처

```
Browser (Vanilla JS + Supabase JS SDK v2)
  ├── Auth Screen          로그인
  ├── Dashboard            캘린더 + 칸반 대시보드 (신규)
  └── Canvas Editor        기존 3패널 편집 환경 (보존)

Supabase (cloud)
  ├── Auth                 이메일/비밀번호, 2명 고정
  ├── PostgreSQL           channels / presets / posts
  └── Storage              post-images 버킷

Vercel Serverless (기존 유지)
  ├── /api/generate        AI 포스트 생성
  └── /api/news            뉴스 피드
```

---

## 데이터 모델

### `channels`
```sql
id           uuid  PK
name         text           -- "MMA & 격투기", "위스키 & 와인" 등
topic        text           -- 분류용 슬러그
description  text           -- AI 프롬프트 컨텍스트 (기존 brand_context)
color        text           -- 채널 구분색 hex (#E63946 등)
emoji        text           -- 캘린더/칸반 아이콘 (🥊, 🥃 등)
instagram_handle text
created_by   uuid  FK → auth.users
created_at   timestamptz
```

### `presets`
```sql
id           uuid  PK
channel_id   uuid  FK → channels
name         text           -- 포스트 제목 (AI 첫 슬라이드 title 기본값)
slides_json  jsonb          -- 슬라이드 배열, bgImage는 Storage URL
created_by   uuid  FK → auth.users
created_at   timestamptz
updated_at   timestamptz
```

### `posts`
```sql
id              uuid  PK
channel_id      uuid  FK → channels
preset_id       uuid  FK → presets  (nullable — 직접 생성 포스트)
status          text  CHECK IN ('draft','scheduled','published')
scheduled_at    timestamptz   -- 예약 발행 시각
published_at    timestamptz   -- 실제 발행 시각 (2단계에서 활용)
caption         text
hashtags        text[]
instagram_post_id text        -- 2단계에서 채움
thumbnail_url   text          -- presets 첫 슬라이드 bgImage URL
created_at      timestamptz
```

### Supabase Storage
```
bucket: post-images  (public read, authenticated write)
  {channel_id}/{timestamp}-{random}.jpg
```

이미지 업로드 시 Storage에 직접 저장 → URL을 slides_json에 기록.
로컬 base64 저장 완전 제거.

### Row-Level Security
- 모든 테이블: `authenticated` 역할만 읽기/쓰기
- 별도 소유권 제한 없음 (2인이 모든 채널 공유)

---

## 화면 구조

### 1. Auth Screen
- Supabase Auth UI 컴포넌트 사용
- 이메일/비밀번호 로그인
- 세션 유지 (localStorage Supabase 토큰만 사용)

### 2. Dashboard (신규)

```
┌──────────────────────────────────────────────────────┐
│  GYMSPIRE STUDIO                        [로그아웃]    │
├──────────────────────────────────────────────────────┤
│  [전체채널] [🥊 MMA] [🥃 위스키&와인] [채널3] [+ 추가]  │  ← 채널 필터
├──────────────┬───────────────────────────────────────┤
│              │  ◀  2026년 5월  ▶    [주간 ▾]         │
│  DRAFT  (3)  │  월   화   수   목   금   토   일      │
│  ─────────   │  ──  ──  ──  ──  ──  ──  ──          │
│  🥊 UFC 315  │       🥊       🥃🥊       🥃          │
│  🥃 입문가이드│                                       │
│  🥊 훈련루틴  │  ── 선택한 날짜: 5월 20일 ──          │
│              │                                       │
│  SCHEDULED   │  SCHEDULED(2)     DRAFT(1)           │
│  ─────────   │  ┌──────────┐    ┌──────────┐        │
│  🥊 UFC결과  │  │🥊 UFC결과│    │🥃 보관법 │        │
│  🥃 보관법   │  │  5/20 오전│    │  미예약   │        │
│              │  └──────────┘    └──────────┘        │
│  PUBLISHED   │                                       │
│  ─────────   │  [+ 이 날짜에 새 포스트]               │
│  (접힘)      │                                       │
└──────────────┴───────────────────────────────────────┘
```

**레이아웃 상세:**
- 좌측: 칸반 컬럼 (Draft / Scheduled / Published) — 스크롤 가능
- 우측: 캘린더 (오늘 포함 주간 기본, 월간 토글) + 선택 날짜의 포스트 상세
- 날짜 미선택 시: 칸반은 전체 포스트 표시
- 캘린더 날짜 클릭 → 칸반이 해당 날짜 기준으로 필터링, 선택 날짜 하이라이트
- 칸반 카드 클릭 → 해당 프리셋으로 Canvas Editor 진입
- "예약 설정" → 날짜/시간 인라인 피커
- Published 컬럼 기본 접힘 (토글로 펼치기)

### 3. Canvas Editor (기존 보존)

변경 사항만 나열:
- **저장**: `localStorage.setItem` → `supabase.from('presets').upsert()`
- **불러오기**: `localStorage.getItem` → `supabase.from('presets').select()`
- **이미지 업로드**: base64 → `supabase.storage.upload()` → URL 저장
- **"발행 예약" 버튼 추가**: 날짜/시간 선택 → `posts` 테이블에 status='scheduled' 레코드 생성
- **자동저장**: 1.5초 디바운스 후 Supabase upsert (기존 AUTOSAVE_KEY 대체, 오프라인 시 localStorage 폴백)
- UI 레이아웃, 슬라이드 편집, AI 생성, 히스토리, 내보내기 — 완전 동일

---

## 마이그레이션 계획

기존 사용자 데이터(localStorage) 처리:
1. 로그인 후 최초 1회 `brand_tool_presets_gymspire` 감지
2. 감지 시 → GYMSPIRE 채널로 자동 import (slides_json 변환)
3. 이미지는 base64 그대로 유지 (Storage 재업로드 없음 — 기존 데이터 호환). 단 jsonb 컬럼 크기 제한(1MB/row)으로 인해 base64가 너무 큰 경우 해당 슬라이드 이미지는 유실될 수 있음을 사용자에게 고지
4. import 완료 후 localStorage 전체 clear

---

## 기술 선택

| 항목 | 선택 | 이유 |
|------|------|------|
| Backend | Supabase | Auth + DB + Storage 올인원, 무료 티어 충분 |
| SDK | supabase-js v2 | CDN 로드, 번들러 불필요 |
| Auth | Supabase Auth | 2인 고정, 별도 구현 불필요 |
| Image | Supabase Storage | 무료 1GB, URL 참조로 DB 크기 무관 |
| Hosting | Vercel (기존) | 변경 없음 |
| Frontend | Vanilla JS (기존) | 재작성 없음, SDK만 추가 |

---

## 범위 외 (이 스펙에서 제외)

- Instagram Graph API 연동 (2단계)
- 뉴스 자동 크롤링 / 스케줄 AI 생성 (3단계)
- 채널별 커스텀 템플릿 / 브랜드 테마
- 포스트 분석 / 성과 추적
- 모바일 전용 UI

---

## 성공 기준

- [ ] 로그인 없이 접근 불가
- [ ] 이미지 업로드 후 localStorage 용량 변화 없음
- [ ] 2인이 동시 접속 시 같은 프리셋 목록 공유
- [ ] 캘린더에서 날짜 클릭 → 칸반 필터 동작
- [ ] 기존 캔버스 편집 기능 100% 동작
- [ ] 기존 localStorage 데이터 자동 마이그레이션
