const state = {
  templateId: 'cardnews',
  slideIndex: 0,
  slides: [{}],
  outroImage: '',
  outroPosX: 50,
  outroPosY: 50,
  selectedDragKey: null,
  activePresetId: null,
  appMode: 'edit',
  canvasH: 1350,
};

function getTemplate(id) {
  return window.GYMSPIRE_TEMPLATES.find(t => t.id === id);
}

window.outroSlide = function() {
  return `
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.75) 60%,#000 100%);"></div>
    <img src="./gymspire-logo.png" style="position:absolute;top:28px;left:50%;transform:translateX(-50%);height:130px;mix-blend-mode:multiply;opacity:0.6;pointer-events:none;">
    <div style="position:absolute;top:50%;left:56px;right:56px;transform:translateY(-55%);">
      <div style="font-size:22px;font-weight:700;color:rgba(255,255,255,0.35);letter-spacing:1px;margin-bottom:28px;">🇰🇷 &nbsp;No.1 GYMSHARK 전문 커뮤니티</div>
      <div style="font-size:72px;font-weight:900;color:#fff;line-height:1.05;margin-bottom:36px;letter-spacing:-2px;">Bad day?<br>Go gym.</div>
      <div style="width:48px;height:3px;background:#2B9BF4;margin-bottom:36px;"></div>
      <div style="font-size:28px;font-weight:400;color:rgba(255,255,255,0.45);line-height:1.7;">국내배송 · 최신 컬렉션 · 착용 정보<br>팔로우하면 다 보입니다</div>
    </div>
    <div style="position:absolute;bottom:90px;left:56px;">
      <div style="font-size:34px;font-weight:900;color:#2B9BF4;letter-spacing:1px;">@gymspire.kr</div>
      <div style="font-size:19px;font-weight:400;color:rgba(255,255,255,0.2);margin-top:10px;letter-spacing:2px;">FOLLOW · LINK IN BIO</div>
    </div>
  `;
};

window.contentSlide = function(s, idx, total) {
  const body = (s.body || '').replace(/\*\*(.*?)\*\*/g, '<span style="font-weight:800;color:#fff">$1</span>');
  return `
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 45%,rgba(0,0,0,0.75) 62%,#000 100%);pointer-events:none;"></div>
    <div style="position:absolute;top:40px;right:48px;font-size:18px;font-weight:400;color:rgba(255,255,255,0.2);pointer-events:none;">${idx}/${total - 1}</div>
    <div style="position:absolute;bottom:120px;left:56px;right:56px;">
      <div data-drag-key="title" style="font-size:56px;font-weight:800;line-height:1.2;color:#fff;white-space:pre-wrap;margin-bottom:28px;">${s.title || ''}</div>
      <div data-drag-key="body" style="font-size:36px;font-weight:400;color:rgba(255,255,255,0.90);line-height:1.7;white-space:pre-wrap;">${body}</div>
    </div>
  `;
};

function buildBgHtml(s) {
  const img = s.bgImage;
  if (!img) return `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;pointer-events:none;">
      <svg width="180" height="180" viewBox="0 0 24 24" fill="none" stroke="#484848" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>
      <div style="text-align:center;">
        <div style="font-size:52px;font-weight:400;color:#555;letter-spacing:-0.5px;margin-bottom:24px;">배경 이미지를 추가하세요</div>
        <div style="font-size:28px;font-weight:400;color:#666;letter-spacing:1px;">우측 패널 → 이미지 업로드</div>
      </div>
    </div>`;
  const pos = `${s.bgPosX ?? 50}% ${s.bgPosY ?? 50}%`;
  return `<div class="bg-layer" style="position:absolute;inset:0;background-image:url(${img});background-size:cover;background-position:${pos};"></div>`;
}

function applyDragOffsets(container, slideState) {
  if (!slideState) return;
  container.querySelectorAll('[data-drag-key]').forEach(el => {
    const off = slideState['_pos_' + el.dataset.dragKey] || { x: 0, y: 0 };
    const base = el.dataset.baseTransform || '';
    el.style.transform = base ? `${base} translate(${off.x}px,${off.y}px)` : `translate(${off.x}px,${off.y}px)`;
  });
}

function applyTextStyles(container, slideState, showSelection) {
  if (!slideState) return;
  container.querySelectorAll('[data-drag-key]').forEach(el => {
    const key = el.dataset.dragKey;
    const opacity = slideState['_opacity_' + key];
    const size = slideState['_size_' + key];
    const color = slideState['_color_' + key];
    if (opacity !== undefined) el.style.opacity = opacity / 100;
    if (size !== undefined) el.style.fontSize = size + 'px';
    el.style.color = color || '';
    if (showSelection) {
      el.classList.toggle('drag-selected', key === state.selectedDragKey);
    }
  });
}

function getCanvasScale() {
  const m = document.getElementById('canvas').style.transform.match(/scale\(([\d.]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

function attachDragHandlers(canvas) {
  const slideIdx = state.slideIndex;
  if (slideIdx === state.slides.length) return;
  const slideState = state.slides[slideIdx];

  canvas.querySelectorAll('[data-drag-key]').forEach(el => {
    const key = el.dataset.dragKey;
    el.style.cursor = 'grab';
    let startX, startY, origX, origY, active = false;

    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
      active = true;
      startX = e.clientX; startY = e.clientY;
      const stored = slideState['_pos_' + key] || { x: 0, y: 0 };
      origX = stored.x; origY = stored.y;
    });

    el.addEventListener('pointermove', e => {
      if (!active) return;
      const sc = getCanvasScale();
      const dx = (e.clientX - startX) / sc, dy = (e.clientY - startY) / sc;
      const base = el.dataset.baseTransform || '';
      el.style.transform = base
        ? `${base} translate(${origX + dx}px,${origY + dy}px)`
        : `translate(${origX + dx}px,${origY + dy}px)`;
    });

    el.addEventListener('pointerup', e => {
      if (!active) return;
      active = false;
      el.style.cursor = 'grab';
      const sc = getCanvasScale();
      const dx = (e.clientX - startX) / sc, dy = (e.clientY - startY) / sc;
      slideState['_pos_' + key] = { x: origX + dx, y: origY + dy };
      if (Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5) {
        state.selectedDragKey = key;
        renderTextStylePanel();
        applyTextStyles(canvas, slideState, true);
      }
      renderFilmstrip();
      pushHistory();
    });

    el.addEventListener('pointercancel', () => { active = false; el.style.cursor = 'grab'; });

    el.addEventListener('dblclick', e => {
      e.preventDefault();
      delete slideState['_pos_' + key];
      applyDragOffsets(canvas, slideState);
      renderFilmstrip();
      pushHistory();
    });
  });
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
  loadTemplate('cardnews');
  document.getElementById('exportBtn').addEventListener('click', exportPng);
  document.getElementById('exportAllBtn').addEventListener('click', exportAllPng);
  document.getElementById('savePresetBtn').addEventListener('click', savePreset);
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  initAiModal();
  renderPresets();
  fetchGymsharkNews();
  document.getElementById('newsModeBtn').addEventListener('click', () => {
    setMode(state.appMode === 'news' ? 'edit' : 'news');
  });
  document.getElementById('pinterestToggle').addEventListener('click', () => {
    const grid = document.getElementById('keywordGrid');
    const btn = document.getElementById('pinterestToggle');
    const hidden = grid.style.display === 'none';
    grid.style.display = hidden ? '' : 'none';
    btn.textContent = hidden ? '−' : '+';
  });
  initRatioBtns();
  initSlideRegen();

  document.addEventListener('pointerdown', e => {
    if (!state.selectedDragKey) return;
    if (e.target.closest('[data-drag-key]') || e.target.closest('#textStylePanel')) return;
    const slideState = state.slides[state.slideIndex];
    state.selectedDragKey = null;
    renderTextStylePanel();
    applyTextStyles(document.getElementById('canvas'), slideState, true);
  });
}

function initRatioBtns() {
  document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const h = parseInt(btn.dataset.h);
      if (state.canvasH === h) return;
      state.canvasH = h;
      document.querySelectorAll('.ratio-btn').forEach(b => b.classList.toggle('active', b === btn));
      scaleCanvas();
      renderCanvas();
      renderFilmstrip();
    });
  });
}

