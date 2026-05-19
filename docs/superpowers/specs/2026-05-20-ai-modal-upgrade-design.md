# AI 생성 모달 고도화 Design

## Goal

현재 GYMSPIRE 전용으로 하드코딩된 AI 생성 모달 옵션(말투/톤/타겟)을 5개 채널별 독립 옵션 세트로 교체한다. 밀도(Depth)·앵글(Angle) 2개 축을 신규 추가하여 총 5개 축으로 구성. 옵션 데이터는 Supabase `channels` 테이블에 `modal_options JSONB` 컬럼으로 저장.

---

## Background

### 현재 문제
- `AI_SPEECH_GUIDES`, `AI_TONE_GUIDES`, `AI_TARGET_GUIDES` 상수가 app.js에 하드코딩
- 모든 가이드 텍스트가 Gymshark/피트니스 전용 예시와 맥락으로 작성됨
- 5개 채널(spacelog, CAPITALFLOW, obscurelife.kr, Nightcall.audio, mma_seoul)에 맞지 않는 옵션이 그대로 노출됨
- Depth·Angle 축 부재 — 같은 키워드라도 밀도와 각도를 조절할 수 없음

### 설계 원칙
- 옵션은 생성마다 달리 선택 가능해야 함 (시스템 프롬프트 통합 방식 제외)
- 옵션 데이터(라벨 + AI 가이드 텍스트)는 Supabase DB에 저장 → 배포 없이 수정 가능
- `modal_options`가 없는 채널은 기존 GYMSPIRE 기본값으로 폴백 (하위 호환)
- 대시보드 채널 설정 UI에서 modal_options 편집 기능은 이번 스코프 제외 (SQL로 초기 설정)

---

## 아키텍처

### 데이터 흐름
```
Supabase channels.modal_options (JSONB)
  ↓ dbGetChannels() → state.channels
  ↓ openAiModal() → renderAiOptions()
  ↓ 사용자 옵션 선택
  ↓ runAiGenerate() → getSelectedGuides()
  ↓ buildAiPrompt() → guide 텍스트 시스템 프롬프트에 주입
  ↓ /api/generate → OpenAI GPT
```

### 변경 파일
- **Supabase**: `channels` 테이블에 `modal_options JSONB` 컬럼 추가 + 데이터 입력
- **`index.html`**: 하드코딩 옵션 버튼 → `#aiOptionsContainer` 컨테이너로 교체
- **`app.js`**: `renderAiOptions()` 신규, `buildAiPrompt()` 수정, `getSelectedGuides()` 신규
- **`style.css`**: `.ai-opt-btn`, `.ai-option-group`, `.ai-option-label` 스타일 추가

---

## 데이터 구조

### modal_options JSON 스키마
```json
{
  "speech": [{"id": "string", "label": "string", "guide": "string"}],
  "tone":   [{"id": "string", "label": "string", "guide": "string"}],
  "target": [{"id": "string", "label": "string", "guide": "string"}],
  "depth":  [{"id": "string", "label": "string", "guide": "string"}],
  "angle":  [{"id": "string", "label": "string", "guide": "string"}]
}
```
- 각 축당 3개 옵션
- `guide`: AI 시스템 프롬프트에 직접 주입되는 지시 텍스트
- 첫 번째 옵션이 기본 선택값

---

## 채널별 옵션 정의

### spacelog

**Speech**
```json
[
  {"id": "editorial", "label": "에디토리얼체",
   "guide": "문체: 반드시 ~다 체. ~해요/~어요/~죠 금지. 짧고 선언적인 문장. 설명보다 단언. 여백 있게."},
  {"id": "narrative", "label": "서술체",
   "guide": "문체: ~다 체. 흐름 있는 문장, 맥락 설명 허용. 하나의 생각을 끝까지 밀고 가는 단락."},
  {"id": "accessible", "label": "친근체",
   "guide": "문체: ~요 체. 독자와 가깝게. 어려운 용어는 괄호 안에 풀어서. 짧은 문장 선호."}
]
```

