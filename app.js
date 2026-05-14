const state = {
  templateId: 'motivation',
  slideIndex: 0,
  slides: [{}],
};

function getTemplate(id) {
  return window.GYMSPIRE_TEMPLATES.find(t => t.id === id);
}

window.outroSlide = function() {
  return `
    <div style="position:absolute;inset:0;background:#000;"></div>
    <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:20px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.5);">GYMSPIRE</div>
    <div style="position:absolute;top:50%;left:56px;right:56px;transform:translateY(-55%);">
      <div style="font-size:48px;margin-bottom:24px;">🇰🇷</div>
      <div style="font-size:20px;font-weight:600;color:rgba(255,255,255,0.4);letter-spacing:1.5px;margin-bottom:20px;">No.1 'GYMSHARK' 전문 커뮤니티</div>
      <div style="font-size:68px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:36px;letter-spacing:-1px;">운동은<br>멈추지 않는다</div>
      <div style="font-size:28px;font-weight:400;color:rgba(255,255,255,0.5);line-height:1.6;">팔로우하고 짐샤크를 경험해봐<br>링크에서 국내배송 바로 가능</div>
    </div>
    <div style="position:absolute;bottom:90px;left:56px;">
      <div style="font-size:36px;font-weight:900;color:#2B9BF4;letter-spacing:2px;">@GYMSPIRE</div>
      <div style="font-size:20px;font-weight:400;color:rgba(255,255,255,0.25);margin-top:10px;letter-spacing:1px;">FOLLOW · LINK IN BIO</div>
    </div>
  `;
};

window.contentSlide = function(s, idx, total) {
  const body = (s.body || '').replace(/\*\*(.*?)\*\*/g, '<span style="font-weight:800;color:#fff">$1</span>');
  return `
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 45%,rgba(0,0,0,0.75) 62%,#000 100%);"></div>
    <div style="position:absolute;top:40px;right:48px;font-size:18px;font-weight:400;color:rgba(255,255,255,0.2);">${idx}/${total - 1}</div>
    <div style="position:absolute;bottom:120px;left:56px;right:56px;">
      <div style="font-size:56px;font-weight:800;line-height:1.2;color:#fff;white-space:pre-wrap;margin-bottom:28px;">${s.title || ''}</div>
      <div style="font-size:34px;font-weight:400;color:rgba(255,255,255,0.78);line-height:1.7;">${body}</div>
    </div>
  `;
};

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
  document.getElementById('pinterestToggle').addEventListener('click', () => {
    const grid = document.getElementById('keywordGrid');
    const btn = document.getElementById('pinterestToggle');
    const hidden = grid.style.display === 'none';
    grid.style.display = hidden ? '' : 'none';
    btn.textContent = hidden ? '−' : '+';
  });
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
  const count = template.defaultSlides || template.slides || 1;
  state.slides = Array.from({ length: count }, () => {
    const defaults = {};
    template.fields.forEach(f => { defaults[f.key] = f.default ?? ''; });
    return defaults;
  });
  renderGallery();
  renderFilmstrip();
  renderEditor();
  renderCanvas();
}

function addSlide() {
  const template = getTemplate(state.templateId);
  const maxSlides = template.maxSlides || template.slides || 10;
  if (state.slides.length >= maxSlides) return;
  const defaults = {};
  template.fields.forEach(f => { defaults[f.key] = f.default ?? ''; });
  state.slides.push(defaults);
  state.slideIndex = state.slides.length - 1;
  renderFilmstrip();
  renderEditor();
  renderCanvas();
}

function removeCurrentSlide() {
  const template = getTemplate(state.templateId);
  const minSlides = template.defaultSlides || 1;
  if (state.slides.length <= minSlides || state.slideIndex === 0) return;
  state.slides.splice(state.slideIndex, 1);
  state.slideIndex = Math.min(state.slideIndex, state.slides.length - 1);
  renderFilmstrip();
  renderEditor();
  renderCanvas();
}

function renderFilmstrip() {
  const template = getTemplate(state.templateId);
  const filmstrip = document.getElementById('filmstrip');
  const maxSlides = template.maxSlides || template.slides || 10;

  const outroIndex = state.slides.length;
  const outroItem = `
    <div class="filmstrip-item ${state.slideIndex === outroIndex ? 'active' : ''}" data-index="${outroIndex}">
      <div class="filmstrip-preview-wrap">
        <div class="filmstrip-preview">${window.outroSlide()}</div>
      </div>
      <span class="filmstrip-num">END</span>
    </div>
  `;

  filmstrip.innerHTML = state.slides.map((slideState, i) => {
    const bg = slideState.bgImage ? `url(${slideState.bgImage})` : 'none';
    return `
      <div class="filmstrip-item ${i === state.slideIndex ? 'active' : ''}" data-index="${i}">
        <div class="filmstrip-preview-wrap">
          <div class="filmstrip-preview" style="background-image:${bg}">
            ${template.render(slideState, i, state.slides.length)}
          </div>
        </div>
        <span class="filmstrip-num">${i + 1}</span>
      </div>
    `;
  }).join('')
  + (state.slides.length < maxSlides ? `<button class="filmstrip-add" id="addSlideBtn">+</button>` : '')
  + outroItem;

  filmstrip.querySelectorAll('.filmstrip-item').forEach(item => {
    item.addEventListener('click', () => {
      state.slideIndex = parseInt(item.dataset.index);
      renderFilmstrip();
      renderEditor();
      renderCanvas();
    });
  });
  const addBtn = document.getElementById('addSlideBtn');
  if (addBtn) addBtn.addEventListener('click', addSlide);
}


