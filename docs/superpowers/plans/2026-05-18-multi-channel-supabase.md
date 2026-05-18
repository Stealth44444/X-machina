# Multi-Channel Platform — Supabase Backend + Dashboard (1단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** localStorage 기반 단일채널 도구를 Supabase 백엔드(Auth + DB + Storage) + 멀티채널 대시보드 플랫폼으로 업그레이드한다.

**Architecture:** Supabase JS SDK를 CDN으로 로드. 신규 모듈 파일(supabase-client.js / db.js / storage.js / auth.js / dashboard.js)을 app.js 앞에 로드. app.js의 localStorage 호출을 async Supabase 호출로 전면 교체. autosave는 localStorage 유지(단일 브라우저 복구용). index.html에 #authScreen + #dashboardScreen div 추가.

**Tech Stack:** Supabase JS v2 (CDN), Supabase Auth (email/password), Supabase PostgreSQL, Supabase Storage, Vanilla JS (기존 유지), Vercel (기존 유지)

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `supabase-client.js` (신규) | Supabase 클라이언트 싱글톤 |
| `db.js` (신규) | channels / presets / posts CRUD |
| `storage.js` (신규) | 이미지 업로드 → Supabase Storage |
| `auth.js` (신규) | 로그인 화면 렌더링 + auth 상태 관리 |
| `dashboard.js` (신규) | 캘린더 + 칸반 대시보드 UI |
| `app.js` (수정) | localStorage 제거, Supabase async 전환 |
| `index.html` (수정) | CDN + 새 스크립트 태그, 새 div 추가 |
| `style.css` (수정) | auth / dashboard 스타일 추가 |

---

## Task 1: Supabase 프로젝트 설정 + SQL 스키마

**Files:**
- Supabase 대시보드 (브라우저)
- 로컬 메모장 or `.env.local` (URL/Key 보관용)

- [ ] **Step 1: Supabase 프로젝트 생성**
  - https://supabase.com → New Project
  - 이름: `gymspire-studio`, 비밀번호 메모, Region: Northeast Asia (Seoul)
  - 생성 완료까지 ~2분 대기

- [ ] **Step 2: SQL 에디터에서 스키마 실행**
  - Dashboard → SQL Editor → New Query → 아래 SQL 전체 붙여넣고 Run

```sql
create extension if not exists "uuid-ossp";

create table channels (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  topic text,
  description text,
  color text not null default '#2B9BF4',
  emoji text not null default '💪',
  instagram_handle text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

insert into channels (id, name, topic, description, color, emoji, instagram_handle) values
  ('00000000-0000-0000-0000-000000000001',
   'GYMSPIRE', 'fitness',
   '짐샤크 한국 공식 인스타그램 @gymspire.kr. 짐샤크 브랜드·선수·문화 전문 콘텐츠. 한국 피트니스 팬덤 커뮤니티.',
   '#2B9BF4', '💪', '@gymspire.kr');

create table presets (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references channels(id) on delete cascade,
  name text not null,
  slides_json jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table posts (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references channels(id) on delete cascade,
  preset_id uuid references presets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','scheduled','published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  caption text default '',
  hashtags text[] default '{}',
  instagram_post_id text,
  thumbnail_url text,
  created_at timestamptz default now()
);

alter table channels enable row level security;
alter table presets enable row level security;
alter table posts enable row level security;

create policy "auth_all_channels" on channels for all to authenticated using (true) with check (true);
create policy "auth_all_presets"  on presets  for all to authenticated using (true) with check (true);
create policy "auth_all_posts"    on posts     for all to authenticated using (true) with check (true);
```

- [ ] **Step 3: Storage 버킷 생성**
  - Dashboard → Storage → New Bucket
  - 이름: `post-images`, Public bucket: ON → Create
  - Policies 탭 → Add policies → For full customization:
    - `authenticated` 사용자 INSERT 허용
    - 모든 사용자 SELECT 허용 (public)
    - `authenticated` 사용자 DELETE 허용

- [ ] **Step 4: Auth 사용자 2명 생성**
  - Dashboard → Authentication → Users → Add user
  - 이메일/비밀번호로 2명 생성

- [ ] **Step 5: URL + Anon Key 메모**
  - Dashboard → Settings → API
  - `Project URL` 복사 → 메모
  - `anon public` key 복사 → 메모

- [ ] **Step 6: `supabase-schema.sql` 파일 생성 후 커밋**

  프로젝트 루트에 `supabase-schema.sql` 파일을 만들고 Step 2의 SQL 전체를 붙여넣어 보존한다.

```bash
git add supabase-schema.sql
git commit -m "chore: add Supabase schema SQL"
```

---

## Task 2: supabase-client.js + index.html 스크립트 연결

**Files:**
- Create: `supabase-client.js`
- Modify: `index.html`

- [ ] **Step 1: `supabase-client.js` 생성**

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
```
  → `YOUR_PROJECT_ID`와 `YOUR_ANON_KEY`를 Task 1 Step 5의 값으로 교체

- [ ] **Step 2: `index.html` — `<head>` 안 `<link>` 태그 아래에 Supabase CDN 추가**

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

- [ ] **Step 3: `index.html` — 기존 세 `<script>` 태그를 아래로 교체**

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="templates/cardnews.js"></script>
<script src="supabase-client.js"></script>
<script src="db.js"></script>
<script src="storage.js"></script>
<script src="auth.js"></script>
<script src="dashboard.js"></script>
<script src="app.js"></script>
```

- [ ] **Step 4: 브라우저 확인**
  - Vercel 배포 or `vercel dev` 로컬 실행
  - 개발자 도구 콘솔 → `supabaseClient` 입력 → 객체 출력되면 성공
  - 에러 없으면 진행

