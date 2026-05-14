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

// ── Stubs for Task 4 ─────────────────────────────────────────────────────────

function scaleCanvas() {}
function renderCanvas() {}
function renderEditor() {}

// ── Stub: Pinterest panel (Task 6) ──────────────────────────────────────────

function renderPinterest() {}

// ── Stub: PNG export (Task 7) ────────────────────────────────────────────────

function exportPng() {}

document.addEventListener('DOMContentLoaded', init);