// ── Task 4: Canvas Scaling + Editor Panel ───────────────────────────────────

function scaleCanvas() {
  const area = document.querySelector('.canvas-area');
  const wrapper = document.querySelector('.canvas-wrapper');
  const canvas = document.getElementById('canvas');
  const availH = area.clientHeight - 170;
  const availW = area.clientWidth - 40;
  const scale = Math.min(availW / 1080, availH / 1350);
  canvas.style.transform = `scale(${scale})`;
  wrapper.style.width = `${Math.round(1080 * scale)}px`;
  wrapper.style.height = `${Math.round(1350 * scale)}px`;
}

function renderCanvas() {
  const template = getTemplate(state.templateId);
  const canvas = document.getElementById('canvas');
  if (state.slideIndex === state.slides.length) {
    canvas.style.backgroundImage = 'none';
    canvas.innerHTML = window.outroSlide();
    return;
  }
  const slideState = state.slides[state.slideIndex] || {};
  canvas.style.backgroundImage = slideState.bgImage ? `url(${slideState.bgImage})` : 'none';
  canvas.innerHTML = template.render(slideState, state.slideIndex, state.slides.length);
}

function renderEditor() {
  const template = getTemplate(state.templateId);
  const fieldsEl = document.getElementById('fields');
  const slideState = state.slides[state.slideIndex] || {};

  if (state.slideIndex === state.slides.length) {
    fieldsEl.innerHTML = `<div style="padding:20px 0;font-size:11px;color:#444;letter-spacing:1px;line-height:1.8;">고정 아웃트로 슬라이드<br><span style="color:#333;">모든 게시물의 마지막 페이지</span></div>`;
    return;
  }

  const visibleKeys = template.fieldsForSlide ? template.fieldsForSlide(state.slideIndex) : null;
  const visibleFields = visibleKeys ? template.fields.filter(f => visibleKeys.includes(f.key)) : template.fields;

  const canRemove = state.slideIndex > 0 && state.slides.length > (template.defaultSlides || 1);
  const slideInfo = `<div class="slide-info">
    <span>SLIDE ${state.slideIndex + 1} / ${state.slides.length}</span>
    ${canRemove ? `<button class="remove-slide-btn" id="removeSlideBtn">× 삭제</button>` : ''}
  </div>`;

  fieldsEl.innerHTML = slideInfo + visibleFields.map(f => renderField(f, slideState[f.key] ?? f.default)).join('');

  const removeBtn = document.getElementById('removeSlideBtn');
  if (removeBtn) removeBtn.addEventListener('click', removeCurrentSlide);

  fieldsEl.querySelectorAll('.bold-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ta = fieldsEl.querySelector(`[data-key="${btn.dataset.target}"]`);
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const sel = ta.value.slice(start, end);
      if (!sel) return;
      ta.value = ta.value.slice(0, start) + `**${sel}**` + ta.value.slice(end);
      ta.selectionStart = start;
      ta.selectionEnd = end + 4;
      ta.focus();
      updateField(btn.dataset.target, ta.value);
    });
  });

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
        <div class="textarea-header">
          <label class="field-label">${field.label}</label>
          <button class="bold-btn" data-target="${field.key}" title="선택 텍스트 볼드">B</button>
        </div>
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
  renderFilmstrip();
}

// ── Task 10: Pinterest Quick Links ──────────────────────────────────────────

function renderPinterest() {
  const grid = document.getElementById('keywordGrid');
  grid.innerHTML = PINTEREST_KEYWORDS.map(kw => {
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(kw)}`;
    return `<a class="keyword-btn" href="${url}" target="_blank" rel="noopener">${kw}</a>`;
  }).join('');
}

// ── Task 11: PNG Export ──────────────────────────────────────────────────────

function exportPng() {
  const canvas = document.getElementById('canvas');
  const btn = document.getElementById('exportBtn');

  btn.disabled = true;
  btn.textContent = '렌더링 중...';

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

document.addEventListener('DOMContentLoaded', init);
