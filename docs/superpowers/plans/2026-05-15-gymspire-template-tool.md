# Gymspire Instagram Template Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based Instagram post template editor with a 5-template gallery, real-time canvas preview, Pinterest quick links, and 1080×1350 PNG export for the GYMSPIRE brand.

**Architecture:** Single-directory vanilla JS app using `<script>` tags (file:// compatible, no build tools). Templates register themselves onto `window.GYMSPIRE_TEMPLATES`. `app.js` reads that registry and drives gallery, editor panel, canvas, and PNG export from a single state object.

**Tech Stack:** HTML5, CSS3, Vanilla JS (no modules, no build), Pretendard Variable Font (jsDelivr CDN), html2canvas 1.4.1 (cdnjs CDN)

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Shell, 3-panel DOM, CDN script tags |
| `style.css` | App UI chrome — sidebar, panels, buttons. NOT canvas content styles |
| `app.js` | State, gallery, editor, canvas render, export, Pinterest |
| `templates/motivation.js` | Template 1: fields + render |
| `templates/product.js` | Template 2: fields + render |
| `templates/promo.js` | Template 3: fields + render |
| `templates/tips.js` | Template 4: fields + render |
| `templates/cardnews.js` | Template 5: fields + render (multi-slide) |

> Canvas content styles live **inside template render functions as inline styles**, not in style.css. This ensures html2canvas captures them correctly.

---

### Task 1: Project Scaffold

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `app.js`
- Create: `templates/motivation.js`
- Create: `templates/product.js`
- Create: `templates/promo.js`
- Create: `templates/tips.js`
- Create: `templates/cardnews.js`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>GYMSPIRE Template Tool</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-name">GYMSPIRE</span>
        <span class="brand-sub">Template Tool</span>
      </div>
      <div class="sidebar-section">
        <p class="section-label">TEMPLATE</p>
        <div id="templateList"></div>
      </div>
      <div class="sidebar-section pinterest-section">
        <p class="section-label">PINTEREST</p>
        <div id="keywordGrid"></div>
      </div>
    </aside>

    <main class="canvas-area">
      <div class="canvas-wrapper">
        <div class="canvas" id="canvas"></div>
      </div>
      <div class="slide-nav" id="slideNav"></div>
      <button class="export-btn" id="exportBtn">↓  PNG 내보내기</button>
    </main>

    <aside class="editor-panel">
      <p class="section-label">EDIT</p>
      <div id="fields"></div>
    </aside>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="templates/motivation.js"></script>
  <script src="templates/product.js"></script>
  <script src="templates/promo.js"></script>
  <script src="templates/tips.js"></script>
  <script src="templates/cardnews.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create stub template files**

`templates/motivation.js`:
```js
window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'motivation',
  name: '동기부여 / 운동자극',
  slides: 1,
  fields: [],
  render(s, slideIndex) {
    return '<p style="color:#fff;padding:40px;font-size:32px">motivation stub</p>';
  }
});
```

Create the same pattern for the remaining 4 files, changing only `id`, `name`, and render text:

`templates/product.js` — `id: 'product', name: '제품 소개 / 입고'`
`templates/promo.js` — `id: 'promo', name: '할인 / 프로모션'`
`templates/tips.js` — `id: 'tips', name: '운동 팁 / 정보성'`
`templates/cardnews.js` — `id: 'cardnews', name: '카드뉴스', slides: 5`

- [ ] **Step 3: Create `style.css` shell**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Pretendard Variable', Pretendard, sans-serif;
  background: #111;
  color: #fff;
  height: 100vh;
  overflow: hidden;
}