let slideRegenTargetIdx = null;

function initSlideRegen() {
  const modal = document.getElementById('slideRegenModal');
  document.getElementById('slideRegenClose').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.style.display = 'none';
  });
  document.getElementById('slideRegenHint').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runSlideRegen();
  });
  document.getElementById('slideRegenBtn').addEventListener('click', runSlideRegen);

  document.getElementById('filmstrip').addEventListener('click', e => {
    const regenBtn = e.target.closest('.filmstrip-regen-btn');
    if (!regenBtn) return;
    e.stopPropagation();
    slideRegenTargetIdx = parseInt(regenBtn.dataset.index);
    document.getElementById('slideRegenTitle').textContent = `슬라이드 ${slideRegenTargetIdx + 1} 재생성`;
    document.getElementById('slideRegenHint').value = '';
    document.getElementById('slideRegenBtn').disabled = false;
    document.getElementById('slideRegenBtn').textContent = '재생성';
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('slideRegenHint').focus(), 30);
  });
}

async function runSlideRegen() {
  if (slideRegenTargetIdx === null) return;
  const template = getTemplate(state.templateId);
  const hint = document.getElementById('slideRegenHint').value.trim();
  const btn = document.getElementById('slideRegenBtn');
  btn.disabled = true;
  btn.textContent = '생성 중...';

  const idx = slideRegenTargetIdx;
  const keys = (template.fieldsForSlide ? template.fieldsForSlide(idx) : template.fields.map(f => f.key))
    .filter(k => k !== 'bgImage');
  const fieldDescs = keys.map(k => {
    const def = template.fields.find(f => f.key === k);
    return `- ${k}: ${def?.label || k}`;
  }).join('\n');

  const tone = document.querySelector('.ai-tone-btn.active')?.dataset.tone || 'casual';
  const speech = document.querySelector('.ai-speech-btn.active')?.dataset.speech || 'friendly';
  const target = document.querySelector('.ai-target-btn.active')?.dataset.target || 'all';

  const contextSlides = state.slides.map((s, i) => {
    const vals = keys.map(k => `${k}: ${s[k] || ''}`).join(', ');
    return `슬라이드 ${i + 1}: ${vals}`;
  }).join('\n');

  const systemMsg = `당신은 짐샤크(Gymshark) 한국 공식 인스타그램 @gymspire.kr의 SNS 콘텐츠 전문가입니다. 슬라이드 카드 뉴스 형식으로 작성합니다.`;
  const userMsg = `현재 카드뉴스의 전체 맥락:\n${contextSlides}\n\n슬라이드 ${idx + 1}번만 재생성해주세요.\n\n필드 목록:\n${fieldDescs}\n\n${hint ? `수정 방향: ${hint}\n\n` : ''}JSON만 응답. { ${keys.map(k => `"${k}": "값"`).join(', ')} }`;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.80,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `HTTP ${res.status}`); }
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    const slideState = state.slides[idx];
    keys.forEach(k => { if (parsed[k] !== undefined) slideState[k] = parsed[k]; });
    renderCanvas();
    renderFilmstrip();
    renderEditor();
    pushHistory();
    document.getElementById('slideRegenModal').style.display = 'none';
  } catch (err) {
    alert(`재생성 실패: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '재생성';
  }
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
  if (state.appMode === 'news') setMode('edit');
  state.templateId = id;
  state.slideIndex = 0;
  state.selectedDragKey = null;
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
  history.stack = [snapshotState()];
  history.index = 0;
  updateHistoryBtns();
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
  pushHistory();
}

function removeCurrentSlide() {
  if (state.slides.length <= 1 || state.slideIndex === 0) return;
  state.slides.splice(state.slideIndex, 1);
  state.slideIndex = Math.min(state.slideIndex, state.slides.length - 1);
  renderFilmstrip();
  renderEditor();
  renderCanvas();
  pushHistory();
}

function renderFilmstrip() {
  const template = getTemplate(state.templateId);
  const filmstrip = document.getElementById('filmstrip');
  const maxSlides = template.maxSlides || template.slides || 10;

  const outroIndex = state.slides.length;
  const outroS = { bgImage: state.outroImage, bgPosX: state.outroPosX, bgPosY: state.outroPosY };
  const outroItem = `
    <div class="filmstrip-item ${state.slideIndex === outroIndex ? 'active' : ''}" data-index="${outroIndex}">
      <div class="filmstrip-preview-wrap">
        <div class="filmstrip-preview">${buildBgHtml(outroS)}${window.outroSlide()}</div>
      </div>
      <span class="filmstrip-num">END</span>
    </div>
  `;

  filmstrip.innerHTML = state.slides.map((slideState, i) => {
    return `
      <div class="filmstrip-item ${i === state.slideIndex ? 'active' : ''}" data-index="${i}" draggable="true">
        <div class="filmstrip-preview-wrap">
          <div class="filmstrip-preview">
            ${buildBgHtml(slideState)}
            ${template.render(slideState, i, state.slides.length)}
          </div>
        </div>
        <span class="filmstrip-num">${i + 1}</span>
        <button class="filmstrip-regen-btn" data-index="${i}" title="이 슬라이드 재생성">↻</button>
      </div>
    `;
  }).join('')
  + (state.slides.length < maxSlides ? `<button class="filmstrip-add" id="addSlideBtn">+</button>` : '')
  + outroItem;

  state.slides.forEach((slideState, i) => {
    const previews = filmstrip.querySelectorAll('.filmstrip-preview');
    if (previews[i]) {
      applyDragOffsets(previews[i], slideState);
      applyTextStyles(previews[i], slideState);
    }
  });

  filmstrip.querySelectorAll('.filmstrip-item').forEach(item => {
    item.addEventListener('click', () => {
      state.selectedDragKey = null;
      state.slideIndex = parseInt(item.dataset.index);
      renderFilmstrip();
      renderEditor();
      renderCanvas();
    });
  });

  let filmstripDragSrc = null;
  filmstrip.querySelectorAll('.filmstrip-item[draggable]').forEach(item => {
    item.addEventListener('dragstart', e => {
      filmstripDragSrc = parseInt(item.dataset.index);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', () => {
      filmstrip.querySelectorAll('.filmstrip-item').forEach(el => el.classList.remove('dragging', 'drag-over'));
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      filmstrip.querySelectorAll('.filmstrip-item').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const destIdx = parseInt(item.dataset.index);
      if (filmstripDragSrc === null || filmstripDragSrc === destIdx) return;
      const moved = state.slides.splice(filmstripDragSrc, 1)[0];
      state.slides.splice(destIdx, 0, moved);
      if (state.slideIndex === filmstripDragSrc) {
        state.slideIndex = destIdx;
      } else if (filmstripDragSrc < state.slideIndex && destIdx >= state.slideIndex) {
        state.slideIndex--;
      } else if (filmstripDragSrc > state.slideIndex && destIdx <= state.slideIndex) {
        state.slideIndex++;
      }
      filmstripDragSrc = null;
      renderFilmstrip();
      renderCanvas();
      renderEditor();
      pushHistory();
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
  const canvasH = state.canvasH || 1350;
  const availH = area.clientHeight - 170;
  const availW = area.clientWidth - 40;
  const scale = Math.min(availW / 1080, availH / canvasH);
  canvas.style.width = '1080px';
  canvas.style.height = canvasH + 'px';
  canvas.style.transform = `scale(${scale})`;
  wrapper.style.width = `${Math.round(1080 * scale)}px`;
  wrapper.style.height = `${Math.round(canvasH * scale)}px`;
}

function renderCanvas() {
  const template = getTemplate(state.templateId);
  const canvas = document.getElementById('canvas');
  canvas.style.backgroundImage = 'none';
  if (state.slideIndex === state.slides.length) {
    const outroS = { bgImage: state.outroImage, bgPosX: state.outroPosX, bgPosY: state.outroPosY };
    canvas.innerHTML = buildBgHtml(outroS) + window.outroSlide();
    return;
  }
  const slideState = state.slides[state.slideIndex] || {};
  canvas.innerHTML = buildBgHtml(slideState) + template.render(slideState, state.slideIndex, state.slides.length);
  applyDragOffsets(canvas, slideState);
  applyTextStyles(canvas, slideState, true);
  attachDragHandlers(canvas);
}

function attachPosPicker(picker, onMove, onEnd) {
  let active = false;
  function calcPos(e) {
    const rect = picker.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100)));
    const y = Math.round(Math.max(0, Math.min(100, (e.clientY - rect.top) / rect.height * 100)));
    return { x, y };
  }
  function apply(e) {
    const { x, y } = calcPos(e);
    onMove(x, y);
    picker.querySelector('.pos-handle').style.cssText = `left:${x}%;top:${y}%`;
  }
  picker.addEventListener('pointerdown', e => {
    active = true;
    picker.setPointerCapture(e.pointerId);
    apply(e);
  });
  picker.addEventListener('pointermove', e => { if (active) apply(e); });
  picker.addEventListener('pointerup', () => { if (active) { active = false; onEnd(); } });
  picker.addEventListener('pointercancel', () => { active = false; });
}

function renderEditor() {
  const template = getTemplate(state.templateId);
  const fieldsEl = document.getElementById('fields');
  const slideState = state.slides[state.slideIndex] || {};

  if (state.slideIndex === state.slides.length) {
    const opx = state.outroPosX ?? 50, opy = state.outroPosY ?? 50;
    const outroPicker = state.outroImage ? `<div class="pos-picker"><div class="pos-handle" style="left:${opx}%;top:${opy}%"></div></div>` : '';
    fieldsEl.innerHTML = `
      <div style="padding:16px 0 16px;font-size:10px;font-weight:700;color:#444;letter-spacing:1.5px;text-transform:uppercase;">고정 아웃트로</div>
      <div class="field-group">
        <label class="field-label">배경 이미지</label>
        <button class="field-image-btn ${state.outroImage ? 'has-image' : ''}" id="outroImageBtn">
          ${state.outroImage ? '✓ 이미지 선택됨' : '+ 이미지 업로드'}
        </button>
        ${outroPicker}
      </div>
    `;
    document.getElementById('outroImageBtn').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          state.outroImage = ev.target.result;
          renderCanvas();
          renderFilmstrip();
          renderEditor();
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
    const outroPicEl = fieldsEl.querySelector('.pos-picker');
    if (outroPicEl) {
      attachPosPicker(outroPicEl,
        (x, y) => {
          state.outroPosX = x;
          state.outroPosY = y;
          const bgL = document.querySelector('#canvas .bg-layer');
          if (bgL) bgL.style.backgroundPosition = `${x}% ${y}%`;
        },
        () => renderFilmstrip()
      );
    }
    return;
  }

  const visibleKeys = template.fieldsForSlide ? template.fieldsForSlide(state.slideIndex) : null;
  const visibleFields = visibleKeys ? template.fields.filter(f => visibleKeys.includes(f.key)) : template.fields;

  const canRemove = state.slideIndex > 0 && state.slides.length > 1;
  const slideInfo = `<div class="slide-info">
    <span>SLIDE ${state.slideIndex + 1} / ${state.slides.length}</span>
    ${canRemove ? `<button class="remove-slide-btn" id="removeSlideBtn">× 삭제</button>` : ''}
  </div>`;

  fieldsEl.innerHTML = slideInfo + visibleFields.map(f => renderField(f, slideState[f.key] ?? f.default, slideState)).join('');

  const removeBtn = document.getElementById('removeSlideBtn');
  if (removeBtn) removeBtn.addEventListener('click', removeCurrentSlide);

  const pickerEl = fieldsEl.querySelector('.pos-picker');
  if (pickerEl) {
    const idx = state.slideIndex;
    attachPosPicker(pickerEl,
      (x, y) => {
        state.slides[idx].bgPosX = x;
        state.slides[idx].bgPosY = y;
        const bgL = document.querySelector('#canvas .bg-layer');
        if (bgL) bgL.style.backgroundPosition = `${x}% ${y}%`;
      },
      () => renderFilmstrip()
    );
  }

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
          renderEditor();
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  });

  fieldsEl.querySelectorAll('.field-apply-all-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = state.slides[state.slideIndex];
      if (!src) return;
      state.slides.forEach((s, i) => {
        if (i === state.slideIndex) return;
        s.bgImage = src.bgImage;
        s.bgPosX = src.bgPosX;
        s.bgPosY = src.bgPosY;
      });
      renderFilmstrip();
      pushHistory();
    });
  });

  renderTextStylePanel();
}

const DRAG_KEY_LABELS = {
  title: '제목', subtitle: '부제목', body: '본문',
  discount: '할인율', condition: '조건', period: '기간',
  cta: 'CTA', price: '가격',
};

function renderTextStylePanel() {
  const panel = document.getElementById('textStylePanel');
  if (!panel) return;
  const key = state.selectedDragKey;
  if (!key || state.slideIndex === state.slides.length) {
    panel.style.display = 'none';
    panel.className = '';
    return;
  }
  const slideState = state.slides[state.slideIndex] || {};
  const opacity = slideState['_opacity_' + key] ?? 100;
  const size = slideState['_size_' + key] ?? '';
  const label = DRAG_KEY_LABELS[key] || key;

  panel.className = 'text-style-panel';
  panel.style.display = '';
  panel.innerHTML = `
    <div class="text-style-header">
      <span class="text-style-key">${label}</span>
      <button class="text-style-close" id="textStyleClose">선택 해제</button>
    </div>
    <div class="ts-row">
      <span class="ts-label">불투명도</span>
      <div class="ts-ctrl">
        <input type="range" class="text-style-range" id="opacityRange" min="0" max="100" value="${opacity}">
        <span class="text-style-val" id="opacityVal">${opacity}%</span>
      </div>
    </div>
    <div class="ts-row">
      <span class="ts-label">크기</span>
      <div class="ts-ctrl">
        <button class="ts-step-btn" id="fontSizeMinus">−</button>
        <input type="range" class="text-style-range" id="fontSizeRange" min="8" max="240" value="${size || 60}">
        <button class="ts-step-btn" id="fontSizePlus">＋</button>
        <span class="text-style-val" id="fontSizeVal">${size || '기본'}</span>
        <button class="ts-step-btn ts-reset-btn" id="fontSizeReset">↺</button>
      </div>
    </div>
    <div class="ts-row">
      <span class="ts-label">색상</span>
      <div class="ts-ctrl">
        <input type="color" class="text-style-color" id="textColorPicker" value="${slideState['_color_' + key] || '#ffffff'}">
        <button class="ts-step-btn ts-reset-btn" id="colorReset">↺</button>
      </div>
    </div>
  `;

  document.getElementById('textStyleClose').addEventListener('click', () => {
    state.selectedDragKey = null;
    renderTextStylePanel();
    applyTextStyles(document.getElementById('canvas'), slideState, true);
  });

  document.getElementById('opacityRange').addEventListener('input', e => {
    const val = parseInt(e.target.value);
    document.getElementById('opacityVal').textContent = val + '%';
    slideState['_opacity_' + key] = val;
    applyTextStyles(document.getElementById('canvas'), slideState, true);
    renderFilmstrip();
    pushHistoryDebounced();
  });

  function applySize(val) {
    if (!isNaN(val) && val >= 8) {
      slideState['_size_' + key] = val;
      document.getElementById('fontSizeRange').value = Math.min(val, 240);
      document.getElementById('fontSizeVal').textContent = val + 'px';
    } else {
      delete slideState['_size_' + key];
      document.getElementById('fontSizeVal').textContent = '기본';
    }
    applyTextStyles(document.getElementById('canvas'), slideState, true);
    renderFilmstrip();
    pushHistoryDebounced();
  }

  document.getElementById('fontSizeRange').addEventListener('input', e => {
    applySize(parseInt(e.target.value));
  });
  document.getElementById('fontSizeMinus').addEventListener('click', () => {
    const cur = slideState['_size_' + key] ?? parseInt(document.getElementById('fontSizeRange').value);
    applySize(Math.max(8, cur - 2));
  });
  document.getElementById('fontSizePlus').addEventListener('click', () => {
    const cur = slideState['_size_' + key] ?? parseInt(document.getElementById('fontSizeRange').value);
    applySize(cur + 2);
  });
  document.getElementById('fontSizeReset').addEventListener('click', () => {
    applySize(null);
  });

  document.getElementById('textColorPicker').addEventListener('input', e => {
    slideState['_color_' + key] = e.target.value;
    applyTextStyles(document.getElementById('canvas'), slideState, true);
    renderFilmstrip();
    pushHistoryDebounced();
  });

  document.getElementById('colorReset').addEventListener('click', () => {
    delete slideState['_color_' + key];
    document.getElementById('textColorPicker').value = '#ffffff';
    applyTextStyles(document.getElementById('canvas'), slideState, true);
    renderFilmstrip();
    pushHistoryDebounced();
  });
}

function renderField(field, value, slideState) {
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
        <textarea class="field-textarea${field.key === 'body' ? ' field-textarea--body' : ''}" data-key="${field.key}"
                  placeholder="${field.placeholder || ''}">${escHtml(String(value ?? ''))}</textarea>
      </div>`;
    case 'image': {
      const px = slideState?.bgPosX ?? 50, py = slideState?.bgPosY ?? 50;
      const picker = value ? `<div class="pos-picker"><div class="pos-handle" style="left:${px}%;top:${py}%"></div></div>` : '';
      const applyAllBtn = value ? `<button class="field-apply-all-btn" data-key="${field.key}">전체 슬라이드 적용</button>` : '';
      return `<div class="field-group">
        <label class="field-label">${field.label}</label>
        <button class="field-image-btn ${value ? 'has-image' : ''}" data-key="${field.key}">
          ${value ? '✓ 이미지 선택됨' : '+ 이미지 업로드'}
        </button>
        ${applyAllBtn}
        ${picker}
      </div>`;
    }
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

// ── History (Undo / Redo) ─────────────────────────────────────────────────
const history = { stack: [], index: -1 };
let historyTimer = null;

function snapshotState() {
  return {
    slides: JSON.parse(JSON.stringify(state.slides)),
    slideIndex: state.slideIndex,
    outroImage: state.outroImage,
    outroPosX: state.outroPosX,
    outroPosY: state.outroPosY,
  };
}

function pushHistory() {
  clearTimeout(historyTimer);
  history.stack = history.stack.slice(0, history.index + 1);
  history.stack.push(snapshotState());
  if (history.stack.length > 60) history.stack.shift();
  else history.index++;
  updateHistoryBtns();
}

function pushHistoryDebounced() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(pushHistory, 400);
}

function restoreSnapshot(snap) {
  state.slides = JSON.parse(JSON.stringify(snap.slides));
  state.slideIndex = snap.slideIndex;
  state.outroImage = snap.outroImage;
  state.outroPosX = snap.outroPosX;
  state.outroPosY = snap.outroPosY;
  renderFilmstrip();
  renderEditor();
  renderCanvas();
  updateHistoryBtns();
}

function undo() {
  if (history.index <= 0) return;
  history.index--;
  restoreSnapshot(history.stack[history.index]);
}

function redo() {
  if (history.index >= history.stack.length - 1) return;
  history.index++;
  restoreSnapshot(history.stack[history.index]);
}

function updateHistoryBtns() {
  const u = document.getElementById('undoBtn');
  const r = document.getElementById('redoBtn');
  if (u) u.disabled = history.index <= 0;
  if (r) r.disabled = history.index >= history.stack.length - 1;
}

function updateField(key, value) {
  state.slides[state.slideIndex][key] = value;
  renderCanvas();
  renderFilmstrip();
  pushHistoryDebounced();
}

// ── AI Generation ────────────────────────────────────────────────────────────

const AI_SPEECH_GUIDES = {
  friendly: `
## 말투: 친근 존댓말
- 어미 "~해요", "~이에요", "~거든요", "~더라고요", "~네요" 위주
- 딱딱한 "~합니다/~입니다" 사용 금지
- 독자와 대화하듯. 따뜻하고 가까운 느낌
- 예: "이거 써보니까 확실히 달라요" / "사실 저도 처음엔 몰랐거든요"`,
  mz: `
## 말투: MZ 감성 반말
- 어미 "~임", "~함", "~거든", "~지 않나", "~인데", "~잖아" 자연스럽게
- 짧게 끊는 문장 허용. 마침표 없어도 됨
- 이모지 자연스럽게 1-2개 허용 (남용 금지)
- 예: "솔직히 이거 예상 못 했음" / "진짜 왜 이제 알았지" / "이건 좀 다름"
- SNS DM 보내는 느낌. 꾸밈 없이 솔직하게`,
  formal: `
## 말투: 격식체
- 어미 "~합니다", "~입니다", "~됩니다" 위주
- 감탄사·이모지·구어체 일절 사용 금지
- 브랜드 공식 채널의 전문적이고 신뢰감 있는 어조`,
};

const AI_TARGET_GUIDES = {
  all: `
## 타겟: 전체
- 성별 구분 없이 피트니스 라이프스타일 전반
- 운동·건강·자기계발이라는 공통 가치 중심 어필`,
  women: `
## 타겟: 20-30대 여성
- 착용감·핏·컬러·스타일·데일리 활용도 강조
- 운동 + 일상 두 가지 활용 어필
- 감성적 표현 허용 ("착용감 진짜 좋음", "데일리로 입어도 손색없음")
- 다이어트·체형 관리·자기계발 맥락에서 공감대 형성`,
  men: `
## 타겟: 20-30대 남성 피트니스
- 퍼포먼스·기능성·내구성 중심 어필
- 세트수·중량·기록 등 수치 데이터 선호
- 헬스·보디빌딩·피지크 문화 언어 사용
- 감성보다 실용·기능 중심`,
};

const AI_TONE_GUIDES = {
  casual: `
### 캐주얼 톤 작성 원칙
- 독자가 "나도 저래" 하고 공감하는 짐라이프 순간을 포착
- 친구한테 보내는 카톡 느낌이지만, 내용은 알차야 함
- 자조적 유머·솔직한 고백 허용 ("솔직히 오늘 가기 싫었다")
- 단어 나열식 나쁨 → 감정 흐름이 있는 문장 좋음`,
  hype: `
### 자극(HYPE) 톤 작성 원칙
- 독자의 내면의 나약함을 직접 건드리는 어조
- 도입부: 불편한 질문 or 현실 직격 ("지금 뭐 하고 있어?")
- 숫자로 강도 표현: 5AM / 4세트 / 마지막 1개 / 6개월
- 감정 정점 → 행동 촉구로 마무리. 선택이 아닌 의무처럼
- 짧고 강한 문장. 긴 설명 금지`,
  info: `
### 정보성 톤 작성 원칙
- 독자가 "저장해야겠다"고 느끼는 밀도. 교과서가 아닌 인사이트
- 수치·이름·날짜·기록 등 팩트 필수. 애매한 수식어 대신 구체적 사실
- 슬라이드 하나 = 독립된 개념 단위 (핵심 사실 → 배경/맥락 → 시사점)
- 알고 있는 정보 최대한 꺼내라. "~로 알려져 있다" 같은 우회 표현 금지
- body는 슬라이드당 반드시 3-5문장. 수치 최소 1개 이상 포함
- 예시 수준: "**14세** 때 **45kg**, 척추측만증. **3년** 후 완전히 다른 몸이 됐다."`,
  promo: `
### 프로모션 톤 작성 원칙
- 헤드라인이 60% 이상의 임팩트를 담아야 함
- 지금 사지 않으면 손해인 이유를 논리적으로 제시
- 가격·기간·조건 구체적으로: ₩89,000 / 05.15-05.20 / 당일출고
- CTA는 직접적 "구매하세요" 대신 "지금 확인 →" / "링크 클릭" 선호
- 희소성·긴박감 자연스럽게 (강요 아닌 팩트 기반)`,
};

const GYMSHARK_BRAND_KNOWLEDGE = `
## Gymshark 브랜드 지식 (콘텐츠에 적극 활용할 것)

### 창업 스토리 — 팩트
- **2012년**, Ben Francis (당시 **19세**), 버밍엄 부모님 차고에서 창업
- 시작: 보충제 드롭시핑 + T셔츠 스크린프린팅 직접 제작. 재봉틀은 유튜브 독학
- **2013년 BodyPower Expo**: 재고 단 하루 만에 완판. 이때부터 진짜 Gymshark 시작
- **2013년 플래시세일**: **30분 만에 £1M** 달성. 웹사이트 접속 불가 상태
- **2020년 기업가치 £1B** 유니콘 달성 — Ben Francis **27세**, 영국 최연소 자수성가 억만장자

### 인플루언서 마케팅 — 선구자 포지션
- "인플루언서 마케팅"이라는 개념 자체가 없던 시절, 피트니스 유튜버들에게 무료로 제품 발송
- Lex Griffin, Chris Lavado 등 초기 유튜브 크리에이터들과 협업
- 나이키·아디다스 광고비 없이 10대 피트니스 팬덤을 형성한 핵심 전략

### 핵심 선수단 (Gymshark Athletes) — 실명 활용 가능
- **Chris Bumstead (CBum)**: Classic Physique Mr. Olympia **6연속 우승**. Gymshark 역사상 가장 큰 영향력의 얼굴
- **David Laid**: **14세** 때 시작, 척추측만증 극복. 3년 만에 완전히 다른 몸. 전 세계 피트니스 미학 아이콘
- **Whitney Simmons**: 여성 피트니스 인플루언서 중 가장 강력한 앰배서더. Vital Seamless 대표 착용
- **Nikki Blackketter**: 초기 여성 앰배서더. Gymshark 여성 라인 성장의 초석
- **Zac Perna** / **Ryan Terry** / **Leana Deeb** 등 글로벌 피지크 아이콘 다수

### 주요 제품 라인 — 구체 묘사 가능
- **Vital Seamless**: 시그니처 심리스. 운동 + 데일리룩 두 가지 활용. 여성 라인 베스트셀러
- **Legacy**: 남성 파워리프팅·스트렝스 특화. 두꺼운 원단, 내구성 중심. 고중량 세션용
- **Crest 후드티**: 스트리트웨어 감성. 헬스장 안팎에서 모두 입음. 가장 많이 팔리는 아이템 중 하나
- **Adapt**: 여성 바디스컬팅. 착용 시 실루엣 강조 설계
- **Ark**: 오버사이즈 실루엣. 운동 후 귀가할 때도 입는 그 감성

### 브랜드 문화 DNA
- 나이키·아디다스와 다른 포지셔닝: "헬스장에 진지한 사람들의 브랜드"
- 핵심 태그라인: "Be a visionary"
- SNS 중심 성장 — 인스타그램·틱톡 피트니스 브랜드 팔로워 최상위권
- 퍼포먼스도 중요하지만 "운동하면서도 예뻐 보이는 것" 동시 추구하는 Gen Z 타겟

### Gymspire.kr 포지션
- 한국 공식 리셀러. 진품 보장 + 국내 직배송
- 짐샤크 글로벌 컬처와 한국 피트니스 커뮤니티를 연결하는 허브`;

let aiPendingSlides = null;
let aiConversationHistory = [];

function openAiModal() {
  const modal = document.getElementById('aiModal');
  modal.style.display = 'flex';
  document.getElementById('aiResultWrap').style.display = 'none';
  document.getElementById('aiApplyBtn').style.display = 'none';
  document.getElementById('aiGenerate').style.display = '';
  document.getElementById('aiGenerate').textContent = '생성하기';
  document.getElementById('aiGenerate').disabled = false;
  aiPendingSlides = null;
  aiConversationHistory = [];
  renderAiNewsPreview();
  setTimeout(() => document.getElementById('aiKeyword').focus(), 30);
}

function buildAiPrompt(template, keyword, tone, slideCount, speech, target, newsItems) {
  const slideDescs = Array.from({ length: slideCount }, (_, i) => {
    const keys = (template.fieldsForSlide ? template.fieldsForSlide(i) : template.fields.map(f => f.key))
      .filter(k => k !== 'bgImage');
    const fieldList = keys.map(k => {
      const def = template.fields.find(f => f.key === k);
      return `"${k}" (${def?.label || k})`;
    }).join(', ');
    const label = i === 0 ? '표지' : `본문 ${i}`;
    return `슬라이드 ${i + 1} [${label}] → 필수 필드: ${fieldList}`;
  }).join('\n');

  const systemMsg = `당신은 한국 Gymshark 공식 리셀러 @gymspire.kr의 수석 카피라이터입니다.
팔로워 1만 명 이상의 프리미엄 피트니스 라이프스타일 계정으로, 실제 마케팅 현장에 즉시 사용 가능한 수준의 콘텐츠를 생산합니다.
${GYMSHARK_BRAND_KNOWLEDGE}

## 계정 DNA
- 포지셔닝: 국내 유일 Gymshark 전문 리셀러 — 제품·피트니스 문화·라이프스타일을 아우름
- 타겟: 운동을 진지하게 즐기는 20-30대 한국 MZ세대. 정보에 민감하고 품질에 까다로움
- 참고 보이스: 29CM·에이지오브투모로우·아크테릭스코리아 수준의 밀도와 세련됨
- 절대 금지: 번역체 / "최고의·놀라운·혁신적인·대단한·뛰어난" / 과도한 감탄사 / 빈 수식어

## 카피라이팅 원칙

### title (표지 및 본문 헤드라인)
- 스크롤을 물리적으로 멈추게 만들어야 함. 10-20자.
- 숫자·불완전 문장·의문문·반전 모두 허용
- 좋음: "14세, 45kg. 그가 달라진 이유" / "5AM. 아무도 없는 그 시간"
- 나쁨: "Gymshark 신제품 소개" / "운동의 중요성에 대하여"

### body (본문)
- 핵심 메시지 → 배경/근거 → 독자 적용 순서로 흐름
- **볼드**는 핵심 수치·이름·키워드만. 슬라이드당 최대 3개
- 짧은 문장 + 긴 문장을 섞어 리듬 생성
- **줄바꿈 필수**: 문장이 끝날 때마다 반드시 \n 삽입. "습니다.", "어요.", "세요.", "다.", "요." 등 문장 종결 후 반드시 다음 문장은 새 줄에서 시작
- 2-3문장마다 빈 줄(\n\n)로 단락 구분해 시각적 호흡 제공
- 각 슬라이드는 독립적으로 읽혀도 가치 있어야 함
- **body 필드에 CTA 문구 절대 금지**: "국내배송", "링크 클릭", "지금 확인", "구매" 등 구매 유도 표현은 body에 넣지 말 것. CTA는 오직 "cta" 필드에만 작성.

### subtitle / cta
- subtitle: title을 보완하는 맥락 추가 1줄. 구매 유도 표현 금지.
- cta 필드가 있는 경우에만: "지금 확인 →" / "국내배송 가능 · 링크 클릭" 형식. 직접적 "구매" 표현 자제

### 브랜드 특정성 — 절대 원칙
- 완성된 각 슬라이드를 **"이걸 Nike·adidas·Lululemon 콘텐츠로 바꿔도 말이 되는가?"** 자문할 것
- 된다면 → **반드시 다시 쓸 것**. Gymshark에만 해당하는 사실·수치·이름·에피소드를 슬라이드당 최소 1개 이상 포함
- 나쁨: "운동에 집중할 수 있도록 설계된 제품입니다" (어느 브랜드에나 해당)
- 좋음: "CBum이 Classic Physique 6연패를 준비하며 입은 바로 그 레깅스" (Gymshark만 해당)
- 나쁨: "고품질 원단으로 만든 운동복" → 좋음: "Vital Seamless 원단 — 헬스장에서도, 퇴근 후 카페에서도"
- **위 브랜드 지식 섹션의 사실·선수·제품명을 적극 활용할 것**

### 서사 구조 (필수)
- 슬라이드 1 (표지): 강한 후킹. 다음 슬라이드가 궁금하게 만듦
- 슬라이드 2~N-1: 각각 독립된 가치 단위. 앞에서 던진 궁금증 해소 + 새 궁금증 생성
- 마지막 슬라이드: 아래 "마지막 슬라이드 전용 규칙" 참고

## ⛔ 마지막 슬라이드 전용 규칙 (절대 위반 금지)
이 콘텐츠에는 이미 계정 CTA를 담당하는 고정 아웃트로 슬라이드가 별도로 존재한다.
따라서 마지막 콘텐츠 슬라이드는 **감정·인사이트·여운**으로만 마무리해야 한다.

**절대 금지 표현 (단어 하나라도 들어가면 실패)**:
- "@gymspire", "gymspire.kr", "확인해", "확인하세요", "확인 →"
- "국내배송", "배송", "빠른 배송", "당일출고"
- "링크", "링크 클릭", "링크 인 바이오"
- "구매", "구매하세요", "지금 구매"
- "팔로우", "팔로우해", "팔로우하세요"
- "리셀러", "공식 리셀러", "공식 판매처"
- "지금 확인", "바로 확인", "확인 부탁"

**마지막 슬라이드가 담아야 할 것**:
- 앞 슬라이드 전체 흐름을 하나의 감정으로 압축하는 문장
- Gymshark 고유 스토리·철학에서 끌어낸 인사이트 또는 여운
- 독자가 혼자 반추하게 만드는 마무리. 행동 촉구 없음.
${AI_TONE_GUIDES[tone]}
${AI_SPEECH_GUIDES[speech] || AI_SPEECH_GUIDES.friendly}
${AI_TARGET_GUIDES[target] || AI_TARGET_GUIDES.all}`;

  const newsContext = (newsItems && newsItems.length > 0)
    ? `\n## 최신 Gymshark 뉴스 헤드라인 (관련 있으면 콘텐츠에 자연스럽게 반영, 무관하면 무시)\n${newsItems.slice(0, 5).map(n => `- ${n.title} (${n.date})`).join('\n')}\n`
    : '';

  const userMsg = `요청 내용: ${keyword}${newsContext}
템플릿 유형: ${template.name}
생성할 슬라이드 수: 정확히 ${slideCount}개

## 슬라이드별 필수 필드 (모든 필드를 빠짐없이 채울 것)
${slideDescs}

## 품질 기준
- 생성 즉시 실제 계정에 올릴 수 있는 수준으로 작성할 것
- 각 슬라이드 body는 내용이 충분히 채워진 완성된 문장으로 작성
- 두루뭉술하거나 뻔한 표현은 삭제하고 구체적 사실·감정·행동으로 대체
- **각 슬라이드에 Gymshark 고유 팩트(선수명·제품명·수치·에피소드) 최소 1개 이상 포함** — 없으면 불합격
- Nike/adidas/Lululemon과 교체해도 말이 되는 슬라이드는 작성 금지

## 응답 형식
JSON만 응답. 다른 텍스트 일절 없음.
반드시 ${slideCount}개의 슬라이드를 생성. 각 슬라이드 객체에 위 필드 키를 전부 포함. 생략·축소 불가.
{ "slides": [ { "필드키": "값", ... }, ... ] }`;

  return { systemMsg, userMsg };
}

async function runAiGenerate() {
  const keyword = document.getElementById('aiKeyword').value.trim();
  if (!keyword) { document.getElementById('aiKeyword').focus(); return; }

  const tone = document.querySelector('.ai-tone-btn.active')?.dataset.tone || 'casual';
  const speech = document.querySelector('.ai-speech-btn.active')?.dataset.speech || 'friendly';
  const target = document.querySelector('.ai-target-btn.active')?.dataset.target || 'all';
  const useNews = document.getElementById('aiNewsToggle')?.checked !== false;
  const newsItems = useNews && newsCache.items.length > 0 ? newsCache.items : null;
  const template = getTemplate(state.templateId);
  const selectedCount = parseInt(document.querySelector('.ai-count-btn.active')?.dataset.count || '4');
  const slideCount = Math.min(selectedCount, template.maxSlides || 8);
  const btn = document.getElementById('aiGenerate');

  btn.disabled = true;
  btn.textContent = '생성 중...';
  document.getElementById('aiResultWrap').style.display = 'none';
  document.getElementById('aiApplyBtn').style.display = 'none';
  aiPendingSlides = null;

  try {
    const { systemMsg, userMsg } = buildAiPrompt(template, keyword, tone, slideCount, speech, target, newsItems);
    aiConversationHistory = [
      { role: 'system', content: systemMsg },
      { role: 'user',   content: userMsg },
    ];
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: aiConversationHistory,
        response_format: { type: 'json_object' },
        temperature: tone === 'info' ? 0.65 : 0.80,
        max_tokens: 10000,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `HTTP ${res.status}`); }
    const data = await res.json();
    if (data.choices[0].finish_reason === 'length') {
      throw new Error('응답이 너무 길어 중간에 잘렸습니다. 슬라이드 수를 줄이거나 다시 시도해 주세요.');
    }
    const rawContent = data.choices[0].message.content;
    aiConversationHistory.push({ role: 'assistant', content: rawContent });
    const parsed = JSON.parse(rawContent);
    aiPendingSlides = parsed.slides;
    renderAiPreview(aiPendingSlides, template);
    document.getElementById('aiResultWrap').style.display = '';
    document.getElementById('aiApplyBtn').style.display = '';
    document.getElementById('aiFeedback').value = '';
    btn.textContent = '다시 생성';
  } catch (err) {
    alert(`생성 실패: ${err.message}`);
  } finally {
    btn.disabled = false;
    if (!aiPendingSlides) btn.textContent = '생성하기';
  }
}

