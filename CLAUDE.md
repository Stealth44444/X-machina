# X Machina — CLAUDE.md

## 프로젝트 개요

**X Machina** — 멀티채널 인스타그램 콘텐츠 자동화 플랫폼.  
카드뉴스(이미지 캐러셀) 제작 → 예약 → Instagram Graph API 자동 발행까지 원스톱.

**현재 완료 단계:** 2단계까지 구현 완료.  
**운영 채널 5개:** spacelog(건축·공간), CAPITALFLOW(경제), obscurelife.kr(하이엔드), Nightcall.audio(힙합), mma_seoul(격투기)  
**사용자:** 1~2인 공유, 하루 채널당 1~2 포스트.  
**배포:** https://gymspire.vercel.app (Vercel, `feat/supabase-platform` 브랜치)

---

## 기술 스택

| 항목 | 상세 |
|------|------|
| Frontend | Vanilla JS — 번들러 없음, `<script>` 태그 직접 로드 |
| 폰트 | Pretendard Variable (jsDelivr CDN) |
| Canvas 렌더링 | html2canvas 1.4.1 (cdnjs CDN) |
| Backend | Supabase (Auth + PostgreSQL + Storage) |
| Supabase SDK | supabase-js v2 (CDN UMD, `window.supabase`) |
| Hosting | Vercel — 정적 파일 + `/api/*` serverless functions |
| AI 생성 | OpenAI GPT (`/api/generate.js` 프록시) |
| 뉴스 | `/api/news.js` Vercel serverless (Google News RSS, Bing, NewsAPI, YouTube) |
| Instagram | `/api/publish.js` — Instagram Graph API v19.0 |
| 자동 발행 | `/api/cron-publish.js` — Vercel Cron (15분 간격) |

**중요:** npm 패키지 없음. `package.json` 없음. CDN 전용. Node.js API 함수는 ES module (`export default`) 형식.

---

## 파일 구조

```
/
├── index.html              # 앱 셸 + 전체 DOM 구조 + 스크립트 로드 순서
├── style.css               # 앱 UI 전체 스타일 (캔버스 내부 제외)
├── supabase-client.js      # Supabase 클라이언트 싱글톤 (전역 supabaseClient)
├── db.js                   # channels / presets / posts CRUD 함수
├── storage.js              # 이미지 → Supabase Storage (uploadBgImage, deleteStorageImage)
├── auth.js                 # 로그인 화면 렌더 + handleLogin
├── dashboard.js            # 5채널 컬럼 대시보드 + 채널 설정 모달
├── migrate.js              # localStorage → Supabase 1회 마이그레이션
├── app.js                  # 메인 앱 (상태, 편집기, 캔버스, AI, 예약, 내보내기)
├── templates/
│   ├── cardnews.js         # 기본 템플릿 (window.GYMSPIRE_TEMPLATES에 push)
│   ├── motivation.js       # 동기부여 템플릿
│   ├── product.js          # 제품 소개 템플릿
│   ├── promo.js            # 프로모션 템플릿
│   └── tips.js             # 팁/정보 템플릿
├── api/
│   ├── generate.js         # OpenAI GPT 프록시 (Origin 검증, 분당 10회 rate limit)
│   ├── news.js             # 뉴스 피드 (?keywords= 채널별 키워드)
│   ├── publish.js          # Instagram 캐러셀/단일 발행 (service role key 사용)
│   └── cron-publish.js     # Cron 자동 발행 (publish.js의 publishOne import)
├── vercel.json             # Vercel Cron 스케줄 (*/15 * * * *)
├── supabase-schema.sql     # 초기 스키마 (최초 1회 실행)
├── supabase-channels.sql   # ★ 마이그레이션 — 아직 Supabase에서 실행 안 함
└── CLAUDE.md               # 이 파일
```

**스크립트 로드 순서 (index.html 하단, 순서 중요):**
```
supabase CDN → html2canvas → cardnews.js (+ 나머지 templates)
→ supabase-client.js → db.js → storage.js → auth.js
→ dashboard.js → migrate.js → app.js
```
app.js는 항상 마지막. db.js, storage.js, dashboard.js가 app.js보다 먼저 로드되어야 함.

---

## 환경 변수 (Vercel 대시보드 + .env.local)

