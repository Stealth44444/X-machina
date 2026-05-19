# AI 생성 모달 고도화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 생성 모달의 하드코딩된 Gymshark 전용 옵션을 제거하고, Supabase에 저장된 채널별 독립 옵션(말투/톤/타겟/밀도/앵글)을 동적으로 렌더링하는 시스템으로 교체한다.

**Architecture:** `channels.modal_options JSONB` 컬럼에 채널별 옵션 정의(라벨 + AI 가이드 텍스트)를 저장. 모달 열릴 때 현재 채널의 옵션을 읽어 `#aiOptionsContainer`에 동적 렌더링. `buildAiPrompt()`는 선택된 옵션의 guide 텍스트를 시스템 프롬프트에 주입. `modal_options`가 없는 채널은 `DEFAULT_MODAL_OPTIONS`(기존 GYMSPIRE 옵션 래핑)로 폴백.

**Tech Stack:** Vanilla JS (no bundler), Supabase PostgreSQL JSONB, HTML/CSS

---

## File Structure

- Modify: `supabase-modal-options.sql` — schema 변경 + 5채널 modal_options 데이터
- Modify: `style.css` — `.ai-opt-btn`, `.ai-option-group`, `.ai-option-label`, `.ai-opt-btns` 추가
- Modify: `app.js` — `DEFAULT_MODAL_OPTIONS` 상수, `renderAiOptions()`, `getSelectedGuides()` 추가; `openAiModal()`, `buildAiPrompt()`, `runAiGenerate()`, `initAiModal()` 수정
- Modify: `index.html` — 하드코딩 옵션 버튼 3개 블록 → `#aiOptionsContainer` 교체

---

### Task 1: Supabase 스키마 변경 + modal_options 데이터 SQL 작성

**Files:**
- Create: `supabase-modal-options.sql`

- [ ] **Step 1: 파일 생성**

`supabase-modal-options.sql`을 프로젝트 루트에 생성하고 아래 전체 내용을 붙여넣는다.