.app { display: flex; height: 100vh; }
.sidebar { width: 220px; min-width: 220px; background: #1a1a1a; overflow-y: auto; }
.canvas-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: #0f0f0f; }
.editor-panel { width: 280px; min-width: 280px; background: #1a1a1a; overflow-y: auto; padding: 20px; }
```

- [ ] **Step 4: Create `app.js` shell**

```js
const state = {
  templateId: 'motivation',
  slideIndex: 0,
  slides: [{}],
};

function getTemplate(id) {
  return window.GYMSPIRE_TEMPLATES.find(t => t.id === id);
}

function init() {
  renderGallery();
  renderPinterest();
  loadTemplate('motivation');
  document.getElementById('exportBtn').addEventListener('click', exportPng);
}

function renderGallery() {}
function renderPinterest() {}
function loadTemplate(id) {}
function scaleCanvas() {}
function renderCanvas() {}
function renderEditor() {}
function exportPng() {}

document.addEventListener('DOMContentLoaded', init);
```

- [ ] **Step 5: Verify in browser**

Open `index.html` (file:// or VS Code Live Server → right-click index.html → Open with Live Server).
Expected: Dark 3-panel page loads. Tab title "GYMSPIRE Template Tool". No JS console errors.

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffold with 3-panel shell and stub templates"
```

---

### Task 2: CSS Layout

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Sidebar styles**

Add to `style.css`:
```css
.sidebar-brand {
  padding: 24px 20px 16px;
  border-bottom: 1px solid #2a2a2a;
}
.brand-name {
  display: block;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #fff;
}
.brand-sub {
  display: block;
  font-size: 11px;
  color: #555;
  margin-top: 2px;
  letter-spacing: 1px;
}
.sidebar-section {
  padding: 16px 0;
  border-bottom: 1px solid #2a2a2a;
}
.section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #444;
  padding: 0 20px 10px;
}
.template-item {
  display: block;
  width: 100%;
  padding: 10px 20px;
  background: none;
  border: none;
  color: #888;
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.template-item:hover { background: #222; color: #fff; }
.template-item.active { background: #1e3a5f; color: #2B9BF4; font-weight: 600; }
```

- [ ] **Step 2: Canvas wrapper styles**

Add to `style.css`:
```css
.canvas-wrapper {
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7);
}
.canvas {
  width: 1080px;
  height: 1350px;
  background: #000;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
  font-family: 'Pretendard Variable', Pretendard, sans-serif;
  transform-origin: top left;
}
```

- [ ] **Step 3: Editor panel field styles**

Add to `style.css`:
```css
.field-group { margin-bottom: 20px; }
.field-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #555;
  margin-bottom: 6px;
  text-transform: uppercase;
}
.field-input, .field-textarea {
  width: 100%;
  background: #111;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  padding: 8px 10px;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}
.field-input:focus, .field-textarea:focus { border-color: #2B9BF4; }
.field-textarea { min-height: 72px; }
.field-image-btn {
  width: 100%;
  padding: 10px;
  background: #111;
  border: 1px dashed #333;
  border-radius: 4px;
  color: #666;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, color 0.15s;
}
.field-image-btn:hover { border-color: #2B9BF4; color: #2B9BF4; }
.field-image-btn.has-image { border-style: solid; border-color: #2B9BF4; color: #2B9BF4; }
.toggle-row { display: flex; align-items: center; justify-content: space-between; }
.toggle-switch { position: relative; width: 36px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute;
  inset: 0;
  background: #333;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.toggle-switch input:checked + .toggle-slider { background: #2B9BF4; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(16px); }
```

- [ ] **Step 4: Slide nav, export button, Pinterest styles**

Add to `style.css`:
```css
.slide-nav { display: flex; gap: 8px; }
.slide-tab {
  width: 32px;
  height: 32px;
  background: #222;
  border: 1px solid #333;
  border-radius: 4px;
  color: #777;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.slide-tab:hover { background: #2a2a2a; color: #fff; }
.slide-tab.active { background: #1e3a5f; border-color: #2B9BF4; color: #2B9BF4; }
.export-btn {
  padding: 12px 32px;
  background: #2B9BF4;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.export-btn:hover { background: #1a8ae0; }
.export-btn:active { transform: scale(0.98); }
.export-btn:disabled { background: #333; color: #666; cursor: not-allowed; transform: none; }
.keyword-grid { padding: 0 12px; display: flex; flex-wrap: wrap; gap: 6px; }
.keyword-btn {
  padding: 5px 10px;
  background: #222;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  color: #777;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.keyword-btn:hover { background: #1e3a5f; border-color: #2B9BF4; color: #2B9BF4; }
.pinterest-section { flex: 1; border-bottom: none; }
```

- [ ] **Step 5: Verify layout**

Reload. Expected: Polished dark 3-panel layout. Sidebar with brand, template section, Pinterest section. Center canvas area. Right editor panel. Export button blue at bottom.

- [ ] **Step 6: Commit**

```bash
git add style.css
git commit -m "feat: complete dark 3-panel UI layout"
```

---

### Task 3: Template Gallery + State

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Implement `renderGallery()`**

Replace the stub in `app.js`:
```js
function renderGallery() {
  const list = document.getElementById('templateList');
  list.innerHTML = window.GYMSPIRE_TEMPLATES.map(t => `
    <button class="template-item ${t.id === state.templateId ? 'active' : ''}" data-id="${t.id}">
      ${t.name}
    </button>
  `).join('');
  list.querySelectorAll('.template-item').forEach(btn => {
    btn.addEventListener('click', () => loadTemplate(btn.dataset.id));
  });
}
```

- [ ] **Step 2: Implement `loadTemplate(id)` and `renderSlideNav()`**

Replace stubs:
```js
function loadTemplate(id) {
  const template = getTemplate(id);
  if (!template) return;
  state.templateId = id;
  state.slideIndex = 0;
  state.slides = Array.from({ length: template.slides }, () => {
    const defaults = {};
    template.fields.forEach(f => { defaults[f.key] = f.default; });
    return defaults;
  });
  renderGallery();
  renderSlideNav();
  renderEditor();
  renderCanvas();
}

function renderSlideNav() {
  const template = getTemplate(state.templateId);
  const nav = document.getElementById('slideNav');
  if (template.slides <= 1) { nav.innerHTML = ''; return; }
  nav.innerHTML = Array.from({ length: template.slides }, (_, i) => `
    <button class="slide-tab ${i === state.slideIndex ? 'active' : ''}" data-index="${i}">${i + 1}</button>
  `).join('');
  nav.querySelectorAll('.slide-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.slideIndex = parseInt(btn.dataset.index);
      renderSlideNav();
      renderEditor();
      renderCanvas();
    });
  });
}
```

- [ ] **Step 3: Verify gallery**

Reload. Expected: 5 template buttons visible. Clicking a button highlights it with blue. No console errors.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: template gallery and state management"
```

---

### Task 4: Canvas Scaling + Editor Panel

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Implement `scaleCanvas()`**

Replace stub:
```js
function scaleCanvas() {
  const area = document.querySelector('.canvas-area');
  const wrapper = document.querySelector('.canvas-wrapper');
  const canvas = document.getElementById('canvas');
  const availH = area.clientHeight - 120;
  const availW = area.clientWidth - 40;
  const scale = Math.min(availW / 1080, availH / 1350);
  canvas.style.transform = `scale(${scale})`;
  wrapper.style.width = `${Math.round(1080 * scale)}px`;
  wrapper.style.height = `${Math.round(1350 * scale)}px`;
}
```

Call it in `init()`:
```js
function init() {
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);
  renderGallery();
  renderPinterest();
  loadTemplate('motivation');
  document.getElementById('exportBtn').addEventListener('click', exportPng);
}
```

- [ ] **Step 2: Implement `renderCanvas()`**

Replace stub:
```js
function renderCanvas() {
  const template = getTemplate(state.templateId);
  const canvas = document.getElementById('canvas');
  const slideState = state.slides[state.slideIndex] || {};
  canvas.style.backgroundImage = slideState.bgImage ? `url(${slideState.bgImage})` : 'none';
  canvas.innerHTML = template.render(slideState, state.slideIndex);
}
```

- [ ] **Step 3: Implement `renderEditor()`, `renderField()`, `escHtml()`, `updateField()`**

Replace stubs:
```js
function renderEditor() {
  const template = getTemplate(state.templateId);
  const fieldsEl = document.getElementById('fields');
  const slideState = state.slides[state.slideIndex] || {};
  fieldsEl.innerHTML = template.fields.map(f => renderField(f, slideState[f.key] ?? f.default)).join('');

  fieldsEl.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    if (el.classList.contains('field-image-btn')) return;
    const evt = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      updateField(key, el.type === 'checkbox' ? el.checked : el.value);
    });
  });

  fieldsEl.querySelectorAll('.field-image-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          updateField(btn.dataset.key, ev.target.result);
          btn.textContent = '✓ 이미지 선택됨';
          btn.classList.add('has-image');
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  });
}