```
OPENAI_API_KEY=...               # api/generate.js
YOUTUBE_API_KEY=...              # api/news.js (YouTube 동영상 검색)
NEWSAPI_KEY=...                  # api/news.js (NewsAPI.org)
SUPABASE_URL=https://iivohetwfssykiuyivne.supabase.co   # api/publish.js, cron-publish.js
SUPABASE_SERVICE_ROLE_KEY=...   # api/publish.js, cron-publish.js (RLS 우회, 절대 클라 노출 금지)
CRON_SECRET=...                  # api/cron-publish.js Authorization 헤더 검증
ALLOWED_ORIGINS=https://gymspire.vercel.app   # api/generate.js Origin 화이트리스트
```

**Supabase anon key:** `supabase-client.js`에 하드코딩 (공개키, 노출 OK).  
**Service role key:** 서버사이드 전용. 클라이언트에 절대 포함 금지.  
**Supabase 프로젝트 ID:** `iivohetwfssykiuyivne`  
**레거시 채널 UUID:** `00000000-0000-0000-0000-000000000001` (GYMSPIRE, migrate.js에서 참조)

---

## Supabase 스키마 (전체)

### `channels` 테이블
```sql
id              uuid        PK  default uuid_generate_v4()
name            text        NOT NULL
topic           text                       -- 'cardnews', 'economy', 'mma' 등
description     text                       -- 브랜드 설명 (AI 컨텍스트용)
color           text        default '#2B9BF4'   -- 채널 컬럼 상단 색상
emoji           text        default '💪'        -- 레거시, 사용 안 함
instagram_handle text                      -- 레거시, ig_user_id로 대체됨
created_by      uuid        references auth.users(id)
created_at      timestamptz default now()
-- supabase-channels.sql로 추가된 컬럼:
ig_user_id      text                       -- Instagram Business User ID (숫자 문자열)
ig_access_token text                       -- Long-lived User Access Token
news_keywords   text[]      default '{}'   -- 뉴스 검색 키워드 배열
ai_system_prompt text                      -- 채널별 AI 시스템 프롬프트 (없으면 기본값 사용)
```

### `presets` 테이블
```sql
id          uuid        PK
channel_id  uuid        NOT NULL references channels(id) ON DELETE CASCADE
name        text        NOT NULL    -- 작업 이름 (보통 첫 슬라이드 title)
slides_json jsonb       NOT NULL default '[]'   -- slide 객체 배열 (아래 구조 참고)
created_by  uuid        references auth.users(id)
created_at  timestamptz default now()
updated_at  timestamptz default now()
```

### `posts` 테이블
```sql
id                uuid        PK
channel_id        uuid        NOT NULL references channels(id) ON DELETE CASCADE
preset_id         uuid        references presets(id) ON DELETE SET NULL
status            text        default 'draft'  -- CHECK: 'draft' | 'scheduled' | 'published'
scheduled_at      timestamptz
published_at      timestamptz
caption           text        default ''       -- Instagram 캡션
hashtags          text[]      default '{}'
instagram_post_id text                        -- 발행 후 IG에서 받은 미디어 ID
thumbnail_url     text                        -- 첫 슬라이드 URL (미리보기용)
created_at        timestamptz default now()
-- supabase-channels.sql로 추가된 컬럼:
slide_images      jsonb       default '[]'    -- 렌더링된 슬라이드 이미지 URL 배열 (발행에 사용)
```

**RLS:** authenticated 역할 전체 읽기/쓰기 허용, 소유권 제한 없음 (팀 공유 목적).  
**스토리지 버킷:** `post-images` (public read, authenticated write/delete)  
**이미지 경로 패턴:** `{channel_id}/{timestamp}-{random}.jpg`

### Slide 객체 구조 (slides_json 내 각 요소)
```javascript
{
  bgImage: "https://...",    // Supabase Storage 공개 URL (또는 base64 폴백)
  bgPosX: 50,                // 배경 이미지 X 포지션 (0-100)
  bgPosY: 50,                // 배경 이미지 Y 포지션 (0-100)
  bgDim: 30,                 // 어두운 오버레이 강도 (0-100)
  title: "제목 텍스트",
  body: "본문 텍스트",        // **볼드** 마크다운 지원
  // 텍스트 위치 오프셋 (드래그로 조정)
  _pos_title: { x: 0, y: 0 },
  _pos_body: { x: 0, y: 0 },
  // 텍스트 스타일 오버라이드
  _opacity_title: 100,
  _size_title: 68,
  _color_title: "#ffffff",
}
```