**Tone**
```json
[
  {"id": "critical", "label": "비평",
   "guide": "설계 의도를 읽고 평가한다. 좋은 것과 아쉬운 것을 함께. 칭찬 일색 금지."},
  {"id": "sensory", "label": "감상",
   "guide": "공간이 만들어내는 감각 묘사 중심. 보여주되 설명하지 않는다."},
  {"id": "info", "label": "정보",
   "guide": "수치·이름·날짜·재료 등 팩트 기반. 건물의 규모·연도·건축가를 구체적으로."}
]
```

**Target**
```json
[
  {"id": "scene", "label": "씬 독자",
   "guide": "건축·인테리어를 깊이 아는 독자 기준. 전문 용어 설명 없이 사용."},
  {"id": "beginner", "label": "입문자",
   "guide": "처음 접하는 독자도 따라올 수 있게. 핵심 개념은 한 번 설명 후 사용."},
  {"id": "lifestyle", "label": "라이프스타일",
   "guide": "공간에 관심은 있지만 전문 지식 없는 층. 감각적 연결과 일상과의 연결 중심."}
]
```

**Depth**
```json
[
  {"id": "surface", "label": "입문",
   "guide": "전문 용어 최소화. 핵심 사실 1-2개로 압축. 처음 보는 독자가 끝까지 읽을 수 있는 밀도."},
  {"id": "mid", "label": "중급",
   "guide": "배경 맥락 포함. 핵심 + 이유 + 시사점 구조. 핵심 용어는 쓰되 짧게 설명."},
  {"id": "deep", "label": "심층",
   "guide": "씬 독자 기준. 용어 설명 없이 밀도 있게. 전문 잡지 수준의 깊이."}
]
```

**Angle**
```json
[
  {"id": "intent", "label": "설계 의도",
   "guide": "만든 사람의 결정 중심. 왜 이 재료인가, 왜 이 동선인가, 무엇을 포기했는가."},
  {"id": "experience", "label": "공간 경험",
   "guide": "그 공간에 있는 사람의 감각으로. 빛·소리·온도·동선이 어떻게 느껴지는가."},
  {"id": "context", "label": "문화·시대",
   "guide": "이 공간이 왜 지금 등장했는가. 시대적 맥락과 건축 문화 안에서의 위치."}
]
```

---

### CAPITALFLOW

**Speech**
```json
[
  {"id": "analysis", "label": "분석체",
   "guide": "문체: ~다 체. 냉정하고 건조하게. 숫자와 팩트 선행. 감탄사·이모지 일절 금지."},
  {"id": "commentary", "label": "해설체",
   "guide": "문체: ~다 체. 개념을 쉽게 풀어서. 처음 접하는 용어는 한 번 설명 후 사용."},
  {"id": "conversational", "label": "구어체",
   "guide": "문체: ~요/~죠 체. 친구에게 시장 이야기하듯. 단 팩트는 정확하게."}
]
```

**Tone**
```json
[
  {"id": "market", "label": "시황분석",
   "guide": "지금 시장에서 무슨 일이 일어나는지. 숫자·방향성·비교 데이터 중심."},
  {"id": "structure", "label": "구조해석",
   "guide": "현상 너머의 원인 구조. '왜 일어났는가'의 각도. 표면이 아닌 메커니즘."},
  {"id": "judgment", "label": "실전판단",
   "guide": "이 상황에서 어떻게 볼 것인가. 가능성과 리스크를 함께 제시. 확신하는 척 금지."}
]
```

**Target**
```json
[
  {"id": "pro", "label": "전문 투자자",
   "guide": "시장 구조를 이미 아는 독자. 기초 설명 생략. 바로 분석으로."},
  {"id": "interested", "label": "관심층",
   "guide": "경제 뉴스를 읽는 수준. 맥락 포함하되 구조 분석까지. 용어 한 번씩 설명."},
  {"id": "beginner", "label": "입문자",
   "guide": "처음 접하는 독자. 핵심 개념부터. 큰 숫자는 비유로 설명."}
]
```