async function runAiFeedback() {
  const feedback = document.getElementById('aiFeedback').value.trim();
  if (!feedback || !aiConversationHistory.length) return;
  const template = getTemplate(state.templateId);
  const tone = document.querySelector('.ai-tone-btn.active')?.dataset.tone || 'casual';
  const feedbackBtn = document.getElementById('aiFeedbackBtn');
  const genBtn = document.getElementById('aiGenerate');
  feedbackBtn.disabled = true;
  feedbackBtn.textContent = '수정 중...';
  genBtn.disabled = true;

  aiConversationHistory.push({ role: 'user', content: feedback });

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: aiConversationHistory,
        response_format: { type: 'json_object' },
        temperature: tone === 'info' ? 0.65 : 0.80,
        max_tokens: 10000,
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `HTTP ${res.status}`); }
    const data = await res.json();
    const rawContent = data.choices[0].message.content;
    aiConversationHistory.push({ role: 'assistant', content: rawContent });
    const parsed = JSON.parse(rawContent);
    aiPendingSlides = parsed.slides;
    renderAiPreview(aiPendingSlides, template);
    document.getElementById('aiFeedback').value = '';
  } catch (err) {
    aiConversationHistory.pop();
    alert(`수정 실패: ${err.message}`);
  } finally {
    feedbackBtn.disabled = false;
    feedbackBtn.textContent = '수정하기';
    genBtn.disabled = false;
  }
}