---

## 핵심 전역 상태 (app.js)

```javascript
const state = {
  templateId: 'cardnews',   // 현재 활성 템플릿 ID
  slideIndex: 0,            // 현재 선택된 슬라이드 인덱스
  slides: [{}],             // 슬라이드 객체 배열 (위 구조 참고)
  outroImage: '',           // 아웃트로 슬라이드 배경 이미지 URL
  outroPosX: 50,
  outroPosY: 50,
  selectedDragKey: null,    // 현재 드래그/선택 중인 텍스트 요소 key
  activePresetId: null,     // 현재 로드된 preset UUID (null이면 미저장)
  appMode: 'edit',          // 'edit' | 'news'
  canvasH: 1350,            // 캔버스 높이 (1080=1:1, 1350=4:5, 1920=9:16)
  projectId: 'gymspire',   // 현재 채널 UUID (초기값은 레거시 문자열, 이후 UUID로 교체)
  channels: null,           // dbGetChannels() 결과 — initChannelSystem()에서 로드됨
};
```

**중요:** `state.projectId`는 앱 시작 시 `'gymspire'`(문자열)로 초기화되지만, `initChannelSystem()`이 실행된 후 실제 UUID로 교체됨. `loadChannel()` 호출 시에도 교체.

---

## 앱 초기화 흐름

```
DOMContentLoaded → init() (app.js 맨 아래)
  ↓
supabaseClient.auth.getSession()
  ├─ 세션 없음 → renderAuthScreen() → showAuthScreen() → 로그인 대기
  └─ 세션 있음 → initApp()
       ↓
       runMigrationIfNeeded()   ← localStorage → Supabase 마이그레이션 (1회)
       scaleCanvas()
       renderGallery()
       renderPinterest()
       이벤트 리스너 전부 등록
       initAiModal()
       fetchGymsharkNews()       ← 뉴스 초기 로드 (채널 keywords 사용)
       initRatioBtns()
       initSlideRegen()
       initChannelSystem()       ← Supabase에서 채널 목록 로드
         ↓ 채널 있음
         localStorage에서 마지막 활성 채널 복원 or 첫 번째 채널 선택
         state.channels = channels
         state.projectId = target.id
         loadAutoSave() or loadTemplate('cardnews')
         renderPresets()
         ↓ 채널 없음
         showProjectScreen()    ← 채널 생성 화면
```

---

## 채널 시스템 (중요)

채널은 Supabase `channels` 테이블에 저장. 앱 로드 시 `initChannelSystem()`에서 전부 가져와 `state.channels`에 보관.

**채널 전환:** `loadChannel(channelId)` 호출 → state.projectId 업데이트 → newsCache 초기화(키워드가 채널마다 다름) → localStorage에 마지막 채널 저장 → 해당 채널의 autosave 복원 또는 기본 템플릿 로드 → presets 렌더링

**채널 설정 모달:** dashboard.js의 `openChannelSettings(channelId)` — 이름, 브랜드 설명, 뉴스 키워드, AI 프롬프트, 색상, ig_user_id, ig_access_token 편집 가능.

**레거시 코드 주의 (삭제하지 말 것):**  
`BUILT_IN_PROJECTS`, `getCurrentProject()`, `getProjectContext()`, `getProjectSystemMsg()` — 여전히 파일에 존재하지만 `buildAiPrompt()`에서는 더 이상 사용하지 않음 (채널 시스템으로 대체). 삭제 시 참조 오류 가능성 있으므로 확인 후 정리할 것.

---

## 템플릿 시스템

모든 템플릿은 `window.GYMSPIRE_TEMPLATES` 배열에 push. `app.js`의 `getTemplate(id)` 함수로 접근.

```javascript
// 템플릿 구조
{
  id: 'cardnews',           // 고유 ID
  name: '기본',             // 표시 이름
  defaultSlides: 4,
  maxSlides: 8,
  fields: [                 // 전체 필드 목록
    { key: 'bgImage', label: '배경 이미지', type: 'image', default: '' },
    { key: 'title',   label: '제목',       type: 'textarea', default: '' },
    { key: 'body',    label: '본문',       type: 'textarea', default: '' },
  ],
  fieldsForSlide(index) {   // 슬라이드별 노출 필드 (표지 vs 본문 다름)
    if (index === 0) return ['bgImage', 'title'];
    return ['bgImage', 'title', 'body'];
  },
  render(s, slideIndex, total) {  // HTML 문자열 반환 (canvas에 직접 삽입)
    // 캔버스 내부 스타일은 인라인으로만 작성 (html2canvas CORS 이슈 방지)
  }
}
```