**Depth**
```json
[
  {"id": "surface", "label": "개요",
   "guide": "핵심 사실과 결론만. 복잡한 메커니즘 생략. 한 슬라이드 = 한 사실."},
  {"id": "mid", "label": "중급",
   "guide": "원인과 결과 포함. 배경 맥락과 수치 데이터. 3-4개 레이어."},
  {"id": "deep", "label": "심층분석",
   "guide": "구조적 원인부터 시사점까지. 다층적 분석. 전문 리포트 수준의 밀도."}
]
```

**Angle**
```json
[
  {"id": "macro", "label": "매크로",
   "guide": "글로벌 경제 흐름과 연결. 금리·환율·정책·지정학 방향."},
  {"id": "sector", "label": "자산·섹터",
   "guide": "특정 자산군(주식/부동산/코인/원자재) 또는 산업 섹터 포커스."},
  {"id": "behavior", "label": "투자행동",
   "guide": "이 상황에서 투자자는 어떻게 볼 것인가. 포지션·헤지·리스크 관리 각도."}
]
```

---

### obscurelife.kr

**Speech**
```json
[
  {"id": "editorial", "label": "에디토리얼체",
   "guide": "문체: ~다 체. 짧고 선언적. 설명 없이 제안. 여백 있게."},
  {"id": "curator", "label": "큐레이터체",
   "guide": "문체: ~다 또는 ~요 체. 제안하듯 말하기. 강요하지 않고 '이런 것도 있어요'의 온도."},
  {"id": "accessible", "label": "친근체",
   "guide": "문체: ~요 체. 독자와 가깝게. 취향을 나누는 친구처럼. 어렵지 않게."}
]
```

**Tone**
```json
[
  {"id": "discovery", "label": "발굴·소개",
   "guide": "남들이 모르는 것을 먼저 소개하는 각도. 발견의 기쁨을 전달. '이런 것도 있다'."},
  {"id": "critique", "label": "비평·해석",
   "guide": "왜 좋은가, 무엇이 특별한가를 분석. 표면보다 한 겹 아래. 설득이 아닌 해석."},
  {"id": "lifestyle", "label": "라이프 제안",
   "guide": "어떻게 살 것인가의 각도. 오브젝트보다 그것을 선택하는 태도 중심."}
]
```

**Target**
```json
[
  {"id": "tastemaker", "label": "취향 선도층",
   "guide": "이미 감도 높은 독자. 설명 불필요. 디테일과 레퍼런스로 승부."},
  {"id": "aspiring", "label": "감도 개발 중",
   "guide": "취향을 만들어가는 층. 왜 좋은지 한 겹 더 설명. 기준을 제시해줄 것."},
  {"id": "vanity", "label": "허영심 독자",
   "guide": "있어 보이고 싶은 층. 알면 돋보이는 사실과 맥락 중심. '이걸 알면 달라 보인다'."}
]
```

**Depth**
```json
[
  {"id": "mood", "label": "무드",
   "guide": "분위기와 감각 위주. 설명 최소화. 이미지처럼 읽히는 텍스트."},
  {"id": "mid", "label": "맥락 포함",
   "guide": "왜 특별한가의 배경 포함. 브랜드·역사·의도를 짧게."},
  {"id": "deep", "label": "철학·기원",
   "guide": "이것의 뿌리까지. 철학적 배경·기원·문화적 의미를 파고든다."}
]
```

**Angle**
```json
[
  {"id": "object", "label": "오브젝트·브랜드",
   "guide": "특정 제품·브랜드·장소 자체가 왜 특별한가. 디테일과 품질."},
  {"id": "attitude", "label": "태도·철학",
   "guide": "어떻게 사는가의 각도. 소비보다 그 선택이 담고 있는 태도와 철학."},
  {"id": "position", "label": "문화적 위치",
   "guide": "이것이 문화 안에서 어디에 있는가. 트렌드·씬·시대와의 관계."}
]
```

---

### Nightcall.audio

**Speech**
```json
[
  {"id": "scene", "label": "씬 어법",
   "guide": "문체: 씬 안에서 말하는 것처럼. 반말과 구어체 자연스럽게. 팬끼리 대화하는 온도. 격식 없이."},
  {"id": "journalism", "label": "저널리즘체",
   "guide": "문체: ~다 체 기사 어조. 팩트 선행, 해석 후행. 감탄 없이 건조하게. 주어 명확하게."},
  {"id": "accessible", "label": "친근체",
   "guide": "문체: ~요 체. 힙합을 모르는 사람도 따라올 수 있게. 용어는 풀어서."}
]
```

