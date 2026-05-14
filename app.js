const state = {
  templateId: 'motivation',
  slideIndex: 0,
  slides: [{}],
};

function getTemplate(id) {
  return window.GYMSPIRE_TEMPLATES.find(t => t.id === id);
}

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

function init() {
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);
  renderGallery();
  renderPinterest();
  loadTemplate('motivation');
  document.getElementById('exportBtn').addEventListener('click', exportPng);
}

// ── Task 3: Template Gallery + State ────────────────────────────────────────

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

// ── Task 4: Canvas Scaling + Editor Panel ───────────────────────────────────

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

function renderCanvas() {
  const template = getTemplate(state.templateId);
  const canvas = document.getElementById('canvas');
  const slideState = state.slides[state.slideIndex] || {};
  canvas.style.backgroundImage = slideState.bgImage ? `url(${slideState.bgImage})` : 'none';
  canvas.innerHTML = template.render(slideState, state.slideIndex);
}

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
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function updateField(key, value) {
  state.slides[state.slideIndex][key] = value;
  renderCanvas();
}

// ── Task 10: Pinterest Quick Links ──────────────────────────────────────────

function renderPinterest() {
  const grid = document.getElementById('keywordGrid');
  grid.innerHTML = PINTEREST_KEYWORDS.map(kw => {
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(kw)}`;
    return `<a class="keyword-btn" href="${url}" target="_blank" rel="noopener">${kw}</a>`;
  }).join('');
}

// ── Stub: PNG export (Task 7) ────────────────────────────────────────────────

function exportPng() {}

document.addEventListener('DOMContentLoaded', init);