function renderAiPreview(slides, template) {
  const el = document.getElementById('aiResultContent');
  el.innerHTML = slides.map((slide, i) => {
    const keys = (template.fieldsForSlide ? template.fieldsForSlide(i) : template.fields.map(f => f.key))
      .filter(k => k !== 'bgImage');
    const rows = keys.map(k => {
      const def = template.fields.find(f => f.key === k);
      const val = escHtml(String(slide[k] || ''));
      return `<div class="ai-slide-field"><strong>${def?.label || k}:</strong> ${val}</div>`;
    }).join('');
    return `<div class="ai-slide-preview"><div class="ai-slide-num">SLIDE ${i + 1}</div>${rows}</div>`;
  }).join('');
}

function smartKoreanBreaks(text) {
  if (!text) return text;
  return text
    .replace(/(습니다|니다|세요|어요|아요|겠어|겠죠|군요|네요|죠)\.\s+(?=[가-힣])/g, '$1.\n')
    .replace(/([다요])\.\s+(?=[가-힣])/g, '$1.\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function applyAiSlides() {
  if (!aiPendingSlides) return;
  const template = getTemplate(state.templateId);
  const maxSlides = template.maxSlides || template.slides || 10;

  // 생성된 슬라이드 수에 맞게 배열 확장
  while (state.slides.length < Math.min(aiPendingSlides.length, maxSlides)) {
    const defaults = {};
    template.fields.forEach(f => { defaults[f.key] = f.default ?? ''; });
    state.slides.push(defaults);
  }

  aiPendingSlides.forEach((slideData, i) => {
    if (i >= state.slides.length) return;
    const keys = (template.fieldsForSlide ? template.fieldsForSlide(i) : template.fields.map(f => f.key))
      .filter(k => k !== 'bgImage');
    keys.forEach(k => {
      if (slideData[k] === undefined) return;
      state.slides[i][k] = k === 'body' ? smartKoreanBreaks(slideData[k]) : slideData[k];
    });
  });

  state.slideIndex = 0;
  document.getElementById('aiModal').style.display = 'none';
  renderFilmstrip();
  renderEditor();
  renderCanvas();
  pushHistory();
}

function initAiModal() {
  document.getElementById('aiGenBtn').addEventListener('click', openAiModal);
  document.getElementById('aiClose').addEventListener('click', () => {
    document.getElementById('aiModal').style.display = 'none';
  });
  document.getElementById('aiModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('aiModal').style.display = 'none';
  });
  document.getElementById('aiGenerate').addEventListener('click', runAiGenerate);
  document.getElementById('aiApplyBtn').addEventListener('click', applyAiSlides);
  document.getElementById('aiFeedbackBtn').addEventListener('click', runAiFeedback);
  document.getElementById('aiFeedback').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAiFeedback();
  });
  document.getElementById('aiKeyword').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAiGenerate();
  });
  document.querySelectorAll('.ai-tone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-tone-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('.ai-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ai-count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
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
  document.getElementById('aiGenerate').classList.add('ai-btn', 'ai-btn-primary');
  document.getElementById('aiApplyBtn').classList.add('ai-btn', 'ai-btn-ghost');
  document.getElementById('aiClose').classList.add('ai-btn', 'ai-btn-ghost');
  const newsToggle = document.getElementById('aiNewsToggle');
  if (newsToggle) newsToggle.addEventListener('change', renderAiNewsPreview);
}