**Tone**
```json
[
  {"id": "release", "label": "릴리즈·신보",
   "guide": "새로 나온 음악·앨범·프로젝트 소개. 프로듀서 크레딧·피처링·샘플 출처 맥락 포함."},
  {"id": "artist", "label": "아티스트 포커스",
   "guide": "아티스트 자체를 파고듦. 커리어·스타일·씬 내 위치·이 시점의 의미."},
  {"id": "culture", "label": "씬·문화",
   "guide": "음악 너머 힙합 문화권 전체. 패션·아트·태도·언더그라운드와 메인스트림의 관계."}
]
```

**Target**
```json
[
  {"id": "scene", "label": "씬 팬",
   "guide": "힙합을 깊이 듣는 독자. 크레딧·샘플·씬 맥락 직접 언급. 설명 최소화."},
  {"id": "casual", "label": "캐주얼 리스너",
   "guide": "즐겨 듣지만 깊이 파지 않는 층. 흥미로운 사실·맥락 위주. 전문 용어 최소화."},
  {"id": "beginner", "label": "입문자",
   "guide": "힙합에 막 관심 갖기 시작한 층. 기본 맥락부터. 아티스트 소개도 포함."}
]
```

**Depth**
```json
[
  {"id": "surface", "label": "표면 소개",
   "guide": "무엇이 나왔는가, 누가 만들었는가 수준. 가볍게 소개."},
  {"id": "mid", "label": "맥락 포함",
   "guide": "이 릴리즈·아티스트가 씬에서 갖는 맥락. 왜 지금인가."},
  {"id": "deep", "label": "씬 이면",
   "guide": "잘 알려지지 않은 사실·크레딧·관계·역사. 씬 팬도 몰랐을 디테일."}
]
```

**Angle**
```json
[
  {"id": "sound", "label": "음악·사운드",
   "guide": "트랙 자체. 비트·프로덕션·가사 구조·샘플링 기법."},
  {"id": "artist", "label": "아티스트·크루",
   "guide": "만든 사람. 배경·레이블·크루·씬 내 관계와 위치."},
  {"id": "culture", "label": "문화·패션",
   "guide": "음악 너머 힙합 문화권. 스타일·비주얼·아트·태도와의 연결."}
]
```

---

### mma_seoul

**Speech**
```json
[
  {"id": "journalism", "label": "저널리즘체",
   "guide": "문체: ~다 체 기사 어조. 팩트 선행. 감탄 없이 건조하게. 과장 금지."},
  {"id": "scene", "label": "씬 어법",
   "guide": "문체: 씬 안에서 말하는 것처럼. 전문 용어 자연스럽게. 팬끼리 대화하는 온도."},
  {"id": "commentary", "label": "해설체",
   "guide": "문체: ~다 체. 모르는 사람도 따라올 수 있게 용어 설명 포함. 경기를 중계하듯 생생하게."}
]
```

**Tone**
```json
[
  {"id": "analysis", "label": "경기분석",
   "guide": "기술적 관점. 전술·스타일 매치업·승패 요인. 감정 배제, 기술로만."},
  {"id": "fighter", "label": "선수 포커스",
   "guide": "선수 자체. 커리어·배경·이 시점에서의 의미. 이 사람이 누구인가."},
  {"id": "culture", "label": "씬·문화",
   "guide": "격투기 산업·프로모션·씬 문화. 경기 너머의 맥락."}
]
```

**Target**
```json
[
  {"id": "fan", "label": "격투기 팬",
   "guide": "경기를 진지하게 보는 독자. 기술·전술·커리어 직접 언급. 기초 설명 생략."},
  {"id": "sports", "label": "스포츠 관심층",
   "guide": "스포츠는 보지만 격투기 전문 지식 없는 층. 맥락 포함, 용어 한 번씩 설명."},
  {"id": "beginner", "label": "입문자",
   "guide": "격투기를 처음 접하는 층. 종목 특성·규칙부터. 쉽게 진입할 수 있게."}
]
```