```sql
-- AI 모달 옵션 고도화 — Supabase SQL Editor에서 실행
-- 실행 전: SELECT name FROM channels; 로 채널명 확인

BEGIN;

-- 1. 컬럼 추가
ALTER TABLE channels ADD COLUMN IF NOT EXISTS modal_options JSONB;

-- 2. spacelog
UPDATE channels SET modal_options = '{
  "speech": [
    {"id":"editorial","label":"에디토리얼체","guide":"문체: 반드시 ~다 체. ~해요/~어요/~죠 금지. 짧고 선언적인 문장. 설명보다 단언. 여백 있게."},
    {"id":"narrative","label":"서술체","guide":"문체: ~다 체. 흐름 있는 문장, 맥락 설명 허용. 하나의 생각을 끝까지 밀고 가는 단락."},
    {"id":"accessible","label":"친근체","guide":"문체: ~요 체. 독자와 가깝게. 어려운 용어는 괄호 안에 풀어서. 짧은 문장 선호."}
  ],
  "tone": [
    {"id":"critical","label":"비평","guide":"설계 의도를 읽고 평가한다. 좋은 것과 아쉬운 것을 함께. 칭찬 일색 금지."},
    {"id":"sensory","label":"감상","guide":"공간이 만들어내는 감각 묘사 중심. 보여주되 설명하지 않는다."},
    {"id":"info","label":"정보","guide":"수치, 이름, 날짜, 재료 등 팩트 기반. 건물의 규모, 연도, 건축가를 구체적으로."}
  ],
  "target": [
    {"id":"scene","label":"씬 독자","guide":"건축·인테리어를 깊이 아는 독자 기준. 전문 용어 설명 없이 사용."},
    {"id":"beginner","label":"입문자","guide":"처음 접하는 독자도 따라올 수 있게. 핵심 개념은 한 번 설명 후 사용."},
    {"id":"lifestyle","label":"라이프스타일","guide":"공간에 관심은 있지만 전문 지식 없는 층. 감각적 연결과 일상과의 연결 중심."}
  ],
  "depth": [
    {"id":"surface","label":"입문","guide":"전문 용어 최소화. 핵심 사실 1-2개로 압축. 처음 보는 독자가 끝까지 읽을 수 있는 밀도."},
    {"id":"mid","label":"중급","guide":"배경 맥락 포함. 핵심 + 이유 + 시사점 구조. 핵심 용어는 쓰되 짧게 설명."},
    {"id":"deep","label":"심층","guide":"씬 독자 기준. 용어 설명 없이 밀도 있게. 전문 잡지 수준의 깊이."}
  ],
  "angle": [
    {"id":"intent","label":"설계 의도","guide":"만든 사람의 결정 중심. 왜 이 재료인가, 왜 이 동선인가, 무엇을 포기했는가."},
    {"id":"experience","label":"공간 경험","guide":"그 공간에 있는 사람의 감각으로. 빛, 소리, 온도, 동선이 어떻게 느껴지는가."},
    {"id":"context","label":"문화·시대","guide":"이 공간이 왜 지금 등장했는가. 시대적 맥락과 건축 문화 안에서의 위치."}
  ]
}'::jsonb WHERE name = 'spacelog';

-- 3. CAPITALFLOW
UPDATE channels SET modal_options = '{
  "speech": [
    {"id":"analysis","label":"분석체","guide":"문체: ~다 체. 냉정하고 건조하게. 숫자와 팩트 선행. 감탄사·이모지 일절 금지."},
    {"id":"commentary","label":"해설체","guide":"문체: ~다 체. 개념을 쉽게 풀어서. 처음 접하는 용어는 한 번 설명 후 사용."},
    {"id":"conversational","label":"구어체","guide":"문체: ~요/~죠 체. 친구에게 시장 이야기하듯. 단 팩트는 정확하게."}
  ],
  "tone": [
    {"id":"market","label":"시황분석","guide":"지금 시장에서 무슨 일이 일어나는지. 숫자, 방향성, 비교 데이터 중심."},
    {"id":"structure","label":"구조해석","guide":"현상 너머의 원인 구조. 왜 일어났는가의 각도. 표면이 아닌 메커니즘."},
    {"id":"judgment","label":"실전판단","guide":"이 상황에서 어떻게 볼 것인가. 가능성과 리스크를 함께 제시. 확신하는 척 금지."}
  ],
  "target": [
    {"id":"pro","label":"전문 투자자","guide":"시장 구조를 이미 아는 독자. 기초 설명 생략. 바로 분석으로."},
    {"id":"interested","label":"관심층","guide":"경제 뉴스를 읽는 수준. 맥락 포함하되 구조 분석까지. 용어 한 번씩 설명."},
    {"id":"beginner","label":"입문자","guide":"처음 접하는 독자. 핵심 개념부터. 큰 숫자는 비유로 설명."}
  ],
  "depth": [
    {"id":"surface","label":"개요","guide":"핵심 사실과 결론만. 복잡한 메커니즘 생략. 한 슬라이드 = 한 사실."},
    {"id":"mid","label":"중급","guide":"원인과 결과 포함. 배경 맥락과 수치 데이터. 3-4개 레이어."},
    {"id":"deep","label":"심층분석","guide":"구조적 원인부터 시사점까지. 다층적 분석. 전문 리포트 수준의 밀도."}
  ],
  "angle": [
    {"id":"macro","label":"매크로","guide":"글로벌 경제 흐름과 연결. 금리, 환율, 정책, 지정학 방향."},
    {"id":"sector","label":"자산·섹터","guide":"특정 자산군(주식/부동산/코인/원자재) 또는 산업 섹터 포커스."},
    {"id":"behavior","label":"투자행동","guide":"이 상황에서 투자자는 어떻게 볼 것인가. 포지션, 헤지, 리스크 관리 각도."}
  ]
}'::jsonb WHERE name = 'CAPITALFLOW';

-- 4. obscurelife.kr
UPDATE channels SET modal_options = '{
  "speech": [
    {"id":"editorial","label":"에디토리얼체","guide":"문체: ~다 체. 짧고 선언적. 설명 없이 제안. 여백 있게."},
    {"id":"curator","label":"큐레이터체","guide":"문체: ~다 또는 ~요 체. 제안하듯 말하기. 강요하지 않고 이런 것도 있다는 온도."},
    {"id":"accessible","label":"친근체","guide":"문체: ~요 체. 독자와 가깝게. 취향을 나누는 친구처럼. 어렵지 않게."}
  ],
  "tone": [
    {"id":"discovery","label":"발굴·소개","guide":"남들이 모르는 것을 먼저 소개하는 각도. 발견의 기쁨을 전달. 이런 것도 있다."},
    {"id":"critique","label":"비평·해석","guide":"왜 좋은가, 무엇이 특별한가를 분석. 표면보다 한 겹 아래. 설득이 아닌 해석."},
    {"id":"lifestyle","label":"라이프 제안","guide":"어떻게 사는가의 각도. 오브젝트보다 그것을 선택하는 태도 중심."}
  ],
  "target": [
    {"id":"tastemaker","label":"취향 선도층","guide":"이미 감도 높은 독자. 설명 불필요. 디테일과 레퍼런스로 승부."},
    {"id":"aspiring","label":"감도 개발 중","guide":"취향을 만들어가는 층. 왜 좋은지 한 겹 더 설명. 기준을 제시해줄 것."},
    {"id":"vanity","label":"허영심 독자","guide":"있어 보이고 싶은 층. 알면 돋보이는 사실과 맥락 중심. 이걸 알면 달라 보인다."}
  ],
  "depth": [
    {"id":"mood","label":"무드","guide":"분위기와 감각 위주. 설명 최소화. 이미지처럼 읽히는 텍스트."},
    {"id":"mid","label":"맥락 포함","guide":"왜 특별한가의 배경 포함. 브랜드, 역사, 의도를 짧게."},
    {"id":"deep","label":"철학·기원","guide":"이것의 뿌리까지. 철학적 배경, 기원, 문화적 의미를 파고든다."}
  ],
  "angle": [
    {"id":"object","label":"오브젝트·브랜드","guide":"특정 제품, 브랜드, 장소 자체가 왜 특별한가. 디테일과 품질."},
    {"id":"attitude","label":"태도·철학","guide":"어떻게 사는가의 각도. 소비보다 그 선택이 담고 있는 태도와 철학."},
    {"id":"position","label":"문화적 위치","guide":"이것이 문화 안에서 어디에 있는가. 트렌드, 씬, 시대와의 관계."}
  ]
}'::jsonb WHERE name = 'obscurelife.kr';

-- 5. Nightcall.audio
UPDATE channels SET modal_options = '{
  "speech": [
    {"id":"scene","label":"씬 어법","guide":"문체: 씬 안에서 말하는 것처럼. 반말과 구어체 자연스럽게. 팬끼리 대화하는 온도. 격식 없이."},
    {"id":"journalism","label":"저널리즘체","guide":"문체: ~다 체 기사 어조. 팩트 선행, 해석 후행. 감탄 없이 건조하게. 주어 명확하게."},
    {"id":"accessible","label":"친근체","guide":"문체: ~요 체. 힙합을 모르는 사람도 따라올 수 있게. 용어는 풀어서."}
  ],
  "tone": [
    {"id":"release","label":"릴리즈·신보","guide":"새로 나온 음악, 앨범, 프로젝트 소개. 프로듀서 크레딧, 피처링, 샘플 출처 맥락 포함."},
    {"id":"artist","label":"아티스트 포커스","guide":"아티스트 자체를 파고듦. 커리어, 스타일, 씬 내 위치, 이 시점의 의미."},
    {"id":"culture","label":"씬·문화","guide":"음악 너머 힙합 문화권 전체. 패션, 아트, 태도, 언더그라운드와 메인스트림의 관계."}
  ],
  "target": [
    {"id":"scene","label":"씬 팬","guide":"힙합을 깊이 듣는 독자. 크레딧, 샘플, 씬 맥락 직접 언급. 설명 최소화."},
    {"id":"casual","label":"캐주얼 리스너","guide":"즐겨 듣지만 깊이 파지 않는 층. 흥미로운 사실, 맥락 위주. 전문 용어 최소화."},
    {"id":"beginner","label":"입문자","guide":"힙합에 막 관심 갖기 시작한 층. 기본 맥락부터. 아티스트 소개도 포함."}
  ],
  "depth": [
    {"id":"surface","label":"표면 소개","guide":"무엇이 나왔는가, 누가 만들었는가 수준. 가볍게 소개."},
    {"id":"mid","label":"맥락 포함","guide":"이 릴리즈, 아티스트가 씬에서 갖는 맥락. 왜 지금인가."},
    {"id":"deep","label":"씬 이면","guide":"잘 알려지지 않은 사실, 크레딧, 관계, 역사. 씬 팬도 몰랐을 디테일."}
  ],
  "angle": [
    {"id":"sound","label":"음악·사운드","guide":"트랙 자체. 비트, 프로덕션, 가사 구조, 샘플링 기법."},
    {"id":"artist","label":"아티스트·크루","guide":"만든 사람. 배경, 레이블, 크루, 씬 내 관계와 위치."},
    {"id":"culture","label":"문화·패션","guide":"음악 너머 힙합 문화권. 스타일, 비주얼, 아트, 태도와의 연결."}
  ]
}'::jsonb WHERE name = 'Nightcall.audio';

-- 6. mma_seoul
UPDATE channels SET modal_options = '{
  "speech": [
    {"id":"journalism","label":"저널리즘체","guide":"문체: ~다 체 기사 어조. 팩트 선행. 감탄 없이 건조하게. 과장 금지."},
    {"id":"scene","label":"씬 어법","guide":"문체: 씬 안에서 말하는 것처럼. 전문 용어 자연스럽게. 팬끼리 대화하는 온도."},
    {"id":"commentary","label":"해설체","guide":"문체: ~다 체. 모르는 사람도 따라올 수 있게 용어 설명 포함. 경기를 중계하듯 생생하게."}
  ],
  "tone": [
    {"id":"analysis","label":"경기분석","guide":"기술적 관점. 전술, 스타일 매치업, 승패 요인. 감정 배제, 기술로만."},
    {"id":"fighter","label":"선수 포커스","guide":"선수 자체. 커리어, 배경, 이 시점에서의 의미. 이 사람이 누구인가."},
    {"id":"culture","label":"씬·문화","guide":"격투기 산업, 프로모션, 씬 문화. 경기 너머의 맥락."}
  ],
  "target": [
    {"id":"fan","label":"격투기 팬","guide":"경기를 진지하게 보는 독자. 기술, 전술, 커리어 직접 언급. 기초 설명 생략."},
    {"id":"sports","label":"스포츠 관심층","guide":"스포츠는 보지만 격투기 전문 지식 없는 층. 맥락 포함, 용어 한 번씩 설명."},
    {"id":"beginner","label":"입문자","guide":"격투기를 처음 접하는 층. 종목 특성, 규칙부터. 쉽게 진입할 수 있게."}
  ],
  "depth": [
    {"id":"surface","label":"결과·하이라이트","guide":"무슨 일이 있었는가. 결과, 경위, 주요 장면. 가볍게 소화."},
    {"id":"mid","label":"경기 맥락","guide":"왜 이 경기가 성사됐고 어떤 의미인가. 매치업 배경, 타이틀 맥락."},
    {"id":"deep","label":"커리어·씬 의미","guide":"이 승패가 이 선수의 커리어에서, 씬에서 갖는 의미. 다층적 해석."}
  ],
  "angle": [
    {"id":"technique","label":"기술·전술","guide":"어떻게 싸웠는가. 그래플링, 스탠딩, 스타일 매치업, 전술 선택."},
    {"id":"fighter","label":"선수·캐릭터","guide":"누구인가. 커리어, 성격, 씬 내 위치, 팬덤과의 관계."},
    {"id":"business","label":"프로모션·비즈니스","guide":"왜 이 매치업인가. 타이틀, 머니파이트, 프로모터 전략, 중계권 맥락."}
  ]
}'::jsonb WHERE name = 'mma_seoul';

COMMIT;

-- 확인
SELECT name, modal_options IS NOT NULL AS has_options FROM channels ORDER BY created_at;
```