**현재 템플릿:** cardnews(기본), motivation, product, promo, tips  
**캔버스 렌더링 구조:** `buildBgHtml(s)` (배경 레이어) + `template.render(s, idx, total)` (콘텐츠 레이어)  
**아웃트로 슬라이드:** `window.outroSlide()` — **현재 Gymspire 브랜딩 하드코딩됨** (gymspire-logo.png, @gymspire.kr 텍스트). 채널별로 분리 필요 (미구현).

---

## 예약 → 발행 전체 파이프라인

```
1. [클라이언트] 편집기에서 슬라이드 작성
2. [클라이언트] "발행 예약" 버튼 → openScheduleModal()
3. [클라이언트] 날짜/시간 + 캡션 입력 → "예약 등록" → confirmSchedule()
   a. preset 없으면 dbUpsertPreset() → preset UUID 획득
   b. renderSlidesToUrls() — 각 슬라이드를 html2canvas로 1080×1350 JPEG(92%) 렌더링
      → uploadBgImage() → Supabase Storage 업로드 → 공개 URL 배열 반환
   c. dbUpsertPost({ status:'scheduled', slide_images:[...], thumbnail_url, ... })
4. [서버] Vercel Cron (15분마다) → /api/cron-publish
   → Supabase REST로 scheduled_at ≤ 현재시각인 posts 조회
   → 각 post에 publishOne(postId) 호출
5. [서버] publishOne(postId) — api/publish.js
   a. Supabase REST로 post + channel 조회 (service role key)
   b. slide_images 배열 사용 (없으면 preset의 slides_json[].bgImage 폴백)
   c. 이미지 1개 → 단일 컨테이너 → media_publish
      이미지 2-10개 → 각 이미지 carousel item 컨테이너 생성 → carousel 컨테이너 → media_publish
   d. Supabase에 status='published', instagram_post_id 저장
```

**Instagram Graph API 엔드포인트:**
- `POST /{ig-user-id}/media?image_url={url}&is_carousel_item=true&access_token={token}` → creation_id
- `POST /{ig-user-id}/media?media_type=CAROUSEL&children={id1,id2}&caption={}&access_token={}` → carousel_id
- `POST /{ig-user-id}/media_publish?creation_id={}&access_token={}` → ig_post_id

**발행 실패 시:** `api/publish.js`에서 예외 throw → cron에서 catch → results 배열에 `{ok:false, error}` 기록. 재시도 로직 없음 (수동으로 대시보드 "지금 발행" 버튼 재시도).

---

## AI 생성 파이프라인

```
openAiModal() → buildAiPrompt(template, keyword, tone, slideCount, speech, target, newsItems)
  ↓
  채널별 시스템 프롬프트 구성:
    ch = state.channels.find(c => c.id === state.projectId)
    channelBase = ch.ai_system_prompt || 기본 프롬프트 (ch.name + ch.description 사용)
    systemMsg = channelBase + 카피라이팅 원칙 + AI_TONE_GUIDES + AI_SPEECH_GUIDES + AI_TARGET_GUIDES
  ↓
  newsItems: newsCache.items (30분 TTL, 채널 전환 시 초기화)
    newsContext = 최신 뉴스 헤드라인 최대 5개 (관련 있으면 반영)
  ↓
  POST /api/generate { model, messages: [{role:'system',content:systemMsg},{role:'user',content:userMsg}] }
  ↓
  응답: { slides: [ {title, body, ...}, ... ] }
  ↓
  renderAiPreview() → 슬라이드 미리보기 표시
  → "슬라이드에 적용" 버튼으로 state.slides에 적용 (bgImage 등 이미지는 유지)
```

**뉴스 캐시:** `newsCache = { items:[], sources:{}, fetchedAt:0 }` (app.js 전역)  
**뉴스 API 호출:** `/api/news?keywords=키워드1,키워드2` — 채널의 `news_keywords` 배열 join  
**채널 전환 시:** `loadChannel()`에서 newsCache 초기화 → 다음 AI 모달 열 때 재fetch