**Depth**
```json
[
  {"id": "surface", "label": "결과·하이라이트",
   "guide": "무슨 일이 있었는가. 결과·경위·주요 장면. 가볍게 소화."},
  {"id": "mid", "label": "경기 맥락",
   "guide": "왜 이 경기가 성사됐고 어떤 의미인가. 매치업 배경·타이틀 맥락."},
  {"id": "deep", "label": "커리어·씬 의미",
   "guide": "이 승패가 이 선수의 커리어에서, 씬에서 갖는 의미. 다층적 해석."}
]
```

**Angle**
```json
[
  {"id": "technique", "label": "기술·전술",
   "guide": "어떻게 싸웠는가. 그래플링·스탠딩·스타일 매치업·전술 선택."},
  {"id": "fighter", "label": "선수·캐릭터",
   "guide": "누구인가. 커리어·성격·씬 내 위치·팬덤과의 관계."},
  {"id": "business", "label": "프로모션·비즈니스",
   "guide": "왜 이 매치업인가. 타이틀·머니파이트·프로모터 전략·중계권 맥락."}
]
```

---

## 코드 변경 상세

### index.html

기존 하드코딩 버튼 블록 제거 → 컨테이너 1개로 교체:
```html
<!-- 기존: .ai-tone-btn, .ai-speech-btn, .ai-target-btn 블록 전부 제거 -->
<div id="aiOptionsContainer"></div>
```

### app.js — renderAiOptions()

```javascript
function renderAiOptions(modalOptions) {
  const container = document.getElementById('aiOptionsContainer');
  if (!container) return;
  const groups = ['speech', 'tone', 'target', 'depth', 'angle'];
  const groupLabels = {
    speech: '말투', tone: '톤', target: '타겟', depth: '밀도', angle: '앵글'
  };
  container.innerHTML = groups.map(group => {
    const opts = modalOptions?.[group];
    if (!opts?.length) return '';
    return `<div class="ai-option-group">
      <span class="ai-option-label">${groupLabels[group]}</span>
      <div class="ai-opt-btns">
        ${opts.map((o, i) => `
          <button class="ai-opt-btn${i === 0 ? ' active' : ''}"
                  data-group="${group}" data-id="${o.id}">
            ${o.label}
          </button>`).join('')}
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

### app.js — DEFAULT_MODAL_OPTIONS (폴백용 상수)

기존 GYMSPIRE 옵션을 새 포맷으로 변환한 기본값. `modal_options`가 없는 채널에 사용:

```javascript
const DEFAULT_MODAL_OPTIONS = {
  speech: [
    { id: 'friendly', label: '친근 존댓말', guide: AI_SPEECH_GUIDES.friendly },
    { id: 'mz',       label: 'MZ 반말',    guide: AI_SPEECH_GUIDES.mz },
    { id: 'formal',   label: '격식체',      guide: AI_SPEECH_GUIDES.formal },
  ],
  tone: [
    { id: 'casual', label: '캐주얼',  guide: AI_TONE_GUIDES.casual },
    { id: 'hype',   label: '자극',    guide: AI_TONE_GUIDES.hype },
    { id: 'info',   label: '정보성',  guide: AI_TONE_GUIDES.info },
    { id: 'promo',  label: '프로모',  guide: AI_TONE_GUIDES.promo },
  ],
  target: [
    { id: 'all',   label: '전체',       guide: AI_TARGET_GUIDES.all },
    { id: 'women', label: '여성',       guide: AI_TARGET_GUIDES.women },
    { id: 'men',   label: '남성',       guide: AI_TARGET_GUIDES.men },
  ],
  depth: [],   // 기본 채널은 depth 축 미사용
  angle: [],   // 기본 채널은 angle 축 미사용
};
```

### app.js — openAiModal() 수정

```javascript
function openAiModal() {
  // ... 기존 코드 ...
  const ch = (state.channels || []).find(c => c.id === state.projectId) || {};
  renderAiOptions(ch.modal_options || DEFAULT_MODAL_OPTIONS);
}
```

### app.js — getSelectedGuides()