- [ ] **Step 2: Supabase SQL Editor에서 실행**

Supabase 대시보드 → SQL Editor → 위 내용 전체 붙여넣기 → Run.

예상 결과: `5 rows affected` (ALTER + 5× UPDATE), 마지막 SELECT에서 5개 채널 모두 `has_options = true`.

- [ ] **Step 3: 커밋**

```bash
git add supabase-modal-options.sql
git commit -m "feat: add modal_options SQL for 5 channels"
```

---

### Task 2: style.css — 동적 옵션 버튼 스타일 추가

**Files:**
- Modify: `style.css`

- [ ] **Step 1: style.css 파일 열기**

`c:\Users\Sony\Desktop\Gymspire\style.css` 파일에서 기존 `.ai-tone-btn` 스타일 블록을 찾는다. 그 아래에 다음을 추가한다.

- [ ] **Step 2: 스타일 추가**

기존 `.ai-tone-btn` 관련 스타일 다음에 아래를 추가:

```css
/* AI 모달 — 동적 채널별 옵션 */
.ai-option-group {
  margin-bottom: 10px;
}
.ai-option-label {
  display: block;
  font-size: 11px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.ai-opt-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ai-opt-btn {
  padding: 6px 12px;
  border: 1px solid #222;
  background: #111;
  color: #666;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: border-color 0.15s, color 0.15s;
}
.ai-opt-btn.active {
  border-color: #fff;
  color: #e8e8e8;
}
.ai-opt-btn:hover:not(.active) {
  border-color: #333;
  color: #aaa;
}
```