// ── Presets ──────────────────────────────────────────────────────────────────

function getPresets() {
  try { return JSON.parse(localStorage.getItem('gymspire_presets') || '[]'); } catch { return []; }
}

function savePreset() {
  const template = getTemplate(state.templateId);
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const name = `${template.name} ${mmdd} ${hhmm}`;
  const presets = getPresets();
  presets.unshift({
    id: Date.now(),
    name,
    templateId: state.templateId,
    slides: JSON.parse(JSON.stringify(state.slides)),
    outroImage: state.outroImage,
    outroPosX: state.outroPosX,
    outroPosY: state.outroPosY,
  });
  try {
    localStorage.setItem('gymspire_presets', JSON.stringify(presets));
  } catch {
    alert('저장 공간 부족. 이미지를 줄이거나 오래된 프리셋을 삭제하세요.');
    return;
  }
  renderPresets();
}

function loadPreset(id) {
  const preset = getPresets().find(p => p.id === id);
  if (!preset) return;
  state.templateId = preset.templateId;
  state.slideIndex = 0;
  state.slides = preset.slides;
  state.outroImage = preset.outroImage || '';
  state.outroPosX = preset.outroPosX ?? 50;
  state.outroPosY = preset.outroPosY ?? 50;
  state.activePresetId = id;
  renderGallery();
  renderFilmstrip();
  renderEditor();
  renderCanvas();
  renderPresets();
}