---

## 뉴스 API (`/api/news.js`)

**파라미터:** `?keywords=comma,separated,list` (없으면 'gymshark' 폴백)

**데이터 소스:**
- Google News RSS: `https://news.google.com/rss/search?q={query}&hl=ko&gl=KR`
- Bing News RSS: `https://www.bing.com/news/search?q={query}&format=rss`
- NewsAPI.org: keywords를 OR로 조합 (`"키워드1" OR "키워드2"`)
- Gymshark Blog (Next.js `__NEXT_DATA__` 파싱): keywords에 'gymshark' 또는 'gymspire' 포함 시에만
- YouTube Data API v3: keywords에 'gymshark' 또는 'gymspire' 포함 시에만

**응답:** `{ items: [{title, date, source, url}], sources: {news:{ok,count}, newsapi, blog, youtube} }`

---

## 대시보드 (`dashboard.js`)

**함수 목록:**
- `showDashboard()` — `.app` 숨기고 대시보드 표시, 채널+포스트 로드
- `hideDashboard()` — 대시보드 숨기고 편집기 복귀
- `renderDashboard()` — 5채널 컬럼 레이아웃 렌더링
- `renderChannelColumn(ch)` — 채널별 컬럼 (status별 카운트, 포스트 카드 목록, 새 포스트 버튼)
- `renderPostCard(post)` — 포스트 카드 (상태 배지, 날짜, 제목, 편집/지금발행 버튼)
- `publishPost(postId, btn)` — `POST /api/publish { post_id }` 호출
- `openPostInEditor(postId, channelId)` — 해당 채널 로드 → preset 로드 → 대시보드 닫기
- `openChannelSettings(channelId)` — 채널 설정 오버레이 모달
- `saveChannelSettings()` — `dbUpsertChannel()` 후 `state.channels` 갱신
- `deleteChannel()` — `dbDeleteChannel()` 후 재렌더링
- `escSafe(str)` — HTML 이스케이프 (dashboard.js 전용, app.js의 `escHtml`과 별개)

**상태:** `dashState = { channels:[], posts:[], editingChannel:null }` — 대시보드 전용 로컬 상태

---

## DB 함수 (`db.js`)

모두 `async/await`, Supabase anon key 사용 (RLS 통과 필요 → 로그인 필수).

```javascript
dbGetChannels()                          // channels 전체, created_at 오름차순
dbUpsertChannel(channel)                 // { id?, name, description, color, emoji, ig_user_id, ... }
dbDeleteChannel(id)                      // ON DELETE CASCADE → presets, posts 연쇄 삭제
dbGetPresets(channelId)                  // 특정 채널 presets, created_at 내림차순
dbUpsertPreset(preset)                   // { id?, channel_id, name, slides_json, ... }
dbDeletePreset(id)
dbGetPosts(channelId)                    // channelId=null이면 전체, presets(name) join 포함
dbGetAllPosts()                          // = dbGetPosts(null)
dbUpsertPost(post)                       // { id?, channel_id, preset_id, status, scheduled_at, caption, slide_images, thumbnail_url, ... }
dbUpdatePostStatus(id, status, scheduledAt?)  // status 변경 전용, published → published_at 자동 설정
```

---

## 이미지 업로드 (`storage.js`)

```javascript
uploadBgImage(dataUrl, channelId)
// → compressImage(dataUrl) — JPEG 80% 압축 (app.js에 정의)
// → Supabase Storage 'post-images/{channelId}/{ts}-{random}.jpg'
// → 실패 시 throw (호출부에서 try/catch로 base64 폴백 처리)
// → 성공 시 공개 URL 반환

deleteStorageImage(url)
// URL에서 path 추출 → Storage 삭제
```

---

## 이미지 처리 규칙

- 배경 이미지 업로드: 항상 `uploadBgImage()` → Storage URL 사용
- 실패 시 `compressImage()` base64를 state에 임시 저장 (autosave 용량 초과 주의)
- localStorage 용량 초과 (`setItem` 실패) 시 자동 감지 → 오래된 preset 퇴출 (quota eviction 로직 있음)
- `renderSlidesToUrls()`: html2canvas로 1080px 렌더링 → JPEG 92% → uploadBgImage 호출
- 렌더링 시 canvas를 `left:-9999px`로 화면 밖으로 이동 → 렌더 완료 후 원위치 + renderCanvas() 재호출