function renderField(field, value) {
  switch (field.type) {
    case 'text':
      return `<div class="field-group">
        <label class="field-label">${field.label}</label>
        <input class="field-input" type="text" data-key="${field.key}"
               value="${escHtml(String(value ?? ''))}" placeholder="${field.placeholder || ''}">
      </div>`;
    case 'textarea':
      return `<div class="field-group">
        <label class="field-label">${field.label}</label>
        <textarea class="field-textarea" data-key="${field.key}"
                  placeholder="${field.placeholder || ''}">${escHtml(String(value ?? ''))}</textarea>
      </div>`;
    case 'image':
      return `<div class="field-group">
        <label class="field-label">${field.label}</label>
        <button class="field-image-btn ${value ? 'has-image' : ''}" data-key="${field.key}">
          ${value ? '✓ 이미지 선택됨' : '+ 이미지 업로드'}
        </button>
      </div>`;
    case 'toggle':
      return `<div class="field-group">
        <div class="toggle-row">
          <label class="field-label" style="margin:0">${field.label}</label>
          <label class="toggle-switch">
            <input type="checkbox" data-key="${field.key}" ${value ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>`;
    default:
      return '';
  }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateField(key, value) {
  state.slides[state.slideIndex][key] = value;
  renderCanvas();
}
```

- [ ] **Step 4: Verify canvas system**

Reload. Expected: Canvas is scaled and centered. Editor panel shows "No fields" (stub templates have empty fields arrays). Resize window — canvas rescales. No errors.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: canvas scaling, editor panel, real-time field system"
```

---

### Task 5: Motivation Template

**Files:**
- Modify: `templates/motivation.js`

- [ ] **Step 1: Replace stub with full template**

```js
window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'motivation',
  name: '동기부여 / 운동자극',
  slides: 1,
  fields: [
    { key: 'bgImage',   label: '배경 이미지', type: 'image',  default: '' },
    { key: 'showBadge', label: '뱃지 표시',   type: 'toggle', default: true },
    { key: 'badge',     label: '뱃지 텍스트', type: 'text',   default: '운동자극은 GYMSPIRE', placeholder: '뱃지 텍스트' },
    { key: 'title',     label: '제목',         type: 'textarea', default: 'GYMSPIRE\n운동은 바로 이거야', placeholder: '메인 제목' },
    { key: 'subtitle',  label: '소제목',       type: 'text',   default: '소제목', placeholder: '소제목' },
  ],
  render(s) {
    const badge = (s.showBadge !== false) && s.badge
      ? `<div style="position:absolute;bottom:460px;left:48px;background:#2B9BF4;color:#fff;padding:10px 18px;border-radius:4px;font-size:22px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;">${s.badge}</div>`
      : '';
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.8) 65%,#000 100%);"></div>
      <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
      ${badge}
      <div style="position:absolute;bottom:220px;left:48px;right:48px;font-size:68px;font-weight:800;line-height:1.15;color:#fff;white-space:pre-wrap;">${s.title || ''}</div>
      <div style="position:absolute;bottom:150px;left:48px;right:48px;font-size:28px;font-weight:400;color:rgba(255,255,255,0.6);">${s.subtitle || ''}</div>
    `;
  }
});
```

- [ ] **Step 2: Verify**

Select "동기부여 / 운동자극". Editor shows 5 fields. Edit title → canvas updates instantly. Toggle badge → it appears/disappears. Upload background image → appears behind gradient overlay.

- [ ] **Step 3: Commit**

```bash
git add templates/motivation.js
git commit -m "feat: motivation template with real-time editing"
```

---

### Task 6: Product Template

**Files:**
- Modify: `templates/product.js`

- [ ] **Step 1: Replace stub**

```js
window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'product',
  name: '제품 소개 / 입고',
  slides: 1,
  fields: [
    { key: 'bgImage', label: '배경 이미지',  type: 'image',    default: '' },
    { key: 'badge',   label: '뱃지 텍스트', type: 'text',     default: 'NEW ARRIVAL', placeholder: 'NEW ARRIVAL' },
    { key: 'title',   label: '제품명',       type: 'textarea', default: 'GYMSHARK\nVital Seamless', placeholder: '제품명' },
    { key: 'price',   label: '가격 / 설명', type: 'text',     default: '₩89,000', placeholder: '가격 또는 설명' },
    { key: 'cta',     label: 'CTA',          type: 'text',     default: '국내배송 가능 · 링크 클릭', placeholder: 'CTA 텍스트' },
  ],
  render(s) {
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 35%,rgba(0,0,0,0.75) 60%,#000 100%);"></div>
      <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
      <div style="position:absolute;bottom:440px;left:48px;background:#2B9BF4;color:#fff;padding:10px 18px;border-radius:4px;font-size:20px;font-weight:700;letter-spacing:1px;white-space:nowrap;">${s.badge || 'NEW ARRIVAL'}</div>
      <div style="position:absolute;bottom:260px;left:48px;right:48px;font-size:62px;font-weight:800;line-height:1.2;color:#fff;white-space:pre-wrap;">${s.title || ''}</div>
      <div style="position:absolute;bottom:195px;left:48px;font-size:30px;font-weight:600;color:rgba(255,255,255,0.8);">${s.price || ''}</div>
      <div style="position:absolute;bottom:130px;left:48px;right:48px;font-size:22px;font-weight:400;color:rgba(255,255,255,0.5);">${s.cta || ''}</div>
    `;
  }
});
```

- [ ] **Step 2: Verify**

Select "제품 소개 / 입고". Badge, product title, price, CTA all update live.

- [ ] **Step 3: Commit**

```bash
git add templates/product.js
git commit -m "feat: product template"
```

---

### Task 7: Promo Template

**Files:**
- Modify: `templates/promo.js`

- [ ] **Step 1: Replace stub**

```js
window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'promo',
  name: '할인 / 프로모션',
  slides: 1,
  fields: [
    { key: 'bgImage',    label: '배경 이미지',  type: 'image', default: '' },
    { key: 'badge',      label: '뱃지 텍스트', type: 'text',  default: 'LIMITED', placeholder: 'LIMITED' },
    { key: 'discount',   label: '할인율',       type: 'text',  default: '30% OFF', placeholder: '30% OFF' },
    { key: 'condition',  label: '조건',         type: 'text',  default: '전 상품 · 한정수량', placeholder: '조건' },
    { key: 'period',     label: '기간',         type: 'text',  default: '05.15 – 05.20', placeholder: '기간' },
  ],
  render(s) {
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.65) 50%,#000 100%);"></div>
      <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
      <div style="position:absolute;top:120px;left:48px;background:#2B9BF4;color:#fff;padding:10px 18px;border-radius:4px;font-size:20px;font-weight:700;letter-spacing:2px;">${s.badge || 'LIMITED'}</div>
      <div style="position:absolute;top:50%;left:48px;right:48px;transform:translateY(-60%);font-size:110px;font-weight:900;line-height:1;color:#fff;letter-spacing:-2px;">${s.discount || ''}</div>
      <div style="position:absolute;bottom:240px;left:48px;right:48px;font-size:30px;font-weight:600;color:rgba(255,255,255,0.8);">${s.condition || ''}</div>
      <div style="position:absolute;bottom:170px;left:48px;font-size:24px;font-weight:400;color:rgba(255,255,255,0.45);">${s.period || ''}</div>
    `;
  }
});
```

- [ ] **Step 2: Verify**

Select "할인 / 프로모션". Large discount text centered vertically. Badge top-left. Condition and period at bottom.

- [ ] **Step 3: Commit**

```bash
git add templates/promo.js
git commit -m "feat: promo template"
```

---

### Task 8: Tips Template

**Files:**
- Modify: `templates/tips.js`

- [ ] **Step 1: Replace stub**

```js
window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'tips',
  name: '운동 팁 / 정보성',
  slides: 1,
  fields: [
    { key: 'bgImage',   label: '배경 이미지',     type: 'image', default: '' },
    { key: 'category',  label: '카테고리 뱃지',   type: 'text',  default: '오늘의 운동 팁', placeholder: '카테고리' },
    { key: 'tip1',      label: '팁 ①',            type: 'text',  default: '스쿼트 깊이가 관건이다', placeholder: '팁 1' },
    { key: 'tip2',      label: '팁 ②',            type: 'text',  default: '코어를 항상 잡아라', placeholder: '팁 2' },
    { key: 'tip3',      label: '팁 ③',            type: 'text',  default: '호흡을 절대 멈추지 마라', placeholder: '팁 3' },
    { key: 'tagline',   label: '태그라인',         type: 'text',  default: '@GYMSPIRE', placeholder: '태그라인' },
  ],
  render(s) {
    const tips = [s.tip1, s.tip2, s.tip3].filter(Boolean);
    const tipHtml = tips.map((tip, i) => `
      <div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:52px;">
        <span style="font-size:48px;font-weight:900;color:#2B9BF4;line-height:1;min-width:56px;">0${i + 1}</span>
        <span style="font-size:34px;font-weight:700;color:#fff;line-height:1.3;">${tip}</span>
      </div>
    `).join('');
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.88) 100%);"></div>
      <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
      <div style="position:absolute;top:110px;left:48px;background:#2B9BF4;color:#fff;padding:10px 18px;border-radius:4px;font-size:20px;font-weight:700;">${s.category || ''}</div>
      <div style="position:absolute;top:220px;left:48px;right:48px;">${tipHtml}</div>
      <div style="position:absolute;bottom:80px;left:48px;font-size:22px;font-weight:400;color:rgba(255,255,255,0.35);letter-spacing:2px;">${s.tagline || ''}</div>
    `;
  }
});
```