- [ ] **Step 3: 브라우저에서 스타일 확인**

로컬 파일을 브라우저로 열거나 개발 서버에서 AI 모달을 열어 스타일이 깨지지 않는지 확인. (아직 동적 버튼이 없으므로 기존 UI가 그대로 보이면 정상.)

- [ ] **Step 4: 커밋**

```bash
git add style.css
git commit -m "style: add dynamic ai option button styles"
```

---

### Task 3: app.js — DEFAULT_MODAL_OPTIONS 상수 + renderAiOptions() 추가

**Files:**
- Modify: `app.js`

**배경:** `app.js` 1340번째 줄 근처에 `AI_TARGET_GUIDES` 상수가 끝난다. `DEFAULT_MODAL_OPTIONS`는 그 상수들 직후에 정의한다. `renderAiOptions()`는 `openAiModal()` 바로 위에 추가한다.

- [ ] **Step 1: DEFAULT_MODAL_OPTIONS 추가**

`app.js`에서 `AI_TARGET_GUIDES` 상수가 끝나는 `};` 라인(약 1309번째 줄) 바로 다음에 아래를 삽입한다:

```javascript
const DEFAULT_MODAL_OPTIONS = {
  speech: [
    { id: 'friendly', label: '친근 존댓말', guide: AI_SPEECH_GUIDES.friendly },
    { id: 'mz',       label: 'MZ 반말',    guide: AI_SPEECH_GUIDES.mz },
    { id: 'formal',   label: '격식체',      guide: AI_SPEECH_GUIDES.formal },
  ],
  tone: [
    { id: 'casual', label: '캐주얼',   guide: AI_TONE_GUIDES.casual },
    { id: 'hype',   label: '자극',     guide: AI_TONE_GUIDES.hype },
    { id: 'info',   label: '정보성',   guide: AI_TONE_GUIDES.info },
    { id: 'promo',  label: '프로모션', guide: AI_TONE_GUIDES.promo },
  ],
  target: [
    { id: 'all',   label: '전체',  guide: AI_TARGET_GUIDES.all },
    { id: 'women', label: '여성향', guide: AI_TARGET_GUIDES.women },
    { id: 'men',   label: '남성향', guide: AI_TARGET_GUIDES.men },
  ],
  depth: [],
  angle: [],
};
```