---

## 디자인 규칙 (절대 위반 금지)

### 금지
- **장식 아이콘 금지**: AI 바이브코딩 스타일 이모지(📅 ✦ 💪), 장식적 화살표(↗ ↓ ↩), 의미 없는 특수문자 장식(⊟ ⊞) 전부 금지
- **기능적 아이콘은 허용**: 접기/펼치기 인디케이터(▾ ▸), 닫기(×), UI 상태 표현에 필요한 보조 아이콘은 사용 가능
- **"바이브 코딩" 디자인 금지**: 그라데이션 남용, 네온 효과, 과도한 그림자, purple 계열 그라디언트, 일반적 AI 생성 UI 패턴
- 버튼에 아이콘 단독 사용 금지 — 한국어/영어 텍스트 레이블 필수 (기능 아이콘 보조는 예외)

### 색상 팔레트
- 배경: `#080808` ~ `#1a1a1a` (레이어별 단계)
- 테두리: `#111` (최하단), `#1a1a1a`, `#222`, `#333` (호버)
- 텍스트: `#e8e8e8` (주요), `#888` (보조), `#444` / `#555` (비활성)
- 액센트: `#ffffff` (흰색 — 이전 `#2B9BF4` 블루에서 변경됨)
- 위험: `#a04040`, 위험 호버: `#e05050`

### 레이아웃
- 버튼 최소 높이 36px, 패딩 10px 이상
- 관련 요소는 가깝게, 다른 섹션은 명확히 분리
- 캔버스 내부 스타일은 반드시 인라인 스타일로 (html2canvas 호환)

---

## 주요 알려진 기술 부채

아래 항목들은 현재 동작하지만 다음 세션에서 개선 검토 필요:

1. **아웃트로 슬라이드 하드코딩** (`app.js` `window.outroSlide()` 함수):
   - `gymspire-logo.png` 이미지 하드코딩
   - `@gymspire.kr`, "GYMSHARK 전문 커뮤니티" 텍스트 하드코딩
   - 다른 채널 사용 시 맞지 않음 → 채널별 아웃트로 설정 기능 필요

2. **Pinterest 키워드 하드코딩** (`app.js` `PINTEREST_KEYWORDS` 배열):
   - Gymshark/Gymspire 전용 키워드만 있음
   - 채널별 Pinterest 키워드로 교체 필요

3. **뉴스 모드 버튼 텍스트** (`index.html`의 `#newsModeBtn`):
   - 현재 "GYMSHARK NEWS" 하드코딩
   - 채널 전환 시 동적으로 업데이트되지 않음

4. **cardnews.js 표지 슬라이드 로고**:
   - `template.render()`의 표지(index=0)에 `gymspire-logo.png` 하드코딩
   - 다른 채널은 이 로고가 표시됨

5. **레거시 project 시스템**:
   - `BUILT_IN_PROJECTS`, `getCurrentProject()`, `getProjectContext()`, `getProjectSystemMsg()` 여전히 존재
   - `buildAiPrompt()`는 이미 `state.channels` 직접 사용으로 교체됨
   - 위 함수들은 아직 참조 없이 잔존 → 정리 가능하나 주의

6. **채널 생성 (`showNewProjectModal()`) 기본값**:
   - 새 채널 생성 시 `color: '#2B9BF4'`, `emoji: '📷'` 하드코딩
   - ig_user_id, ig_access_token, news_keywords, ai_system_prompt 미설정 (나중에 설정 모달에서 입력)

---

## 미완료 사용자 액션

### ★ Instagram 자격 증명 설정 (미완료)
각 채널에 대해:
1. Meta Developer App (개발 모드) 생성
2. Instagram Business/Creator 계정 연결
3. Long-lived Access Token 발급 (60일, 자동 갱신 필요)
4. 대시보드 → 채널 설정 모달 → `ig_user_id` (숫자 ID) + `ig_access_token` 입력

### 완료된 항목 (2026-05-18)
- [x] `supabase-channels.sql` Supabase SQL Editor에서 실행 완료
  - channels: `ig_user_id`, `ig_access_token`, `news_keywords`, `ai_system_prompt` 컬럼 추가
  - posts: `slide_images` 컬럼 추가
  - 5개 운영 채널 INSERT (spacelog, CAPITALFLOW, obscurelife.kr, Nightcall.audio, mma_seoul)