- [ ] **Step 5: 커밋**

```bash
git add supabase-client.js index.html
git commit -m "feat: add Supabase client + CDN scripts"
```

---

## Task 3: db.js — 데이터 레이어

**Files:**
- Create: `db.js`

- [ ] **Step 1: `db.js` 생성**

```js
// ── Channels ─────────────────────────────────────────────────────────────────

async function dbGetChannels() {
  const { data, error } = await supabaseClient
    .from('channels').select('*').order('created_at');
  if (error) throw error;
  return data;
}

async function dbUpsertChannel(channel) {
  const { data, error } = await supabaseClient
    .from('channels').upsert(channel).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteChannel(id) {
  const { error } = await supabaseClient
    .from('channels').delete().eq('id', id);
  if (error) throw error;
}

// ── Presets ──────────────────────────────────────────────────────────────────

async function dbGetPresets(channelId) {
  const { data, error } = await supabaseClient
    .from('presets').select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function dbUpsertPreset(preset) {
  const payload = { ...preset, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseClient
    .from('presets').upsert(payload).select().single();
  if (error) throw error;
  return data;
}

async function dbDeletePreset(id) {
  const { error } = await supabaseClient
    .from('presets').delete().eq('id', id);
  if (error) throw error;
}

// ── Posts ─────────────────────────────────────────────────────────────────────

async function dbGetPosts(channelId) {
  const q = supabaseClient
    .from('posts')
    .select('*, presets(name)')
    .order('created_at', { ascending: false });
  if (channelId) q.eq('channel_id', channelId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function dbGetAllPosts() {
  return dbGetPosts(null);
}

async function dbUpsertPost(post) {
  const { data, error } = await supabaseClient
    .from('posts').upsert(post).select().single();
  if (error) throw error;
  return data;
}

async function dbUpdatePostStatus(id, status, scheduledAt) {
  const update = { status };
  if (scheduledAt !== undefined) update.scheduled_at = scheduledAt;
  if (status === 'published') update.published_at = new Date().toISOString();
  const { error } = await supabaseClient
    .from('posts').update(update).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: 콘솔에서 연결 확인**
  - 배포 후 브라우저 콘솔 → `await dbGetChannels()` 실행
  - `[{id: '00000000...', name: 'GYMSPIRE', ...}]` 반환되면 성공

- [ ] **Step 3: 커밋**

```bash
git add db.js
git commit -m "feat: db.js — Supabase CRUD layer"
```

---

## Task 4: storage.js — 이미지 업로드

**Files:**
- Create: `storage.js`

- [ ] **Step 1: `storage.js` 생성**

```js
async function uploadBgImage(dataUrl, channelId) {
  const compressed = await compressImage(dataUrl); // app.js의 compressImage 재사용
  const blob = await (await fetch(compressed)).blob();
  const path = `${channelId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabaseClient.storage
    .from('post-images')
    .upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  const { data: { publicUrl } } = supabaseClient.storage
    .from('post-images').getPublicUrl(path);
  return publicUrl;
}

async function deleteStorageImage(url) {
  if (!url || url.startsWith('data:')) return; // base64는 Storage에 없으므로 스킵
  const bucket = 'post-images';
  const path = url.split(`/${bucket}/`)[1];
  if (!path) return;
  await supabaseClient.storage.from(bucket).remove([path]);
}
```

- [ ] **Step 2: app.js — 슬라이드 배경 이미지 업로드 핸들러 수정**

  `app.js` 약 718번 줄 기존 코드:
  ```js
  reader.onload = async ev => {
    updateField(btn.dataset.key, await compressImage(ev.target.result));
    renderEditor();
  };
  ```
  교체:
  ```js
  reader.onload = async ev => {
    try {
      const url = await uploadBgImage(ev.target.result, state.projectId);
      updateField(btn.dataset.key, url);
    } catch {
      updateField(btn.dataset.key, await compressImage(ev.target.result));
    }
    renderEditor();
  };
  ```

- [ ] **Step 3: app.js — 아웃트로 이미지 업로드 핸들러 수정**

  `app.js` 약 604번 줄 기존 코드:
  ```js
  reader.onload = async ev => {
    state.outroImage = await compressImage(ev.target.result);
    renderCanvas();
    renderFilmstrip();
    renderEditor();
  };
  ```
  교체:
  ```js
  reader.onload = async ev => {
    try {
      state.outroImage = await uploadBgImage(ev.target.result, state.projectId);
    } catch {
      state.outroImage = await compressImage(ev.target.result);
    }
    renderCanvas();
    renderFilmstrip();
    renderEditor();
  };
  ```

- [ ] **Step 4: 브라우저에서 이미지 업로드 테스트**
  - 배포 후 슬라이드에 이미지 업로드
  - 캔버스에 이미지 표시 확인
  - Supabase Storage → post-images 버킷에 파일 생성 확인
  - 개발자 도구 Network 탭에서 `supabase.co/storage` 요청 확인

- [ ] **Step 5: 커밋**

```bash
git add storage.js app.js
git commit -m "feat: image upload to Supabase Storage"
```

---

## Task 5: auth.js — 로그인 화면

**Files:**
- Create: `auth.js`
- Modify: `index.html` (div 추가)
- Modify: `style.css` (auth 스타일 추가)

- [ ] **Step 1: `index.html` — `<div class="app">` 위에 authScreen div 추가**

```html
<div id="authScreen" style="display:none"></div>
```

- [ ] **Step 2: `auth.js` 생성**

```js
function renderAuthScreen() {
  const el = document.getElementById('authScreen');
  el.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo">GYMSPIRE STUDIO</div>
        <p class="auth-sub">콘텐츠 제작 플랫폼</p>
        <input class="auth-input" id="authEmail" type="email" placeholder="이메일" autocomplete="email">
        <input class="auth-input" id="authPassword" type="password" placeholder="비밀번호" autocomplete="current-password">
        <button class="auth-btn" id="authLoginBtn">로그인</button>
        <p class="auth-error" id="authError"></p>
      </div>
    </div>
  `;
  document.getElementById('authLoginBtn').addEventListener('click', handleLogin);
  document.getElementById('authPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
}

async function handleLogin() {
  const email = document.getElementById('authEmail').value.trim();
  const pw = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  const btn = document.getElementById('authLoginBtn');
  if (!email || !pw) { errEl.textContent = '이메일과 비밀번호를 입력하세요.'; return; }
  btn.disabled = true;
  btn.textContent = '로그인 중...';
  errEl.textContent = '';
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pw });
  if (error) {
    errEl.textContent = '로그인 실패. 이메일/비밀번호를 확인하세요.';
    btn.disabled = false;
    btn.textContent = '로그인';
  }
  // 성공 시 onAuthStateChange가 앱 진입 처리
}

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.querySelector('.app').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'none';
}