function deletePreset(id) {
  if (!confirm('삭제할까요?')) return;
  const presets = getPresets().filter(p => p.id !== id);
  localStorage.setItem('gymspire_presets', JSON.stringify(presets));
  renderPresets();
}

function renderPresets() {
  const list = document.getElementById('presetList');
  const presets = getPresets();
  if (!presets.length) {
    list.innerHTML = `<div style="padding:8px 20px 12px;font-size:11px;color:#2a2a2a;">저장된 항목 없음</div>`;
    return;
  }
  list.innerHTML = presets.map(p => `
    <div class="preset-item ${p.id === state.activePresetId ? 'active' : ''}" data-id="${p.id}">
      <span class="preset-name">${escHtml(p.name)}</span>
      <button class="preset-delete" data-id="${p.id}">×</button>
    </div>
  `).join('');
  list.querySelectorAll('.preset-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.classList.contains('preset-delete')) return;
      item.classList.add('flash');
      item.addEventListener('animationend', () => item.classList.remove('flash'), { once: true });
      loadPreset(parseInt(item.dataset.id));
    });
  });
  list.querySelectorAll('.preset-delete').forEach(btn => {
    btn.addEventListener('click', () => deletePreset(parseInt(btn.dataset.id)));
  });
}

// ── News Panel ───────────────────────────────────────────────────────────────