- [ ] **Step 2: Verify**

Select "운동 팁 / 정보성". Blue numbered tips render. Edit tip texts — updates live.

- [ ] **Step 3: Commit**

```bash
git add templates/tips.js
git commit -m "feat: tips template with numbered list"
```

---

### Task 9: Cardnews Template (Multi-Slide)

**Files:**
- Modify: `templates/cardnews.js`

- [ ] **Step 1: Replace stub**

```js
window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'cardnews',
  name: '카드뉴스',
  slides: 5,
  fields: [
    { key: 'bgImage', label: '배경 이미지 (표지)', type: 'image',    default: '' },
    { key: 'title',   label: '제목',               type: 'textarea', default: '', placeholder: '이 슬라이드 제목' },
    { key: 'body',    label: '본문',               type: 'textarea', default: '', placeholder: '본문 내용' },
  ],
  render(s, slideIndex) {
    if (slideIndex === 0) {
      return `
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.85) 65%,#000 100%);"></div>
        <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
        <div style="position:absolute;bottom:300px;left:48px;background:#2B9BF4;color:#fff;padding:10px 18px;border-radius:4px;font-size:20px;font-weight:700;">카드뉴스</div>
        <div style="position:absolute;bottom:120px;left:48px;right:48px;font-size:68px;font-weight:800;line-height:1.15;color:#fff;white-space:pre-wrap;">${s.title || ''}</div>
      `;
    }
    if (slideIndex === 4) {
      return `
        <div style="position:absolute;inset:0;background:#000;"></div>
        <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
        <div style="position:absolute;top:50%;left:48px;right:48px;transform:translateY(-50%);text-align:center;">
          <div style="font-size:40px;font-weight:800;color:#fff;margin-bottom:24px;">더 많은 콘텐츠는</div>
          <div style="font-size:52px;font-weight:900;color:#2B9BF4;letter-spacing:2px;">@GYMSPIRE</div>
          <div style="font-size:28px;font-weight:400;color:rgba(255,255,255,0.45);margin-top:24px;">팔로우 · 링크 클릭</div>
        </div>
      `;
    }
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.92) 100%);"></div>
      <div style="position:absolute;top:48px;left:48px;font-size:18px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.35);">GYMSPIRE</div>
      <div style="position:absolute;top:48px;right:48px;font-size:18px;font-weight:400;color:rgba(255,255,255,0.2);">${slideIndex} / 4</div>
      <div style="position:absolute;top:180px;left:48px;right:48px;">
        <div style="font-size:52px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:48px;white-space:pre-wrap;">${s.title || ''}</div>
        <div style="font-size:30px;font-weight:400;color:rgba(255,255,255,0.68);line-height:1.7;white-space:pre-wrap;">${s.body || ''}</div>
      </div>
    `;
  }
});
```

- [ ] **Step 2: Verify multi-slide**

Select "카드뉴스". Expected: 5 slide tabs appear below canvas. Slide 1 = cover with title. Slides 2–4 = title + body. Slide 5 = fixed CTA layout (no editable fields affect it). Each slide has independent content.

- [ ] **Step 3: Commit**

```bash
git add templates/cardnews.js
git commit -m "feat: cardnews multi-slide template"
```

---

### Task 10: Pinterest Quick Links

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add keywords constant**

Add near the top of `app.js` (after `getTemplate`, before `init`):
```js
const PINTEREST_KEYWORDS = [
  'Gymshark aesthetic',
  'Gymshark men',
  'Gymshark women',
  'Gymshark outfit',
  'David Laid',
  'Chris Bumstead',
  'Zac Perna',
  'Ryan Terry',
  'Nikki Blackketter',
  'gym aesthetic',
  'physique aesthetic',
  "men's physique",
  'fitness photography',
  'bodybuilding aesthetic',
];
```

- [ ] **Step 2: Implement `renderPinterest()`**

Replace stub:
```js
function renderPinterest() {
  const grid = document.getElementById('keywordGrid');
  grid.innerHTML = PINTEREST_KEYWORDS.map(kw => {
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(kw)}`;
    return `<a class="keyword-btn" href="${url}" target="_blank" rel="noopener">${kw}</a>`;
  }).join('');
}
```

- [ ] **Step 3: Verify**

Reload. Pinterest section shows 14 pill-shaped keyword buttons. Clicking one opens Pinterest search in a new tab.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: pinterest keyword quick links"
```

---

### Task 11: PNG Export

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Implement `exportPng()`**

Replace stub:
```js
function exportPng() {
  const canvas = document.getElementById('canvas');
  const btn = document.getElementById('exportBtn');

  btn.disabled = true;
  btn.textContent = '렌더링 중...';

  // Remove CSS scale transform so html2canvas captures true 1080×1350
  const prevTransform = canvas.style.transform;
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  canvas.style.top = '0';
  canvas.style.transform = 'none';

  html2canvas(canvas, {
    scale: 1,
    width: 1080,
    height: 1350,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#000000',
  }).then(rendered => {
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '').replace(/-/g, '');
    const filename = `gymspire-${state.templateId}-${ts}.png`;
    const link = document.createElement('a');
    link.download = filename;
    link.href = rendered.toDataURL('image/png');
    link.click();
  }).finally(() => {
    canvas.style.position = '';
    canvas.style.left = '';
    canvas.style.top = '';
    canvas.style.transform = prevTransform;
    btn.disabled = false;
    btn.textContent = '↓  PNG 내보내기';
  });
}
```

- [ ] **Step 2: Verify export**

Fill in a template with text and a background image. Click "PNG 내보내기". Expected: File `gymspire-motivation-YYYYMMDD_HHMM.png` downloads. Open in image viewer — confirms 1080×1350px, Pretendard font, correct layout.

> If background image doesn't appear in the exported PNG: this is a file:// CORS issue. Use VS Code Live Server instead of opening index.html directly. Uploaded images (data URLs) always export correctly regardless.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: PNG export at 1080x1350 via html2canvas"
```

---

## Completion Checklist

- [ ] 3-panel layout renders correctly
- [ ] All 5 templates selectable from gallery
- [ ] Real-time canvas updates on text input
- [ ] Background image upload works (drag or click)
- [ ] Badge toggle shows/hides badge element
- [ ] Cardnews shows 5 slide tabs, each edits independently
- [ ] Cardnews slide 5 is fixed CTA (not editable)
- [ ] Pinterest 14 keyword buttons open correct search URLs
- [ ] PNG export downloads at 1080×1350 with correct content
- [ ] Filename includes template name + timestamp