function hideAuthScreen() {
  document.getElementById('authScreen').style.display = 'none';
}
```

- [ ] **Step 3: `style.css` 끝에 auth 스타일 추가**

```css
/* ── Auth Screen ─────────────────────────────────────────────────────────── */
#authScreen {
  position: fixed; inset: 0;
  background: #080808;
  display: flex; align-items: center; justify-content: center;
  z-index: 9000;
}
.auth-wrap { width: 100%; max-width: 360px; padding: 0 24px; }
.auth-card { background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 40px 32px; }
.auth-logo { font-size: 18px; font-weight: 900; color: #e8e8e8; letter-spacing: 2px; margin-bottom: 6px; }
.auth-sub { font-size: 11px; color: #444; margin: 0 0 32px; letter-spacing: 1px; }
.auth-input {
  display: block; width: 100%; box-sizing: border-box;
  background: #0a0a0a; border: 1px solid #222; border-radius: 4px;
  color: #e8e8e8; font-size: 13px; padding: 10px 12px;
  margin-bottom: 10px; outline: none;
}
.auth-input:focus { border-color: #2B9BF4; }
.auth-btn {
  width: 100%; padding: 11px; margin-top: 8px;
  background: #2B9BF4; color: #fff; border: none; border-radius: 4px;
  font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: 1px;
}
.auth-btn:disabled { opacity: 0.5; cursor: default; }
.auth-error { font-size: 11px; color: #e05; margin-top: 10px; text-align: center; min-height: 16px; }
```

- [ ] **Step 4: 커밋**

```bash
git add auth.js index.html style.css
git commit -m "feat: auth.js — login screen + styles"
```

---

## Task 6: app.js — localStorage → Supabase 전환

**Files:**
- Modify: `app.js`

이 Task는 app.js의 데이터 레이어를 전면 교체한다. 캔버스 편집/렌더 코드는 건드리지 않는다.

- [ ] **Step 1: app.js 상단 상수 정리**

  기존:
  ```js
  const AUTOSAVE_KEY = 'brand_tool_autosave';
  const PROJECT_STORAGE_KEY = 'brand_tool_projects';
  const ACTIVE_PROJECT_KEY = 'brand_tool_active_project';
  const PRESET_KEY_PREFIX = 'brand_tool_presets_';
  ```
  교체:
  ```js
  const AUTOSAVE_KEY = 'brand_tool_autosave';       // 유지 (localStorage)
  const ACTIVE_CHANNEL_KEY = 'brand_tool_active_channel'; // 마지막 채널 ID 기억
  ```

- [ ] **Step 2: app.js — `getPresets()` 교체 (async)**

  기존:
  ```js
  function getPresets() {
    try { return JSON.parse(localStorage.getItem(PRESET_KEY_PREFIX + state.projectId) || '[]'); } catch { return []; }
  }
  ```
  교체:
  ```js
  async function getPresets() {
    try { return await dbGetPresets(state.projectId); } catch { return []; }
  }
  ```

- [ ] **Step 3: app.js — `savePreset()` 교체 (async)**

  기존 `savePreset` 함수 전체를 교체:
  ```js
  async function savePreset(nameOverride) {
    const template = getTemplate(state.templateId);
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const name = nameOverride || `${template.name} ${mmdd} ${hhmm}`;
    try {
      const saved = await dbUpsertPreset({
        channel_id: state.projectId,
        name,
        slides_json: JSON.parse(JSON.stringify(state.slides)),
      });
      state.activePresetId = saved.id;
    } catch (e) {
      alert('저장 실패: ' + e.message);
      return;
    }
    renderPresets();
  }
  ```

- [ ] **Step 4: app.js — `deletePreset()` 교체 (async)**

  기존:
  ```js
  function deletePreset(id) {
    if (!confirm('삭제할까요?')) return;
    const presets = getPresets().filter(p => p.id !== id);
    try { localStorage.setItem(PRESET_KEY_PREFIX + state.projectId, JSON.stringify(presets)); } catch {}
    renderPresets();
  }
  ```
  교체:
  ```js
  async function deletePreset(id) {
    if (!confirm('삭제할까요?')) return;
    try { await dbDeletePreset(id); } catch (e) { alert('삭제 실패: ' + e.message); return; }
    renderPresets();
  }
  ```

- [ ] **Step 5: app.js — `loadPreset()` 교체 (async)**

  기존:
  ```js
  function loadPreset(id) {
    const preset = getPresets().find(p => p.id === id);
  ```
  교체:
  ```js
  async function loadPreset(id) {
    const presets = await getPresets();
    const preset = presets.find(p => p.id === id);
  ```
  (이후 코드 동일)

- [ ] **Step 6: app.js — `renderPresets()` 교체 (async)**

  기존:
  ```js
  function renderPresets() {
    const list = document.getElementById('presetList');
    const presets = getPresets();
  ```
  교체:
  ```js
  async function renderPresets() {
    const list = document.getElementById('presetList');
    const presets = await getPresets();
  ```
  (이후 코드 동일)

- [ ] **Step 7: app.js — `applyAiSlides()` 내 `savePreset` await 추가**

  기존:
  ```js
  savePreset(titleName || undefined);
  ```
  교체:
  ```js
  await savePreset(titleName || undefined);
  ```
  함수 선언도 `async function applyAiSlides()` 로 변경

- [ ] **Step 8: app.js — `initProjectSystem()` → `initChannelSystem()` 교체 (async)**

  기존 `initProjectSystem` 함수 전체 제거 후 교체:
  ```js
  async function initChannelSystem() {
    document.getElementById('projectSwitchBtn').addEventListener('click', showProjectScreen);
    let channels;
    try { channels = await dbGetChannels(); } catch { channels = []; }
    if (!channels.length) return false;

    const savedId = localStorage.getItem(ACTIVE_CHANNEL_KEY);
    const target = channels.find(c => c.id === savedId) || channels[0];
    state.projectId = target.id;
    state.channels = channels;
    document.getElementById('brandName').textContent = target.name;
    return true;
  }
  ```

- [ ] **Step 9: app.js — `loadProject()` → `loadChannel()` 교체 (async)**

  기존 `loadProject` 함수 전체 교체:
  ```js
  async function loadChannel(channelId) {
    const channel = (state.channels || []).find(c => c.id === channelId);
    if (!channel) return;
    state.projectId = channelId;
    try { localStorage.setItem(ACTIVE_CHANNEL_KEY, channelId); } catch {}
    document.getElementById('brandName').textContent = channel.name;
    try {
      if (!loadAutoSave()) {
        loadTemplate('cardnews');
      } else {
        renderGallery();
        renderFilmstrip();
        renderEditor();
        renderCanvas();
        history.stack = [snapshotState()];
        history.index = 0;
        updateHistoryBtns();
      }
      await renderPresets();
    } catch (e) {
      console.error('loadChannel render error:', e);
      loadTemplate('cardnews');
      await renderPresets();
    }
    hideProjectScreen();
  }
  ```

- [ ] **Step 10: app.js — `renderProjectScreen()` 내 채널 데이터 소스 변경**

  기존 `renderProjectScreen()` 내 `getAllProjects()` 호출 부분:
  ```js
  function renderProjectScreen() {
    const projects = getAllProjects();
  ```
  교체:
  ```js
  function renderProjectScreen() {
    const projects = state.channels || [];
  ```
  그리고 카드 클릭 핸들러:
  ```js
  card.addEventListener('click', () => loadProject(card.dataset.id));
  ```
  교체:
  ```js
  card.addEventListener('click', () => loadChannel(card.dataset.id));
  ```

- [ ] **Step 11: app.js — `showNewProjectModal()` 내 `saveCustomProjects` → `dbUpsertChannel`**

  기존:
  ```js
  const custom = getCustomProjects();
  const id = 'custom_' + Date.now();
  custom.push({ id, name: name.toUpperCase(), description: desc || '커스텀 프로젝트', builtIn: false });
  saveCustomProjects(custom);
  overlay.remove();
  renderProjectScreen();
  ```
  교체:
  ```js
  overlay.querySelector('#newProjectConfirm').addEventListener('click', async () => {
    const name = overlay.querySelector('#newProjectName').value.trim();
    const desc = overlay.querySelector('#newProjectDesc').value.trim();
    if (!name) { overlay.querySelector('#newProjectName').focus(); return; }
    try {
      const ch = await dbUpsertChannel({
        name: name.toUpperCase(),
        description: desc || '커스텀 채널',
        color: '#2B9BF4',
        emoji: '📷',
      });
      state.channels = await dbGetChannels();
      overlay.remove();
      renderProjectScreen();
    } catch (e) { alert('생성 실패: ' + e.message); }
  });
  ```

- [ ] **Step 12: app.js — `init()` 수정 — auth 확인 후 진입**

  기존 `init()` 함수 첫 줄에 auth 확인 추가. `init()` 함수를 async로 변경:
  ```js
  async function init() {
    // Auth 확인
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      renderAuthScreen();
      showAuthScreen();
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          hideAuthScreen();
          await initApp();
        }
      });
      return;
    }
    await initApp();
  }

  async function initApp() {
    scaleCanvas();
    window.addEventListener('resize', scaleCanvas);
    renderGallery();
    renderPinterest();
    document.getElementById('exportBtn').addEventListener('click', exportPng);
    document.getElementById('exportAllBtn').addEventListener('click', exportAllPng);
    document.getElementById('savePresetBtn').addEventListener('click', () => savePreset());
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    // ... (기존 init() 내용 그대로, initProjectSystem → initChannelSystem으로만 변경)

    const hasChannel = await initChannelSystem();
    if (hasChannel) {
      if (!loadAutoSave()) {
        loadTemplate('cardnews');
      } else {
        renderGallery();
        renderFilmstrip();
        renderEditor();
        renderCanvas();
        history.stack = [snapshotState()];
        history.index = 0;
        updateHistoryBtns();
      }
      await renderPresets();
    } else {
      loadTemplate('cardnews');
      showProjectScreen();
    }
  }
  ```

- [ ] **Step 13: app.js — 하단 로그아웃 버튼 이벤트 등록**

  `initApp()` 내에 추가:
  ```js
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    location.reload();
  });
  ```

- [ ] **Step 14: 브라우저에서 전체 흐름 검증**
  - 배포 → 접속 → 로그인 화면 표시 확인
  - 로그인 → 앱 진입 확인
  - "진행상황 저장" → Supabase 대시보드 presets 테이블에 레코드 생성 확인
  - "내 작업" 목록 표시 확인
  - 프리셋 삭제 → 목록에서 제거 확인

- [ ] **Step 15: 커밋**

```bash
git add app.js
git commit -m "feat: app.js localStorage → Supabase async migration"
```

---

## Task 7: localStorage 데이터 마이그레이션

**Files:**
- Create: `migrate.js`
- Modify: `index.html` (script 태그 추가)
- Modify: `app.js` (`initApp()` 내 호출 추가)

- [ ] **Step 1: `migrate.js` 생성**

```js
async function runMigrationIfNeeded() {
  const migrationKey = 'brand_tool_migrated_v2';
  if (localStorage.getItem(migrationKey)) return;

  const oldPresets = localStorage.getItem('brand_tool_presets_gymspire')
    || localStorage.getItem('gymspire_presets');
  if (!oldPresets) {
    localStorage.setItem(migrationKey, '1');
    return;
  }

  let presets;
  try { presets = JSON.parse(oldPresets); } catch { presets = []; }
  if (!presets.length) {
    localStorage.setItem(migrationKey, '1');
    return;
  }

  const GYMSPIRE_ID = '00000000-0000-0000-0000-000000000001';
  let imported = 0;
  for (const p of presets) {
    try {
      await dbUpsertPreset({
        channel_id: GYMSPIRE_ID,
        name: p.name || '가져온 작업',
        slides_json: p.slides || [],
      });
      imported++;
    } catch (e) {
      console.warn('migration preset skip:', e.message);
    }
  }
  console.log(`Migration: ${imported}/${presets.length} presets imported`);
  localStorage.setItem(migrationKey, '1');
  // 구 키 정리
  localStorage.removeItem('brand_tool_presets_gymspire');
  localStorage.removeItem('gymspire_presets');
}
```

- [ ] **Step 2: `index.html` — dashboard.js 뒤에 추가**

```html
<script src="migrate.js"></script>
```

- [ ] **Step 3: `app.js` — `initApp()` 내 첫 줄에 마이그레이션 호출 추가**

```js
async function initApp() {
  await runMigrationIfNeeded();
  // ... 이후 기존 코드
```

- [ ] **Step 4: 마이그레이션 검증**
  - 로컬 브라우저에 `brand_tool_presets_gymspire` 데이터가 있는 경우:
    - 로그인 후 Supabase presets 테이블에 해당 레코드 생성 확인
    - "내 작업" 목록에 기존 프리셋 표시 확인
    - 재로그인 시 마이그레이션 중복 실행 안 됨 확인

- [ ] **Step 5: 커밋**

```bash
git add migrate.js index.html app.js
git commit -m "feat: localStorage → Supabase one-time migration"
```

---

## Task 8: dashboard.js — 캘린더 + 칸반 대시보드

**Files:**
- Create: `dashboard.js`
- Modify: `index.html` (dashboardScreen div 추가, 로그아웃 버튼)
- Modify: `style.css` (dashboard 스타일 추가)
- Modify: `app.js` (대시보드 진입/복귀 라우팅)

- [ ] **Step 1: `index.html` — authScreen div 다음에 추가**

```html
<div id="dashboardScreen" style="display:none"></div>
```

  그리고 sidebar-brand 안 projectSwitchBtn 옆에 로그아웃 버튼 추가:
  ```html
  <button class="project-switch-btn" id="dashboardBtn" title="대시보드">⊟</button>
  <button class="project-switch-btn" id="logoutBtn" title="로그아웃" style="font-size:11px">↗</button>
  ```

- [ ] **Step 2: `dashboard.js` 생성 — 기본 구조 + 데이터 로드**

```js
let dashState = {
  channels: [],
  posts: [],
  selectedChannelId: null,
  selectedDate: null,
  viewMode: 'week', // 'week' | 'month'
  currentWeekStart: null,
};

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function showDashboard() {
  document.querySelector('.app').style.display = 'none';
  const screen = document.getElementById('dashboardScreen');
  screen.style.display = 'flex';
  screen.innerHTML = `<div class="dash-loading">불러오는 중...</div>`;

  dashState.channels = state.channels || await dbGetChannels();
  dashState.posts = await dbGetAllPosts();
  dashState.currentWeekStart = getWeekStart(new Date());

  renderDashboard();
}

function hideDashboard() {
  document.getElementById('dashboardScreen').style.display = 'none';
  document.querySelector('.app').style.display = '';
}
```

- [ ] **Step 3: `dashboard.js` — `renderDashboard()` 메인 레이아웃**

```js
function renderDashboard() {
  const screen = document.getElementById('dashboardScreen');
  screen.innerHTML = `
    <div class="dash-inner">
      <div class="dash-header">
        <span class="dash-title">STUDIO</span>
        <div class="dash-channel-tabs">
          <button class="dash-ch-tab ${!dashState.selectedChannelId ? 'active' : ''}" data-id="">전체</button>
          ${dashState.channels.map(c => `
            <button class="dash-ch-tab ${dashState.selectedChannelId === c.id ? 'active' : ''}"
              data-id="${c.id}" style="--ch-color:${c.color}">
              ${c.emoji} ${c.name}
            </button>
          `).join('')}
        </div>
        <button class="dash-close-btn" id="dashCloseBtn">편집으로 →</button>
      </div>
      <div class="dash-body">
        <div class="dash-kanban" id="dashKanban"></div>
        <div class="dash-calendar-col">
          <div class="dash-cal-header">
            <button class="dash-nav-btn" id="dashCalPrev">‹</button>
            <span class="dash-cal-title" id="dashCalTitle"></span>
            <button class="dash-nav-btn" id="dashCalNext">›</button>
            <button class="dash-view-toggle" id="dashViewToggle">${dashState.viewMode === 'week' ? '월간' : '주간'}</button>
          </div>
          <div id="dashCalBody"></div>
          <div class="dash-date-posts" id="dashDatePosts"></div>
          <button class="dash-new-post-btn" id="dashNewPostBtn" style="display:none">+ 이 날짜에 새 포스트</button>
        </div>
      </div>
    </div>
  `;
  bindDashboardEvents();
  renderKanban();
  renderCalendar();
}
```

- [ ] **Step 4: `dashboard.js` — `renderKanban()`**

```js
function getFilteredPosts() {
  let posts = dashState.posts;
  if (dashState.selectedChannelId) posts = posts.filter(p => p.channel_id === dashState.selectedChannelId);
  if (dashState.selectedDate) {
    const d = dashState.selectedDate.toDateString();
    posts = posts.filter(p => {
      const t = p.scheduled_at ? new Date(p.scheduled_at).toDateString() : new Date(p.created_at).toDateString();
      return t === d;
    });
  }
  return posts;
}

function renderKanban() {
  const posts = dashState.selectedDate ? getFilteredPosts() : dashState.posts.filter(p =>
    !dashState.selectedChannelId || p.channel_id === dashState.selectedChannelId
  );
  const byStatus = { draft: [], scheduled: [], published: [] };
  posts.forEach(p => (byStatus[p.status] || byStatus.draft).push(p));

  const labels = { draft: 'DRAFT', scheduled: 'SCHEDULED', published: 'PUBLISHED' };
  document.getElementById('dashKanban').innerHTML = ['draft', 'scheduled', 'published'].map(s => `
    <div class="dash-col">
      <div class="dash-col-header">
        <span>${labels[s]}</span>
        <span class="dash-col-count">${byStatus[s].length}</span>
      </div>
      <div class="dash-cards" id="dashCol-${s}">
        ${byStatus[s].map(p => renderPostCard(p)).join('')}
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.dash-card').forEach(card => {
    card.addEventListener('click', () => openPostFromDashboard(card.dataset.id));
  });
}

function renderPostCard(post) {
  const ch = dashState.channels.find(c => c.id === post.channel_id);
  const date = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleDateString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })
    : '미예약';
  const thumb = post.thumbnail_url
    ? `<div class="dash-card-thumb" style="background-image:url('${post.thumbnail_url}')"></div>`
    : `<div class="dash-card-thumb dash-card-thumb--empty">${ch?.emoji || '📷'}</div>`;
  return `
    <div class="dash-card" data-id="${post.id}">
      ${thumb}
      <div class="dash-card-body">
        <div class="dash-card-ch" style="color:${ch?.color || '#2B9BF4'}">${ch?.emoji || ''} ${ch?.name || ''}</div>
        <div class="dash-card-name">${escHtml(post.presets?.name || post.caption || '제목 없음')}</div>
        <div class="dash-card-date">${date}</div>
      </div>
    </div>
  `;
}
```

- [ ] **Step 5: `dashboard.js` — `renderCalendar()` (주간)**

```js
function renderCalendar() {
  const title = document.getElementById('dashCalTitle');
  const body = document.getElementById('dashCalBody');
  if (!title || !body) return;

  const ws = dashState.currentWeekStart;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws); d.setDate(ws.getDate() + i); return d;
  });
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  const ms = ws.getMonth() + 1;
  const me = days[6].getMonth() + 1;
  title.textContent = ms === me
    ? `${ws.getFullYear()}년 ${ms}월`
    : `${ws.getFullYear()}년 ${ms}월 – ${me}월`;

  const today = new Date().toDateString();
  const selDate = dashState.selectedDate?.toDateString();

  body.innerHTML = `
    <div class="dash-cal-grid">
      ${dayNames.map(d => `<div class="dash-cal-dayname">${d}</div>`).join('')}
      ${days.map((d, i) => {
        const ds = d.toDateString();
        const isToday = ds === today;
        const isSel = ds === selDate;
        const dayPosts = dashState.posts.filter(p => {
          if (dashState.selectedChannelId && p.channel_id !== dashState.selectedChannelId) return false;
          const t = p.scheduled_at ? new Date(p.scheduled_at).toDateString() : null;
          return t === ds;
        });
        const dots = dayPosts.map(p => {
          const ch = dashState.channels.find(c => c.id === p.channel_id);
          return `<span class="dash-cal-dot" style="background:${ch?.color || '#2B9BF4'}" title="${ch?.name}"></span>`;
        }).join('');
        return `
          <button class="dash-cal-day ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}"
            data-date="${d.toISOString()}">
            <span class="dash-cal-daynum">${d.getDate()}</span>
            <div class="dash-cal-dots">${dots}</div>
          </button>
        `;
      }).join('')}
    </div>
  `;

  body.querySelectorAll('.dash-cal-day').forEach(btn => {
    btn.addEventListener('click', () => {
      dashState.selectedDate = new Date(btn.dataset.date);
      renderCalendar();
      renderKanban();
      renderDatePostsPanel();
    });
  });
}

function renderDatePostsPanel() {
  const panel = document.getElementById('dashDatePosts');
  const newBtn = document.getElementById('dashNewPostBtn');
  if (!dashState.selectedDate) { panel.innerHTML = ''; newBtn.style.display = 'none'; return; }
  const d = dashState.selectedDate;
  const label = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  panel.innerHTML = `<div class="dash-date-label">${label} 예약</div>`;
  newBtn.style.display = '';
  newBtn.onclick = () => {
    hideDashboard();
    // Canvas editor로 진입 — 사용자가 직접 저장 후 예약
  };
}
```

- [ ] **Step 6: `dashboard.js` — 이벤트 바인딩 + 포스트 진입**

```js
function bindDashboardEvents() {
  document.getElementById('dashCloseBtn').addEventListener('click', hideDashboard);
  document.getElementById('dashCalPrev').addEventListener('click', () => {
    dashState.currentWeekStart.setDate(dashState.currentWeekStart.getDate() - 7);
    dashState.selectedDate = null;
    renderCalendar();
    renderKanban();
  });
  document.getElementById('dashCalNext').addEventListener('click', () => {
    dashState.currentWeekStart.setDate(dashState.currentWeekStart.getDate() + 7);
    dashState.selectedDate = null;
    renderCalendar();
    renderKanban();
  });
  document.querySelectorAll('.dash-ch-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      dashState.selectedChannelId = tab.dataset.id || null;
      dashState.selectedDate = null;
      renderDashboard();
    });
  });
}

async function openPostFromDashboard(postId) {
  const post = dashState.posts.find(p => p.id === postId);
  if (!post) return;
  await loadChannel(post.channel_id);
  if (post.preset_id) {
    await loadPreset(post.preset_id);
  }
  hideDashboard();
}
```

- [ ] **Step 7: app.js — 대시보드 버튼 이벤트 등록**

  `initApp()` 내에 추가:
  ```js
  document.getElementById('dashboardBtn')?.addEventListener('click', showDashboard);
  ```

- [ ] **Step 8: `style.css` — 대시보드 스타일 추가**

```css
/* ── Dashboard ───────────────────────────────────────────────────────────── */
#dashboardScreen {
  position: fixed; inset: 0; background: #080808;
  z-index: 1500; display: flex; flex-direction: column;
  overflow: hidden;
}
.dash-loading { margin: auto; color: #444; font-size: 13px; }
.dash-inner { display: flex; flex-direction: column; height: 100%; }
.dash-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 24px; border-bottom: 1px solid #111;
  flex-shrink: 0;
}
.dash-title { font-size: 13px; font-weight: 900; color: #e8e8e8; letter-spacing: 2px; margin-right: 8px; }
.dash-channel-tabs { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.dash-ch-tab {
  padding: 5px 12px; border-radius: 20px; border: 1px solid #222;
  background: transparent; color: #555; font-size: 11px; font-weight: 600;
  cursor: pointer; letter-spacing: 0.5px;
}
.dash-ch-tab.active { background: #1a1a1a; color: #e8e8e8; border-color: #333; }
.dash-close-btn {
  padding: 6px 14px; background: #111; border: 1px solid #222; border-radius: 4px;
  color: #888; font-size: 11px; cursor: pointer; white-space: nowrap;
}
.dash-body { display: flex; flex: 1; overflow: hidden; }

/* Kanban */
.dash-kanban { display: flex; gap: 12px; padding: 20px; width: 340px; flex-shrink: 0; overflow-y: auto; }
.dash-col { display: flex; flex-direction: column; flex: 1; min-width: 100px; }
.dash-col-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 9px; font-weight: 700; color: #444; letter-spacing: 1.5px;
  padding: 0 4px 10px;
}
.dash-col-count { background: #1a1a1a; color: #666; padding: 2px 6px; border-radius: 10px; }
.dash-cards { display: flex; flex-direction: column; gap: 8px; }
.dash-card {
  background: #0f0f0f; border: 1px solid #1a1a1a; border-radius: 6px;
  overflow: hidden; cursor: pointer;
}
.dash-card:hover { border-color: #2a2a2a; }
.dash-card-thumb {
  width: 100%; aspect-ratio: 4/5; background-size: cover; background-position: center;
  background-color: #151515;
}
.dash-card-thumb--empty { display: flex; align-items: center; justify-content: center; font-size: 24px; }
.dash-card-body { padding: 8px 10px; }
.dash-card-ch { font-size: 9px; font-weight: 700; letter-spacing: 1px; margin-bottom: 3px; }
.dash-card-name { font-size: 11px; color: #ccc; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dash-card-date { font-size: 10px; color: #444; }

/* Calendar column */
.dash-calendar-col { flex: 1; padding: 20px; overflow-y: auto; border-left: 1px solid #111; }
.dash-cal-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.dash-cal-title { font-size: 13px; font-weight: 700; color: #ccc; flex: 1; }
.dash-nav-btn {
  width: 28px; height: 28px; background: #111; border: 1px solid #222;
  border-radius: 4px; color: #888; font-size: 16px; cursor: pointer;
}
.dash-view-toggle {
  padding: 4px 10px; background: transparent; border: 1px solid #222;
  border-radius: 4px; color: #666; font-size: 10px; cursor: pointer;
}
.dash-cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
  margin-bottom: 16px;
}
.dash-cal-dayname { text-align: center; font-size: 9px; font-weight: 700; color: #333; padding: 4px 0; letter-spacing: 1px; }
.dash-cal-day {
  aspect-ratio: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: flex-start; padding: 4px; background: #0a0a0a;
  border: 1px solid transparent; border-radius: 4px; cursor: pointer;
}
.dash-cal-day:hover { border-color: #222; }
.dash-cal-day.today .dash-cal-daynum { color: #2B9BF4; font-weight: 700; }
.dash-cal-day.selected { background: #111; border-color: #2B9BF4; }
.dash-cal-daynum { font-size: 12px; color: #666; }
.dash-cal-dots { display: flex; gap: 2px; flex-wrap: wrap; justify-content: center; margin-top: 2px; }
.dash-cal-dot { width: 5px; height: 5px; border-radius: 50%; }
.dash-date-label { font-size: 11px; font-weight: 700; color: #888; margin-bottom: 10px; letter-spacing: 1px; }
.dash-new-post-btn {
  width: 100%; padding: 10px; background: #111; border: 1px dashed #222;
  border-radius: 4px; color: #555; font-size: 12px; cursor: pointer; margin-top: 12px;
}
.dash-new-post-btn:hover { border-color: #2B9BF4; color: #2B9BF4; }
```

- [ ] **Step 9: 대시보드 전체 흐름 검증**
  - 배포 후 로그인
  - 사이드바 ⊟ 버튼 → 대시보드 화면 표시 확인
  - 프리셋 저장 후 대시보드 오픈 → Draft 컬럼에 카드 표시 확인
  - 채널 탭 클릭 → 해당 채널만 필터링 확인
  - 캘린더 날짜 클릭 → 해당 날짜 포스트만 칸반에 표시 확인
  - "편집으로 →" 버튼 → Canvas Editor 복귀 확인

- [ ] **Step 10: 커밋 + 배포**

```bash
git add dashboard.js index.html style.css app.js
git commit -m "feat: dashboard — calendar + kanban combined view"
vercel --prod
```

---

## Task 9: "발행 예약" 버튼 — Canvas Editor 연동

**Files:**
- Modify: `app.js`
- Modify: `index.html` (모달 추가)
- Modify: `style.css`

- [ ] **Step 1: `index.html` — 예약 모달 추가 (slideRegenModal 위에)**

```html
<div id="scheduleModal" class="ai-overlay" style="display:none">
  <div class="ai-panel" style="max-width:400px">
    <div class="ai-panel-header">
      <div class="ai-panel-header-row">
        <div>
          <span class="ai-panel-eyebrow">📅 SCHEDULE</span>
          <h2 class="ai-panel-title">발행 예약</h2>
        </div>
        <button class="ai-btn ai-btn-ghost" id="scheduleModalClose">닫기</button>
      </div>
    </div>
    <div class="ai-body">
      <div class="ai-field">
        <label class="ai-label">예약 날짜 · 시간</label>
        <input class="ai-input" type="datetime-local" id="scheduleDateTime">
      </div>
      <div class="ai-field">
        <label class="ai-label">캡션 (선택)</label>
        <textarea class="ai-input ai-textarea" id="scheduleCaption" placeholder="인스타그램 게시 캡션"></textarea>
      </div>
    </div>
    <div class="ai-actions">
      <div class="ai-actions-right">
        <button class="ai-btn ai-btn-primary" id="scheduleConfirmBtn">예약 등록</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: `index.html` — editor-panel의 export 버튼 위에 예약 버튼 추가**

```html
<button class="export-btn" id="scheduleBtn">📅 발행 예약</button>
```

- [ ] **Step 3: app.js — `initApp()` 내 예약 버튼 이벤트 등록**

```js
document.getElementById('scheduleBtn').addEventListener('click', openScheduleModal);
document.getElementById('scheduleModalClose').addEventListener('click', () => {
  document.getElementById('scheduleModal').style.display = 'none';
});
document.getElementById('scheduleConfirmBtn').addEventListener('click', confirmSchedule);
```

- [ ] **Step 4: app.js — `openScheduleModal()` + `confirmSchedule()` 추가**

```js
function openScheduleModal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 60);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('scheduleDateTime').value = local;
  document.getElementById('scheduleCaption').value = state.slides[0]?.title || '';
  document.getElementById('scheduleModal').style.display = 'flex';
}

async function confirmSchedule() {
  const dt = document.getElementById('scheduleDateTime').value;
  const caption = document.getElementById('scheduleCaption').value;
  if (!dt) { alert('날짜를 선택해주세요.'); return; }

  const btn = document.getElementById('scheduleConfirmBtn');
  btn.disabled = true;
  btn.textContent = '등록 중...';

  try {
    let presetId = state.activePresetId;
    if (!presetId) {
      const saved = await dbUpsertPreset({
        channel_id: state.projectId,
        name: state.slides[0]?.title || '예약 포스트',
        slides_json: JSON.parse(JSON.stringify(state.slides)),
      });
      presetId = saved.id;
    }
    await dbUpsertPost({
      channel_id: state.projectId,
      preset_id: presetId,
      status: 'scheduled',
      scheduled_at: new Date(dt).toISOString(),
      caption,
      thumbnail_url: state.slides.find(s => s.bgImage)?.bgImage || null,
    });
    document.getElementById('scheduleModal').style.display = 'none';
    alert('예약 완료! 대시보드에서 확인하세요.');
  } catch (e) {
    alert('예약 실패: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '예약 등록';
  }
}
```

- [ ] **Step 5: 예약 흐름 검증**
  - 슬라이드 편집 후 "발행 예약" 클릭
  - 날짜 선택 → "예약 등록"
  - Supabase posts 테이블에 status='scheduled' 레코드 확인
  - 대시보드 오픈 → SCHEDULED 컬럼에 카드 확인
  - 캘린더에 해당 날짜 도트 표시 확인

- [ ] **Step 6: 커밋 + 배포**

```bash
git add app.js index.html style.css
git commit -m "feat: schedule post from canvas editor"
vercel --prod
```

---

## 완료 체크리스트

- [ ] 로그인 없이 접근 불가
- [ ] 이미지 업로드 → Supabase Storage, localStorage 용량 변화 없음
- [ ] 2인 동시 접속 시 동일 프리셋 목록 공유
- [ ] 기존 localStorage 데이터 자동 마이그레이션
- [ ] 대시보드: 캘린더 날짜 클릭 → 칸반 필터 동작
- [ ] 대시보드: 채널 탭 필터 동작
- [ ] 발행 예약 → posts 테이블 등록 → 대시보드 SCHEDULED 컬럼 표시
- [ ] 기존 캔버스 편집 기능 100% 동작