const newsCache = { items: [], sources: {}, fetchedAt: 0 };
const NEWS_CACHE_TTL = 30 * 60 * 1000;
const NEWS_PER_PAGE = 8;
let newsPage = 0;
let newsFilter = 'all';

const NEWS_SOURCE_LABELS = {
  news:    { label: '뉴스',       short: '뉴스',    desc: 'Google · Bing RSS — 키워드 기반, 90일 이내, 무제한' },
  newsapi: { label: 'NewsAPI',   short: 'NewsAPI', desc: 'NewsAPI.org — 30일 이내 기사만 제공 (무료 플랜 제한)' },
  blog:    { label: '공식 블로그', short: '공식',    desc: 'gymshark.com/blog — 짐샤크 공식 발행 콘텐츠' },
  youtube: { label: 'YouTube',   short: 'YouTube', desc: '짐샤크 공식 채널 — 날짜 제한 없음, 최신 12개' },
};

function setMode(mode) {
  state.appMode = mode;
  const canvasArea = document.querySelector('.canvas-area');
  const editorPanel = document.querySelector('.editor-panel');
  const newsView = document.getElementById('newsView');
  const btn = document.getElementById('newsModeBtn');

  if (mode === 'news') {
    canvasArea.style.display = 'none';
    editorPanel.style.display = 'none';
    newsView.style.display = '';
    btn.classList.add('active');
    renderFullNewsPanel(newsCache.items.length ? undefined : 'loading');
  } else {
    canvasArea.style.display = '';
    editorPanel.style.display = '';
    newsView.style.display = 'none';
    btn.classList.remove('active');
  }
}