```javascript
function getSelectedGuides() {
  const ch = (state.channels || []).find(c => c.id === state.projectId) || {};
  const opts = ch.modal_options;
  if (!opts) return null;
  const guides = {};
  ['speech', 'tone', 'target', 'depth', 'angle'].forEach(group => {
    const activeId = document.querySelector(
      `#aiOptionsContainer .ai-opt-btn.active[data-group="${group}"]`
    )?.dataset.id;
    const opt = opts[group]?.find(o => o.id === activeId);
    if (opt?.guide) guides[group] = opt.guide;
  });
  return guides;
}
```

### app.js — buildAiPrompt() 수정

```javascript
function buildAiPrompt(template, keyword, tone, slideCount, speech, target, newsItems) {
  // ... 기존 channelBase 구성 ...

  const guides = getSelectedGuides();
  const optionGuides = guides
    ? Object.values(guides).filter(Boolean).join('\n\n')
    : `${AI_TONE_GUIDES[tone] || ''}\n${AI_SPEECH_GUIDES[speech] || ''}\n${AI_TARGET_GUIDES[target] || ''}`;

  const systemMsg = `${channelBase}
## 카피라이팅 원칙
... (기존 유지) ...
${optionGuides}`;
}
```

### style.css — 신규 스타일

```css
.ai-option-group { margin-bottom: 10px; }
.ai-option-label { display: block; font-size: 11px; color: #555; margin-bottom: 6px; }
.ai-opt-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.ai-opt-btn {
  padding: 6px 12px; border: 1px solid #222; background: #111;
  color: #888; border-radius: 4px; cursor: pointer; font-size: 12px;
}
.ai-opt-btn.active { border-color: #fff; color: #e8e8e8; }
.ai-opt-btn:hover { border-color: #333; color: #bbb; }
```

---

## Supabase 변경

```sql
-- 1. 컬럼 추가
ALTER TABLE channels ADD COLUMN IF NOT EXISTS modal_options JSONB;

-- 2. 각 채널 데이터 입력 (채널별 UPDATE 쿼리 — 구현 플랜에서 전문 작성)
UPDATE channels SET modal_options = '{ ... }' WHERE name = 'spacelog';
```

---

### app.js — runAiGenerate() 수정

기존에 `.ai-tone-btn.active`에서 `tone`을 읽어 temperature 결정에 사용하던 로직 변경:

```javascript
// 기존
const tone = document.querySelector('.ai-tone-btn.active')?.dataset.tone || 'casual';

// 변경 후
const activeToneId = document.querySelector(
  '#aiOptionsContainer .ai-opt-btn.active[data-group="tone"]'
)?.dataset.id || 'casual';
const temperature = activeToneId === 'info' ? 0.65 : 0.80;
```

`buildAiPrompt()` 호출 시 `tone/speech/target` 파라미터는 `getSelectedGuides()`가 내부적으로 처리하므로 더미값 전달 가능. 함수 시그니처 변경 최소화.

---

## 폴백 동작

| 상황 | 동작 |
|---|---|
| `modal_options` 없는 채널 | `DEFAULT_MODAL_OPTIONS` 사용 (기존 GYMSPIRE 옵션 새 포맷으로 래핑) |
| 특정 축 옵션 배열이 빈 경우(`[]`) | 해당 축 버튼 그룹 숨김 |
| `getSelectedGuides()` 반환 null | 기존 `AI_TONE_GUIDES` 등 상수 사용 |

---

## 성공 기준

- spacelog에서 "에디토리얼체 + 비평 + 심층 + 설계 의도"로 생성 시 ~다 체, 설명 없는 선언형 카피 출력
- CAPITALFLOW에서 "분석체 + 구조해석 + 개요 + 매크로"와 "해설체 + 실전판단 + 입문자 + 투자행동" 결과가 명확히 다름
- 채널 전환 시 모달 옵션이 해당 채널의 옵션으로 자동 갱신
- modal_options 없는 레거시 채널은 기존 UI 그대로 동작

---

## 이번 스코프 제외

- 대시보드 채널 설정 UI에서 modal_options 편집
- 옵션 수 동적 변경 (항상 3개 고정)
- 생성 이력별 옵션 저장