- [ ] **Step 2: renderAiOptions() 추가**

`app.js`에서 `function openAiModal()` 정의 바로 위에 아래 함수를 삽입한다:

```javascript
function renderAiOptions(modalOptions) {
  const container = document.getElementById('aiOptionsContainer');
  if (!container) return;
  const groups = ['speech', 'tone', 'target', 'depth', 'angle'];
  const groupLabels = { speech: '말투', tone: '톤', target: '타겟', depth: '밀도', angle: '앵글' };

  container.innerHTML = groups.map(group => {
    const opts = modalOptions?.[group];
    if (!opts?.length) return '';
    return `<div class="ai-option-group">
      <span class="ai-option-label">${groupLabels[group]}</span>
      <div class="ai-opt-btns">
        ${opts.map((o, i) => `<button class="ai-opt-btn${i === 0 ? ' active' : ''}" data-group="${group}" data-id="${o.id}">${o.label}</button>`).join('')}
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.ai-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll(`.ai-opt-btn[data-group="${btn.dataset.group}"]`)
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}
```

- [ ] **Step 3: 커밋**

```bash
git add app.js
git commit -m "feat: add DEFAULT_MODAL_OPTIONS and renderAiOptions()"
```

---

### Task 4: app.js — getSelectedGuides() 추가 + buildAiPrompt() 수정

**Files:**
- Modify: `app.js`

- [ ] **Step 1: getSelectedGuides() 추가**

`renderAiOptions()` 바로 아래, `openAiModal()` 바로 위에 아래 함수를 삽입한다:

```javascript
function getSelectedGuides() {
  const ch = (state.channels || []).find(c => c.id === state.projectId) || {};
  if (!ch.modal_options) return null;
  const container = document.getElementById('aiOptionsContainer');
  if (!container) return null;
  const guides = {};
  ['speech', 'tone', 'target', 'depth', 'angle'].forEach(group => {
    const activeId = container.querySelector(`.ai-opt-btn.active[data-group="${group}"]`)?.dataset.id;
    const opt = ch.modal_options[group]?.find(o => o.id === activeId);
    if (opt?.guide) guides[group] = opt.guide;
  });
  return Object.keys(guides).length ? guides : null;
}
```

- [ ] **Step 2: buildAiPrompt() 수정**

`app.js`에서 `function buildAiPrompt(...)` 내부 `systemMsg` 구성 부분을 찾는다. 현재 코드:

```javascript
  const systemMsg = `${channelBase}

## 카피라이팅 원칙
...
${AI_TONE_GUIDES[tone]}
${AI_SPEECH_GUIDES[speech] || AI_SPEECH_GUIDES.friendly}
${AI_TARGET_GUIDES[target] || AI_TARGET_GUIDES.all}`;
```

아래로 교체한다 (마지막 3줄 `${AI_TONE_GUIDES...}` 블록만 교체):

```javascript
  const guides = getSelectedGuides();
  const optionGuides = guides
    ? Object.values(guides).filter(Boolean).join('\n\n')
    : `${AI_TONE_GUIDES[tone] || ''}
${AI_SPEECH_GUIDES[speech] || AI_SPEECH_GUIDES.friendly}
${AI_TARGET_GUIDES[target] || AI_TARGET_GUIDES.all}`;

  const systemMsg = `${channelBase}

## 카피라이팅 원칙

### title (표지 및 본문 헤드라인)
- 스크롤을 물리적으로 멈추게 만들어야 함. 10-20자.
- 숫자·불완전 문장·의문문·반전 모두 허용
- 절대 금지: 번역체 / "최고의·놀라운·혁신적인·대단한·뛰어난" / 과도한 감탄사 / 빈 수식어

### body (본문)
- 핵심 메시지 → 배경/근거 → 독자 적용 순서로 흐름
- **볼드**는 핵심 수치·이름·키워드만. 슬라이드당 최대 3개
- 짧은 문장 + 긴 문장을 섞어 리듬 생성
- **줄바꿈 필수**: 문장 종결 후 반드시 다음 문장은 새 줄에서 시작
- 2-3문장마다 빈 줄(\\n\\n)로 단락 구분해 시각적 호흡 제공
- 각 슬라이드는 독립적으로 읽혀도 가치 있어야 함
- **body 필드에 CTA 문구 절대 금지**: 구매·클릭 유도 표현은 "cta" 필드에만 작성

### subtitle / cta
- subtitle: title을 보완하는 맥락 1줄. 구매 유도 표현 금지.
- cta 필드가 있는 경우에만 작성.

### 브랜드 특정성
- 완성된 각 슬라이드를 **"이걸 다른 계정 콘텐츠로 바꿔도 말이 되는가?"** 자문할 것
- 된다면 → 이 채널에만 해당하는 사실·수치·이름·에피소드로 다시 쓸 것

### 서사 구조 (필수)
- 슬라이드 1 (표지): 강한 후킹. 다음 슬라이드가 궁금하게 만듦
- 슬라이드 2~N-1: 각각 독립된 가치 단위
- 마지막 슬라이드: **감정·인사이트·여운**으로만 마무리. 행동 촉구, 링크, 팔로우 유도 절대 금지.
${optionGuides}`;
```

- [ ] **Step 3: 커밋**

```bash
git add app.js
git commit -m "feat: add getSelectedGuides() and update buildAiPrompt() to use channel options"
```

---

### Task 5: app.js — openAiModal() + runAiGenerate() + initAiModal() 수정

**Files:**
- Modify: `app.js`

- [ ] **Step 1: openAiModal() 수정**

현재 `openAiModal()` 함수의 `renderAiNewsPreview();` 줄 다음에 한 줄을 추가한다:

```javascript
function openAiModal() {
  const modal = document.getElementById('aiModal');
  modal.style.display = 'flex';
  document.getElementById('aiResultWrap').style.display = 'none';
  document.getElementById('aiApplyBtn').style.display = 'none';
  document.getElementById('aiGenerate').style.display = '';
  document.getElementById('aiGenerate').textContent = '생성하기';
  document.getElementById('aiGenerate').disabled = false;
  const slideTargetToggle = document.getElementById('aiSlideTargetToggle');
  if (slideTargetToggle) {
    slideTargetToggle.checked = false;
    document.getElementById('aiSlideTargetField').style.display = 'none';
  }
  aiPendingSlides = null;
  aiConversationHistory = [];
  aiGenerationHistory = [];
  aiHistoryIdx = -1;
  const histNav = document.getElementById('aiHistoryNav');
  if (histNav) histNav.style.display = 'none';
  renderAiNewsPreview();
  renderAiSlideTargetPicker();
  // ↓ 이 줄 추가
  const ch = (state.channels || []).find(c => c.id === state.projectId) || {};
  renderAiOptions(ch.modal_options || DEFAULT_MODAL_OPTIONS);
  setTimeout(() => document.getElementById('aiKeyword').focus(), 30);
}
```

- [ ] **Step 2: runAiGenerate() 수정**

`runAiGenerate()` 내부에서 `tone`을 읽는 줄을 찾아 교체한다.

현재 코드 (약 1713-1715번째 줄):
```javascript
  const tone = document.querySelector('.ai-tone-btn.active')?.dataset.tone || 'casual';
  const speech = document.querySelector('.ai-speech-btn.active')?.dataset.speech || 'friendly';
  const target = document.querySelector('.ai-target-btn.active')?.dataset.target || 'all';