async function fetchGymsharkNews(forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && newsCache.items.length > 0 && now - newsCache.fetchedAt < NEWS_CACHE_TTL) {
    if (state.appMode === 'news') renderFullNewsPanel();
    return;
  }
  if (state.appMode === 'news') renderFullNewsPanel('loading');
  try {
    const res = await fetch('/api/news');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    newsCache.items = data.items || [];
    newsCache.sources = data.sources || {};
    newsCache.fetchedAt = now;
    if (state.appMode === 'news') renderFullNewsPanel();
    renderAiNewsPreview();
  } catch {
    if (state.appMode === 'news') renderFullNewsPanel('error');
  }
}

function renderFullNewsPanel(status) {
  const view = document.getElementById('newsView');
  if (!view) return;

  const header = `
    <div class="news-view-header">
      <div>
        <span class="news-view-eyebrow">GYMSHARK</span>
        <h2 class="news-view-title">최신 뉴스</h2>
        <p class="news-view-sub">헤드라인을 클릭하면 AI 포스트 생성으로 바로 연결됩니다</p>
      </div>
      <div class="news-view-actions">
        <button class="news-refresh-btn" id="newsRefreshBtn">↻ 새로고침</button>
        <button class="news-back-btn" id="newsBackBtn">← 편집으로</button>
      </div>
    </div>`;

  if (status === 'loading') {
    view.innerHTML = header + `<div class="news-view-empty">불러오는 중...</div>`;
  } else if (status === 'error' || !newsCache.items.length) {
    view.innerHTML = header + `<div class="news-view-empty">뉴스를 불러올 수 없습니다</div>`;
  } else {
    const ALL_SOURCES = ['news', 'newsapi', 'blog', 'youtube'];
    const counts = Object.fromEntries(
      ALL_SOURCES.map(s => [s, newsCache.items.filter(i => i.source === s).length])
    );
    const filtered = newsFilter === 'all'
      ? newsCache.items
      : newsCache.items.filter(i => i.source === newsFilter);
    const totalPages = Math.max(1, Math.ceil(filtered.length / NEWS_PER_PAGE));
    newsPage = Math.min(newsPage, totalPages - 1);
    const pageItems = filtered.slice(newsPage * NEWS_PER_PAGE, (newsPage + 1) * NEWS_PER_PAGE);

    const filterTabs = `
      <div class="news-filter-tabs">
        <button class="news-filter-btn ${newsFilter === 'all' ? 'active' : ''}" data-filter="all">전체 (${newsCache.items.length})</button>
        ${ALL_SOURCES.map(s => {
          const src = newsCache.sources[s];
          const failed = src && !src.ok;
          const label = NEWS_SOURCE_LABELS[s]?.short || s;
          return `<button class="news-filter-btn ${newsFilter === s ? 'active' : ''} ${failed ? 'failed' : ''}"
            data-filter="${s}" ${failed ? 'title="현재 연결 불가"' : ''}>
            ${label}${src ? ` (${counts[s]})` : ''}
          </button>`;
        }).join('')}
      </div>
      ${newsFilter !== 'all' && NEWS_SOURCE_LABELS[newsFilter]?.desc
        ? `<div class="news-source-desc">${escHtml(NEWS_SOURCE_LABELS[newsFilter].desc)}</div>`
        : ''}`;

    view.innerHTML = header + filterTabs + `
      <div class="news-cards-grid">
        ${pageItems.length ? pageItems.map(item => {
          const domain = item.url ? (() => { try { return new URL(item.url).hostname.replace(/^www\./, ''); } catch { return ''; } })() : '';
          return `
          <div class="news-card" data-title="${escHtml(item.title)}">
            <span class="news-card-source news-card-source--${item.source}">${NEWS_SOURCE_LABELS[item.source]?.label || item.source}</span>
            <div class="news-card-title">${escHtml(item.title)}</div>
            ${item.url ? `<a class="news-card-url" href="${escHtml(item.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escHtml(domain)}</a>` : ''}
            <div class="news-card-date">${escHtml(item.date)}</div>
            <button class="news-card-btn">이 소재로 포스트 생성 →</button>
          </div>`;
        }).join('') : `<div style="grid-column:1/-1;padding:40px 0;font-size:13px;color:#333;text-align:center;">해당 소스의 최근 뉴스가 없습니다</div>`}
      </div>
      ${totalPages > 1 ? `
      <div class="news-pagination">
        <button class="news-page-btn" id="newsPrevBtn" ${newsPage === 0 ? 'disabled' : ''}>← 이전</button>
        <span class="news-page-info">${newsPage + 1} / ${totalPages}</span>
        <button class="news-page-btn" id="newsNextBtn" ${newsPage >= totalPages - 1 ? 'disabled' : ''}>다음 →</button>
      </div>` : ''}`;
  }

  // Single delegated handler — overwrites previous, no accumulation
  view.onclick = e => {
    const filterBtn = e.target.closest('.news-filter-btn');
    if (filterBtn) {
      if (filterBtn.classList.contains('failed')) return;
      newsFilter = filterBtn.dataset.filter;
      newsPage = 0;
      renderFullNewsPanel();
      return;
    }
    const cardBtn = e.target.closest('.news-card-btn');
    if (cardBtn) {
      document.getElementById('aiKeyword').value = cardBtn.closest('.news-card').dataset.title;
      setMode('edit');
      openAiModal();
      return;
    }
    const id = e.target.closest('[id]')?.id;
    if (id === 'newsRefreshBtn') { newsPage = 0; newsFilter = 'all'; fetchGymsharkNews(true); }
    else if (id === 'newsBackBtn') { setMode('edit'); }
    else if (id === 'newsPrevBtn') { newsPage--; renderFullNewsPanel(); }
    else if (id === 'newsNextBtn') { newsPage++; renderFullNewsPanel(); }
  };
}

function renderAiNewsPreview() {
  const countEl = document.getElementById('aiNewsCount');
  if (!countEl) return;
  const on = document.getElementById('aiNewsToggle')?.checked;
  const n = newsCache.items.length;
  if (!on || !n) {
    countEl.textContent = '';
    countEl.className = 'ai-news-count';
  } else {
    countEl.textContent = `${n}건 참고 중`;
    countEl.className = 'ai-news-count ai-news-count--active';
  }
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

async function exportAllPng() {
  const template = getTemplate(state.templateId);
  const btn = document.getElementById('exportAllBtn');
  const canvas = document.getElementById('canvas');
  const totalSlides = state.slides.length + 1;

  btn.disabled = true;
  const prevTransform = canvas.style.transform;
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  canvas.style.top = '0';
  canvas.style.transform = 'none';

  const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '').replace(/-/g, '');

  try {
    for (let i = 0; i < totalSlides; i++) {
      btn.textContent = `내보내는 중 ${i + 1}/${totalSlides}`;
      if (i === state.slides.length) {
        canvas.style.backgroundImage = 'none';
        canvas.innerHTML = buildBgHtml({ bgImage: state.outroImage, bgPosX: state.outroPosX, bgPosY: state.outroPosY }) + window.outroSlide();
      } else {
        const s = state.slides[i] || {};
        canvas.style.backgroundImage = 'none';
        canvas.innerHTML = buildBgHtml(s) + template.render(s, i, state.slides.length);
      }
      const rendered = await html2canvas(canvas, { scale: 1, width: 1080, height: state.canvasH || 1350, useCORS: true, allowTaint: true, backgroundColor: '#000000' });
      const link = document.createElement('a');
      link.download = `gymspire-${state.templateId}-${ts}-${String(i + 1).padStart(2, '0')}.png`;
      link.href = rendered.toDataURL('image/png');
      link.click();
      await new Promise(r => setTimeout(r, 300));
    }
  } finally {
    canvas.style.position = '';
    canvas.style.left = '';
    canvas.style.top = '';
    canvas.style.transform = prevTransform;
    renderCanvas();
    btn.disabled = false;
    btn.textContent = '↓ 전체 내보내기';
  }
}

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
    height: state.canvasH || 1350,
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
