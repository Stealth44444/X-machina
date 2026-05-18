# X Machina — CLAUDE.md

## 프로젝트 개요

**X Machina** — 멀티채널 인스타그램 콘텐츠 자동화 플랫폼. 카드뉴스(이미지 캐러셀) 포맷.  
현재 1단계(Supabase 백엔드 + 대시보드 UI) 완료. 2단계(Instagram 자동 발행) 예정.

Gymspire는 X Machina가 관리하는 채널 중 하나. 운영 채널: GYMSPIRE(피트니스), MMA&격투기, 위스키&와인 등 총 5개 예정.  
사용자 1~2인 공유, 하루 채널당 1~2 포스트.

---

## 기술 스택

| 항목 | 선택 |
|------|------|
| Frontend | Vanilla JS (번들러 없음, `<script>` 태그 로드) |
| Font | Pretendard Variable (jsDelivr CDN) |
| Canvas Export | html2canvas 1.4.1 (cdnjs CDN) |
| Backend | Supabase (Auth + PostgreSQL + Storage) |
| Supabase SDK | supabase-js v2 (CDN UMD) |
| Hosting | Vercel (serverless `/api/*` 포함) |
| AI | OpenAI GPT (Vercel `/api/generate`) |
| News | `/api/news` — Vercel serverless |

---

## 파일 구조

```
/
├── index.html          # 앱 셸, DOM 구조, 스크립트 로드 순서
├── style.css           # 앱 UI 크롬 전체 스타일 (캔버스 내부 스타일 제외)
├── supabase-client.js  # Supabase 클라이언트 싱글톤 (전역 supabaseClient)
├── db.js               # channels / presets / posts CRUD
├── storage.js          # 이미지 업로드 → Supabase Storage
├── auth.js             # 로그인 화면 렌더링 + auth 상태
├── dashboard.js        # 캘린더 + 칸반 대시보드 UI
├── migrate.js          # localStorage → Supabase 1회성 마이그레이션
├── app.js              # 메인 앱 로직 (상태, 편집기, 캔버스, AI, 내보내기)
├── templates/
│   └── cardnews.js     # 카드뉴스 슬라이드 템플릿 (window.GYMSPIRE_TEMPLATES)
├── api/
│   ├── generate.js     # AI 포스트 생성 (OpenAI)
│   └── news.js         # 뉴스 피드
└── CLAUDE.md           # 이 파일
```

**스크립트 로드 순서 (index.html 하단):**
```
supabase CDN → html2canvas → cardnews.js → supabase-client.js → db.js
→ storage.js → auth.js → dashboard.js → migrate.js → app.js
```

---

## 환경 변수 (.env.local)

```
OPENAI_API_KEY=...
YOUTUBE_API_KEY=...
ALLOWED_ORIGINS=https://gymspire.vercel.app
anon_key=...          # Supabase anon public key
service_role_key=...  # Supabase service role key (서버사이드 전용)
project_url=https://iivohetwfssykiuyivne.supabase.co
```

Supabase 프로젝트 ID: `iivohetwfssykiuyivne`  
GYMSPIRE 채널 고정 UUID: `00000000-0000-0000-0000-000000000001`

---

## Supabase 스키마

테이블: `channels`, `presets`, `posts`  
스토리지 버킷: `post-images` (public read)  
RLS: authenticated 역할 전체 읽기/쓰기, 소유권 제한 없음

---

## 배포

```bash
vercel --prod
```

브랜치: `feat/supabase-platform` (현재 개발 브랜치)  
프로덕션 URL: https://gymspire.vercel.app

---

## 개발 규칙

### 코드
- 번들러, npm 패키지 없음 — CDN 전용
- 모든 Supabase 호출은 async/await
- `supabaseClient`는 `supabase-client.js`에 정의된 전역 변수
- `state` 객체는 `app.js`에 정의된 전역 상태
- 캔버스 내부 스타일은 `style.css`가 아닌 `cardnews.js` render 함수 인라인 스타일로 작성 (html2canvas 호환)
- 이미지 업로드 시 항상 `uploadBgImage()` → Supabase Storage URL, 실패 시 `compressImage()` base64 폴백
- autosave는 localStorage 유지 (단일 브라우저 crash 복구용, Supabase와 별개)

### 디자인 원칙
- **아이콘 절대 금지**: 이모지(📅 ✦), 장식적 화살표(↗ ↓ ↩), 특수문자 아이콘(⊟ ⊞) 전부 금지
- **"바이브 코딩" 디자인 금지**: 그라데이션 남용, 네온 효과, 과도한 그림자, 일반적인 AI 생성 UI 패턴 금지
- 버튼은 명확한 한국어/영어 텍스트 레이블 사용
- 마진/패딩은 기능별 계층 구조를 반영할 것 — 관련 요소는 가깝게, 다른 섹션은 명확히 분리
- 최소 터치 타겟: 버튼 높이 36px 이상, 패딩 10px 이상
- 색상: 다크 배경(#080808~#1a1a1a), 액센트 #2B9BF4, 텍스트 계층 #e8e8e8 / #888 / #444

### 사용자 플로우 우선순위
1. 로그인 → 대시보드 → 채널/날짜 선택 → 편집기 진입
2. 편집기 내 흐름: 슬라이드 편집 → AI 생성 → 저장 → 발행 예약
3. 대시보드 복귀: 편집기 상단 "대시보드" 버튼으로 언제든 가능
4. 채널 전환: 편집기 상단 "채널" 버튼 → 채널 선택 화면

---

## 완료된 단계

**1단계 — Supabase 백엔드 + 대시보드**
- [x] Supabase Auth (이메일/비밀번호)
- [x] channels / presets / posts 테이블
- [x] Supabase Storage 이미지 업로드
- [x] localStorage → Supabase 자동 마이그레이션
- [x] 캘린더 + 칸반 대시보드
- [x] 발행 예약 모달

## 다음 단계

**2단계 — Instagram Graph API 자동 발행**  
**3단계 — 뉴스 크롤링 + AI 자동 생성 파이프라인**