```

아래로 교체:
```javascript
  const activeToneId = document.querySelector('#aiOptionsContainer .ai-opt-btn.active[data-group="tone"]')?.dataset.id || 'casual';
  const tone = activeToneId; // buildAiPrompt 시그니처 유지용 (getSelectedGuides가 실제 가이드 처리)
  const speech = 'friendly'; // getSelectedGuides로 대체됨, 폴백용 더미값
  const target = 'all';      // getSelectedGuides로 대체됨, 폴백용 더미값
```

그리고 같은 함수 내 temperature 계산 줄:
```javascript
        temperature: tone === 'info' ? 0.65 : 0.80,
```
를 아래로 교체:
```javascript
        temperature: activeToneId === 'info' ? 0.65 : 0.80,
```

- [ ] **Step 3: initAiModal() 수정**

`initAiModal()` 내부에서 `.ai-tone-btn`, `.ai-speech-btn`, `.ai-target-btn` 이벤트 리스너 블록을 제거한다. `renderAiOptions()`가 내부적으로 이벤트를 등록하므로 중복 불필요.

현재 코드 (약 1937-1960번째 줄):
```javascript
  document.querySelectorAll('.ai-tone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-tone-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  // ...
  document.querySelectorAll('.ai-speech-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-speech-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('.ai-target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-target-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
```

위 3개 블록을 전부 삭제한다. `.ai-count-btn` 블록은 유지.

- [ ] **Step 4: 커밋**

```bash
git add app.js
git commit -m "feat: wire renderAiOptions into openAiModal, update runAiGenerate and initAiModal"
```

---

### Task 6: index.html — 하드코딩 옵션 버튼 → aiOptionsContainer 교체

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 하드코딩 블록 교체**

`index.html`에서 아래 블록을 찾는다 (현재 약 143-171번째 줄):

```html
          <div class="ai-options-grid">

            <div class="ai-field ai-field--full">
              <label class="ai-label">콘텐츠 톤</label>
              <div class="ai-tone-row">
                <button class="ai-tone-btn active" data-tone="casual">캐주얼</button>
                <button class="ai-tone-btn" data-tone="hype">자극·동기부여</button>
                <button class="ai-tone-btn" data-tone="info">정보성</button>
                <button class="ai-tone-btn" data-tone="promo">프로모션</button>
              </div>
            </div>

            <div class="ai-field">
              <label class="ai-label">말투</label>
              <div class="ai-tone-row">
                <button class="ai-speech-btn active" data-speech="friendly">친근 존댓말</button>
                <button class="ai-speech-btn" data-speech="mz">MZ 반말</button>
                <button class="ai-speech-btn" data-speech="formal">격식체</button>
              </div>
            </div>

            <div class="ai-field">
              <label class="ai-label">타겟</label>
              <div class="ai-tone-row">
                <button class="ai-target-btn active" data-target="all">전체</button>
                <button class="ai-target-btn" data-target="women">여성향</button>
                <button class="ai-target-btn" data-target="men">남성향</button>
              </div>
            </div>
```

아래로 교체한다:

```html
          <div class="ai-options-grid">

            <div class="ai-field ai-field--full">
              <div id="aiOptionsContainer"></div>
            </div>
```

**주의:** `</div>` 닫힘 태그 이후 `<div class="ai-field ai-field--full">` (뉴스 토글 섹션)은 그대로 유지.

- [ ] **Step 2: 커밋**

```bash
git add index.html
git commit -m "feat: replace hardcoded ai option buttons with aiOptionsContainer"
```

---

### Task 7: 수동 검증

**Files:**
- (없음 — 브라우저에서 확인)

- [ ] **Step 1: Task 1 SQL 실행 확인**

Supabase SQL Editor에서:
```sql
SELECT name, modal_options IS NOT NULL AS has_options FROM channels ORDER BY created_at;
```
5개 채널 모두 `has_options = true` 확인.

- [ ] **Step 2: spacelog 채널 모달 확인**

앱 접속 → spacelog 채널 선택 → AI 생성 모달 열기.

확인 사항:
- 말투: 에디토리얼체 / 서술체 / 친근체 버튼 표시 (기존 친근 존댓말/MZ 반말/격식체 없음)
- 톤: 비평 / 감상 / 정보 버튼 표시
- 타겟: 씬 독자 / 입문자 / 라이프스타일 버튼 표시
- 밀도: 입문 / 중급 / 심층 버튼 표시
- 앵글: 설계 의도 / 공간 경험 / 문화·시대 버튼 표시
- 첫 번째 버튼이 기본 선택(active) 상태

- [ ] **Step 3: spacelog AI 생성 테스트**

키워드: "안도 다다오" → 에디토리얼체 + 비평 + 씬 독자 + 심층 + 설계 의도 선택 → 생성.

합격 기준:
- ~다 체 문체 (해요/죠 없음)
- 설계 의도 각도로 서술
- 씬 어휘 사용 (매스, 물성, 동선 등)

- [ ] **Step 4: CAPITALFLOW 채널 모달 확인**

CAPITALFLOW 채널 선택 → AI 모달 열기.

확인 사항:
- 말투: 분석체 / 해설체 / 구어체 표시
- 톤: 시황분석 / 구조해석 / 실전판단 표시

- [ ] **Step 5: 레거시 폴백 확인**

`modal_options`가 없는 채널이 있다면 해당 채널 선택 → AI 모달.
기존 옵션(친근 존댓말, 캐주얼, 전체 등)이 표시되면 폴백 정상 동작.

- [ ] **Step 6: 채널 전환 시 옵션 갱신 확인**

spacelog → CAPITALFLOW 채널 전환 → AI 모달 열기.
CAPITALFLOW 옵션(분석체/시황분석 등)이 표시되면 정상.

- [ ] **Step 7: 최종 커밋 (변경 없으면 생략)**

```bash
git status
```
수정된 파일이 있으면 커밋.