- [x] Vercel 환경 변수 추가 완료: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] Vercel 크론 제거 — Hobby 플랜 제한(하루 1회)으로 `vercel.json`에서 crons 블록 삭제
  - 자동 발행 대신 대시보드 "지금 발행" 버튼으로 수동 처리

---

## 완료된 단계 요약

### 1단계 — Supabase 백엔드 + 대시보드
- Supabase Auth (이메일/비밀번호), RLS 정책
- channels / presets / posts 테이블 + Storage 버킷
- localStorage → Supabase 자동 마이그레이션 (1회성, 레거시 사용자 보호)
- 5채널 컬럼 뷰 대시보드 + 채널 설정 모달 (전체 채널 설정 가능)
- 발행 예약 모달 + html2canvas 렌더링 → Supabase 업로드 자동화

### 2단계 — Instagram Graph API 자동 발행
- `/api/publish.js` — 단일/캐러셀 발행 (slide_images 우선, bgImage 폴백)
- `/api/cron-publish.js` — publishOne 로직 (크론은 현재 비활성, 수동 발행으로 운영)
- `/api/news.js` — `?keywords=` 파라미터로 채널별 뉴스 검색
- `buildAiPrompt()` — 채널 `ai_system_prompt` + `description` 기반 동적 프롬프트
- `loadChannel()` — 뉴스 캐시 초기화 (채널별 뉴스 분리)
- Supabase 스키마 확장 + 5개 운영 채널 시드 완료 (2026-05-18)
- Vercel 환경 변수 전체 설정 완료 (2026-05-18)

---

## 다음 단계 후보

### 3단계 — 운영 안정화
- 아웃트로 슬라이드 채널별 커스텀 (로고 이미지, CTA 텍스트, 계정명 설정)
- Instagram Long-lived Token 자동 갱신 (`/api/refresh-token.js` + 별도 cron)
- 발행 실패 시 재시도 로직 + 실패 알림 (Slack webhook 또는 이메일)
- GYMSHARK 채널 정리 (레거시 00000000 UUID 채널 마이그레이션 or 삭제)

### 4단계 — 고도화
- 채널별 Pinterest 키워드 설정
- 뉴스 버튼 채널명 동적 업데이트
- 대시보드 발행 이력 (published 포스트) 카운트 이상 표시 개선
- 템플릿 추가 or 채널별 기본 템플릿 설정

---

## 배포

```bash
vercel --prod
```

브랜치: `feat/supabase-platform`  
프로덕션 URL: https://gymspire.vercel.app  
크론: 비활성 (Vercel Hobby 플랜 제한) — 발행은 대시보드 "지금 발행" 버튼으로 수동 처리

---

## 개발 규칙

### 코드
- 번들러 없음 — npm 패키지 설치 금지, CDN URL만 사용
- 모든 Supabase 클라이언트 호출은 `async/await` + `try/catch`
- `supabaseClient` = `supabase-client.js` 전역 변수 (window 스코프)
- `state` = `app.js` 전역 상태 객체
- 캔버스 내부 스타일은 `cardnews.js` 등 template render 함수의 인라인 스타일로만 (html2canvas 호환)
- `uploadBgImage()` 실패 시 `compressImage()` base64 폴백 — Storage 업로드 오류가 앱을 막으면 안 됨
- autosave는 localStorage 유지 (단일 브라우저 크래시 복구용, Supabase와 독립)
- UUID를 parseInt 하지 말 것 — dataset에서 가져온 ID는 문자열 그대로 사용
- Serverless API 함수에서 Supabase 접근 시 service role key 사용 (RLS 우회), anon key 사용 금지

### 사용자 플로우 우선순위
1. 로그인 → 대시보드 → 채널 선택 → 편집기 진입
2. 편집기: 슬라이드 편집 → AI 생성 → 진행상황 저장 → 발행 예약
3. 대시보드 복귀: 편집기 상단 "대시보드" 버튼
4. 채널 전환: 편집기 상단 "채널" 버튼 → 채널 선택 화면
5. 즉시 발행: 대시보드 포스트 카드 → "지금 발행" 버튼
