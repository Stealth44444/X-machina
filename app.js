const AUTOSAVE_KEY = 'brand_tool_autosave';       // kept — localStorage for crash recovery
const ACTIVE_CHANNEL_KEY = 'brand_tool_active_channel';
const PROJECT_STORAGE_KEY = 'brand_tool_projects'; // legacy — used only by AI context helpers

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
  projectId: 'gymspire',
};

let autoSaveTimer = null;

function saveAutoSave() {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      projectId: state.projectId,
      templateId: state.templateId,
      slides: state.slides,
      slideIndex: state.slideIndex,
      outroImage: state.outroImage,
      outroPosX: state.outroPosX,
      outroPosY: state.outroPosY,
      savedAt: Date.now(),
    }));
  } catch {}
}

function loadAutoSave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const dataProjectId = data.projectId || 'gymspire';
    if (dataProjectId !== state.projectId) return false;
    if (!getTemplate(data.templateId)) return false;
    state.templateId = data.templateId;
    state.slides = data.slides;
    state.slideIndex = data.slideIndex ?? 0;
    state.outroImage = data.outroImage || '';
    state.outroPosX = data.outroPosX ?? 50;
    state.outroPosY = data.outroPosY ?? 50;
    return true;
  } catch { return false; }
}

function getTemplate(id) {
  return window.GYMSPIRE_TEMPLATES.find(t => t.id === id);
}

window.outroSlide = function() {
  const ch = (typeof state !== 'undefined' && state.channels && state.channels.find(c => c.id === state.projectId)) || { name: 'CHANNEL', description: '팔로우하고 더 많은 소식을 받아보세요' };
  return `
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.75) 60%,#000 100%);"></div>
    <div style="position:absolute;top:50%;left:56px;right:56px;transform:translate(0, -55%);">
      <div style="font-size:24px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:2px;margin-bottom:28px;text-transform:uppercase;">${ch.name}</div>
      <div style="font-size:68px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:36px;letter-spacing:-1.5px;">Thanks for<br>watching.</div>
      <div style="width:48px;height:3px;background:#2B9BF4;margin-bottom:36px;"></div>
      <div style="font-size:26px;font-weight:400;color:rgba(255,255,255,0.6);line-height:1.7;word-break:keep-all;">${ch.description || '팔로우하고 더 많은 소식을 받아보세요'}</div>
    </div>
    <div style="position:absolute;bottom:90px;left:56px;">
      <div style="font-size:32px;font-weight:900;color:#2B9BF4;letter-spacing:1px;">@${ch.id || 'channel'}</div>
      <div style="font-size:18px;font-weight:400;color:rgba(255,255,255,0.2);margin-top:10px;letter-spacing:2px;">FOLLOW · LINK IN BIO</div>
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
  if (!img) return `<div style="position:absolute;inset:0;background:#0a0a0a;"></div>`;
  const pos = `${s.bgPosX ?? 50}% ${s.bgPosY ?? 50}%`;
  const dim = s.bgDim ?? 0;
  return `<div class="bg-layer" style="position:absolute;inset:0;background-image:url(${img});background-size:cover;background-position:${pos};"></div>${dim > 0 ? `<div class="bg-dim-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,${(dim / 100).toFixed(2)});pointer-events:none;"></div>` : ''}`;
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

const SOURCE_URLS = {
  Pinterest: kw => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(kw)}`,
  Dezeen:    kw => `https://www.dezeen.com/search/?q=${encodeURIComponent(kw)}`,
  ArchDaily: kw => `https://www.archdaily.com/search/projects?q=${encodeURIComponent(kw)}`,
  Behance:   kw => `https://www.behance.net/search/projects?q=${encodeURIComponent(kw)}`,
  Bloomberg: kw => `https://www.bloomberg.com/search?query=${encodeURIComponent(kw)}`,
  Google:    kw => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(kw)}`,
};

const MOODBOARD = {
  spacelog: {
    sources: ['Pinterest', 'Dezeen', 'ArchDaily', 'Behance'],
    keywords: [
      'brutalist architecture',
      'urban regeneration',
      'adaptive reuse',
      'commercial real estate aesthetic',
      'mixed-use development',
      'gentrify neighborhood',
    ],
  },
  CAPITALFLOW: {
    sources: ['Pinterest', 'Bloomberg', 'Google'],
    keywords: [
      'data visualization finance',
      'economic infographic',
      'financial chart aesthetic',
      'capital flow',
      'interest rates',
      'currency exchange',
      'asset management',
      'inflation visual',
      'GDP chart',
      'global capital flow map',
      'market crash visual',
    ],
  },
  'obscurelife.kr': {
    sources: ['Pinterest', 'Behance', 'Dezeen'],
    keywords: [
      'single malt whisky',
      'rare bourbon',
      'private members club',
      'luxury bar aesthetic',
      'high-end lifestyle',
      'luxury packaging design',
      'premium brand identity',
      'luxury interior',
      'private club design',
      'high-end hospitality',
    ],
  },
  'Nightcall.audio': {
    sources: ['Pinterest', 'Google'],
    keywords: [
      'hip hop album artwork',
      'rap aesthetic',
      'underground hiphop visual',
      'street culture photography',
      'hip hop music video aesthetic',
      'rap album cover design',
      'label visual identity',
    ],
  },
  mma_seoul: {
    sources: ['Pinterest', 'Google'],
    keywords: [
      'UFC fighter portrait',
      'MMA poster design',
      'combat sports photography',
      'boxing editorial',
      'UFC octagon visual',
      'MMA fighter aesthetic',
      'combat sports graphic',
    ],
  },
};

function openScheduleModal() {
  document.getElementById('scheduleCaption').value = state.slides[0]?.title || '';
  document.getElementById('scheduleModal').style.display = 'flex';
}

async function renderSlidesToUrls() {
  const template = getTemplate(state.templateId);
  const canvas = document.getElementById('canvas');
  const urls = [];

  const prevPos = canvas.style.position;
  const prevLeft = canvas.style.left;
  const prevTop = canvas.style.top;
  const prevTransform = canvas.style.transform;
  canvas.style.position = 'fixed';
  canvas.style.left = '-9999px';
  canvas.style.top = '0';
  canvas.style.transform = 'none';

  try {
    for (let i = 0; i < state.slides.length; i++) {
      const s = state.slides[i] || {};
      canvas.style.backgroundImage = 'none';
      canvas.innerHTML = buildBgHtml(s) + template.render(s, i, state.slides.length);
      const rendered = await html2canvas(canvas, {
        scale: 1, width: 1080, height: state.canvasH || 1350,
        useCORS: true, allowTaint: true, backgroundColor: '#000000',
      });
      const dataUrl = rendered.toDataURL('image/jpeg', 0.92);
      const url = await uploadBgImage(dataUrl, state.projectId);
      urls.push(url);
      await new Promise(r => setTimeout(r, 200));
    }
  } finally {
    canvas.style.position = prevPos;
    canvas.style.left = prevLeft;
    canvas.style.top = prevTop;
    canvas.style.transform = prevTransform;
    renderCanvas();
  }

  return urls;
}

async function confirmSchedule() {
  const caption = document.getElementById('scheduleCaption').value;

  const btn = document.getElementById('scheduleConfirmBtn');
  btn.disabled = true;

  try {
    let presetId = state.activePresetId;
    if (!presetId) {
      btn.textContent = '저장 중...';
      const saved = await dbUpsertPreset({
        channel_id: state.projectId,
        name: state.slides[0]?.title || '검수 포스트',
        slides_json: JSON.parse(JSON.stringify(state.slides)),
      });
      presetId = saved.id;
      state.activePresetId = presetId;
    }

    btn.textContent = '렌더링 중...';
    const slideImages = await renderSlidesToUrls();

    btn.textContent = '등록 중...';
    await dbUpsertPost({
      channel_id: state.projectId,
      preset_id: presetId,
      status: 'scheduled',
      scheduled_at: new Date().toISOString(),
      caption,
      slide_images: slideImages,
      thumbnail_url: slideImages[0] || state.slides.find(s => s.bgImage)?.bgImage || null,
    });
    document.getElementById('scheduleModal').style.display = 'none';
    alert('검수 큐에 등록되었습니다! 대시보드에서 확인하세요.');
  } catch (e) {
    alert('등록 실패: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '검수 큐에 올리기';
  }
}

async function init() {
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
  if (typeof runMigrationIfNeeded === 'function') await runMigrationIfNeeded();
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);
  renderGallery();
  renderMoodboard();
  document.getElementById('exportBtn').addEventListener('click', exportPng);
  document.getElementById('exportAllBtn').addEventListener('click', exportAllPng);
  document.getElementById('savePresetBtn').addEventListener('click', () => savePreset());
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  initAiModal();
  fetchGymsharkNews();
  document.getElementById('newsModeBtn').addEventListener('click', () => {
    setMode(state.appMode === 'news' ? 'edit' : 'news');
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
  document.getElementById('scheduleBtn').addEventListener('click', openScheduleModal);
  document.getElementById('scheduleModalClose').addEventListener('click', () => {
    document.getElementById('scheduleModal').style.display = 'none';
  });
  document.getElementById('scheduleConfirmBtn').addEventListener('click', confirmSchedule);
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    location.reload();
  });
  if (typeof showDashboard === 'function') {
    document.getElementById('dashboardBtn')?.addEventListener('click', showDashboard);
  }
  const canvas = document.getElementById('canvas');
  canvas.addEventListener('click', e => {
    const key = e.target.closest('[data-drag-key]')?.dataset.dragKey;
    if (key) {
      state.selectedDragKey = key;
      renderTextStylePanel();
    }
  });
  canvas.addEventListener('input', e => {
    if (!e.target.dataset.dragKey) return;
    const key = e.target.dataset.dragKey;
    updateField(key, e.target.innerText);
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveAutoSave, 800);
  });
  canvas.addEventListener('blur', e => {
    if (!e.target.dataset.dragKey) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveAutoSave, 800);
    applyTextStyles(document.getElementById('canvas'), state.slides[state.slideIndex] || {}, true);
  }, true);

  const hasChannel = await initChannelSystem();
  if (hasChannel) {
    await renderPresets();
  } else {
    loadTemplate('cardnews');
  }
  showProjectScreen();
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

  const systemMsg = getProjectSystemMsg();
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

function renderGallery() {}

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

  filmstrip.innerHTML = state.slides.map((slideState, i) => {
    return `
      <div class="filmstrip-item ${i === state.slideIndex ? 'active' : ''}" data-index="${i}" draggable="true">
        <div class="filmstrip-thumb">
          <div class="filmstrip-preview-wrap">
            <div class="filmstrip-preview">
              ${buildBgHtml(slideState)}
              ${template.render(slideState, i, state.slides.length)}
            </div>
          </div>
          <button class="filmstrip-regen-btn" data-index="${i}" title="이 슬라이드 재생성">↻</button>
        </div>
        <span class="filmstrip-num">${i + 1}</span>
      </div>
    `;
  }).join('')
  + (state.slides.length < maxSlides ? `<button class="filmstrip-add" id="addSlideBtn">+</button>` : '');

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
  const slideState = state.slides[Math.min(state.slideIndex, state.slides.length - 1)] || {};
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

  const visibleKeys = template.fieldsForSlide ? template.fieldsForSlide(state.slideIndex) : null;
  const visibleFields = visibleKeys ? template.fields.filter(f => visibleKeys.includes(f.key)) : template.fields;

  const canRemove = state.slideIndex > 0 && state.slides.length > 1;
  const slideInfo = `<div class="slide-info">
    <span>SLIDE ${state.slideIndex + 1} / ${state.slides.length}</span>
    <div class="slide-info-actions">
      <button class="slide-regen-inline-btn" id="slideRegenInlineBtn">↻ 재생성</button>
      ${canRemove ? `<button class="remove-slide-btn" id="removeSlideBtn">× 삭제</button>` : ''}
    </div>
  </div>`;

  fieldsEl.innerHTML = slideInfo + visibleFields.map(f => renderField(f, slideState[f.key] ?? f.default, slideState)).join('');

  const removeBtn = document.getElementById('removeSlideBtn');
  if (removeBtn) removeBtn.addEventListener('click', removeCurrentSlide);

  const regenInlineBtn = document.getElementById('slideRegenInlineBtn');
  if (regenInlineBtn) {
    regenInlineBtn.addEventListener('click', () => {
      slideRegenTargetIdx = state.slideIndex;
      document.getElementById('slideRegenTitle').textContent = `슬라이드 ${state.slideIndex + 1} 재생성`;
      document.getElementById('slideRegenHint').value = '';
      document.getElementById('slideRegenBtn').disabled = false;
      document.getElementById('slideRegenBtn').textContent = '재생성';
      document.getElementById('slideRegenModal').style.display = 'flex';
      setTimeout(() => document.getElementById('slideRegenHint').focus(), 30);
    });
  }

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
      const raw = el.type === 'checkbox' ? el.checked : el.value;
      const value = el.type === 'range' ? parseInt(raw) : raw;
      updateField(key, value);
      if (el.type === 'range' && key === 'bgDim') {
        const valEl = el.closest('.field-dim-row')?.querySelector('.field-dim-val');
        if (valEl) valEl.textContent = value === 0 ? '없음' : value + '%';
        const overlay = document.querySelector('#canvas .bg-dim-overlay');
        if (value > 0) {
          if (overlay) overlay.style.background = `rgba(0,0,0,${(value / 100).toFixed(2)})`;
          else {
            const bgLayer = document.querySelector('#canvas .bg-layer');
            if (bgLayer) {
              const d = document.createElement('div');
              d.className = 'bg-dim-overlay';
              d.style.cssText = `position:absolute;inset:0;background:rgba(0,0,0,${(value / 100).toFixed(2)});pointer-events:none;`;
              bgLayer.insertAdjacentElement('afterend', d);
            }
          }
        } else if (overlay) overlay.remove();
      }
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
        reader.onload = async ev => {
          try {
            updateField(btn.dataset.key, await uploadBgImage(ev.target.result, state.projectId));
          } catch {
            updateField(btn.dataset.key, await compressImage(ev.target.result));
          }
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
    <div class="ts-row" style="padding-top:10px;border-top:1px solid #1e1e1e;margin-top:2px;">
      <button class="ts-apply-all-btn" id="tsApplyAllBtn">전체 슬라이드에 적용</button>
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

  document.getElementById('tsApplyAllBtn').addEventListener('click', () => {
    const src = state.slides[state.slideIndex];
    ['_opacity_', '_size_', '_color_'].forEach(prefix => {
      const k = prefix + key;
      state.slides.forEach((s, i) => {
        if (i === state.slideIndex) return;
        if (src[k] !== undefined) s[k] = src[k]; else delete s[k];
      });
    });
    renderFilmstrip();
    pushHistory();
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
      const dim = slideState?.bgDim ?? 0;
      const picker = value ? `<div class="pos-picker"><div class="pos-handle" style="left:${px}%;top:${py}%"></div></div>` : '';
      const applyAllBtn = value ? `<button class="field-apply-all-btn" data-key="${field.key}">전체 슬라이드 적용</button>` : '';
      const dimSlider = value ? `<div class="field-dim-row">
        <label class="field-label" style="margin:0;flex-shrink:0">어둡기</label>
        <input type="range" class="text-style-range" data-key="bgDim" min="0" max="80" value="${dim}">
        <span class="field-dim-val">${dim === 0 ? '없음' : dim + '%'}</span>
      </div>` : '';
      return `<div class="field-group">
        <label class="field-label">${field.label}</label>
        <button class="field-image-btn ${value ? 'has-image' : ''}" data-key="${field.key}">
          ${value ? '✓ 이미지 선택됨' : '+ 이미지 업로드'}
        </button>
        ${applyAllBtn}
        ${dimSlider}
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

function compressImage(dataUrl, maxPx = 1080, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
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
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveAutoSave, 800);
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

// ── Project System ─────────────────────────────────────────────────────────

const BUILT_IN_PROJECTS = [
  {
    id: 'gymspire',
    name: 'GYMSPIRE',
    description: 'Gymshark 한국 공식 리셀러. 짐샤크 브랜드·선수·제품 전문 콘텐츠.',
    builtIn: true,
  },
];

function getCustomProjects() {
  try { return JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveCustomProjects(projects) {
  try { localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects)); } catch {}
}

function getAllProjects() {
  return [...BUILT_IN_PROJECTS, ...getCustomProjects()];
}

function getCurrentProject() {
  return getAllProjects().find(p => p.id === state.projectId) || BUILT_IN_PROJECTS[0];
}

function getProjectContext() {
  const project = getCurrentProject();
  if (project.id === 'gymspire') return GYMSHARK_BRAND_KNOWLEDGE;
  return `\n## 브랜드 컨텍스트\n${project.description || ''}`;
}

function getProjectSystemMsg() {
  const project = getCurrentProject();
  if (project.id === 'gymspire') {
    return '당신은 짐샤크(Gymshark) 한국 공식 인스타그램 @gymspire.kr의 SNS 콘텐츠 전문가입니다. 슬라이드 카드 뉴스 형식으로 작성합니다.';
  }
  return `당신은 ${project.name}의 SNS 콘텐츠 전문가입니다. 슬라이드 카드 뉴스 형식으로 작성합니다.${project.description ? '\n\n브랜드 컨텍스트:\n' + project.description : ''}`;
}

function showProjectScreen() {
  renderProjectScreen();
  document.getElementById('projectScreen').style.display = 'flex';
}

function hideProjectScreen() {
  document.getElementById('projectScreen').style.display = 'none';
}

function renderProjectScreen() {
  const projects = state.channels || [];
  const screen = document.getElementById('projectScreen');
  screen.innerHTML = `
    <div class="project-screen-inner">
      <span class="project-screen-eyebrow">WORKSPACE</span>
      <h1 class="project-screen-title">프로젝트 선택</h1>
      <p class="project-screen-sub">각 프로젝트는 독립된 작업 이력과 AI 컨텍스트를 가집니다.</p>
      <div class="project-grid">
        ${projects.map(p => `
          <button class="project-card${p.id === state.projectId ? ' active' : ''}" data-id="${escHtml(p.id)}">
            <span class="project-card-name">${escHtml(p.name)}</span>
            <span class="project-card-desc">${escHtml(p.description)}</span>
            ${p.builtIn ? '<span class="project-card-tag">기본 제공</span>' : ''}
          </button>
        `).join('')}
        <button class="project-card project-card--new" id="newProjectCardBtn">
          <span class="project-card-plus">+</span>
          <span class="project-card-name">새 프로젝트</span>
          <span class="project-card-desc">커스텀 브랜드 또는 개인 계정</span>
        </button>
      </div>
    </div>
  `;
  screen.querySelectorAll('.project-card[data-id]').forEach(card => {
    card.addEventListener('click', () => loadChannel(card.dataset.id));
  });
  document.getElementById('newProjectCardBtn').addEventListener('click', showNewProjectModal);
}

async function loadChannel(channelId) {
  const channel = (state.channels || []).find(c => c.id === channelId);
  if (!channel) return;
  state.projectId = channelId;
  const switchedName = channel.name;
  Object.keys(moodboardState).forEach(k => { moodboardState[k] = false; });
  moodboardState[switchedName] = true;
  renderMoodboard();
  newsCache.items = []; newsCache.fetchedAt = 0; // bust cache on channel switch
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

function showNewProjectModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '3000';
  overlay.innerHTML = `
    <div class="modal">
      <p class="modal-title">NEW PROJECT</p>
      <input class="modal-input" id="newProjectName" type="text" placeholder="프로젝트 이름 (예: FITCORE)" maxlength="24">
      <textarea class="modal-input" id="newProjectDesc" placeholder="브랜드 설명 — AI 생성 시 참고합니다" style="min-height:72px;resize:vertical;margin-top:-8px;"></textarea>
      <div class="modal-actions">
        <button class="modal-btn modal-cancel" id="newProjectCancel">취소</button>
        <button class="modal-btn modal-confirm" id="newProjectConfirm">만들기</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#newProjectName').focus();
  overlay.querySelector('#newProjectCancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#newProjectConfirm').addEventListener('click', async () => {
    const name = overlay.querySelector('#newProjectName').value.trim();
    const desc = overlay.querySelector('#newProjectDesc').value.trim();
    if (!name) { overlay.querySelector('#newProjectName').focus(); return; }
    try {
      await dbUpsertChannel({
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
}

async function initChannelSystem() {
  document.getElementById('projectSwitchBtn').addEventListener('click', showProjectScreen);
  let channels;
  try { channels = await dbGetChannels(); } catch { channels = []; }
  if (!channels.length) return false;
  state.channels = channels;
  const savedId = localStorage.getItem(ACTIVE_CHANNEL_KEY);
  const target = channels.find(c => c.id === savedId) || channels[0];
  state.projectId = target.id;
  document.getElementById('brandName').textContent = target.name;
  return true;
}

let aiPendingSlides = null;
let aiConversationHistory = [];
let aiGenerationHistory = [];
let aiHistoryIdx = -1;

function pushAiHistory(slides) {
  if (!slides) return;
  aiGenerationHistory = aiGenerationHistory.slice(0, aiHistoryIdx + 1);
  aiGenerationHistory.push(JSON.parse(JSON.stringify(slides)));
  aiHistoryIdx = aiGenerationHistory.length - 1;
  renderAiHistoryNav();
}

function renderAiHistoryNav() {
  let nav = document.getElementById('aiHistoryNav');
  const resultWrap = document.getElementById('aiResultWrap');
  if (!resultWrap) return;
  if (!nav) {
    nav = document.createElement('div');
    nav.id = 'aiHistoryNav';
    nav.className = 'ai-history-nav';
    const feedbackRow = resultWrap.querySelector('.ai-feedback-row');
    if (feedbackRow) feedbackRow.parentNode.insertBefore(nav, feedbackRow);
    else resultWrap.appendChild(nav);
  }
  const total = aiGenerationHistory.length;
  if (total <= 1) { nav.style.display = 'none'; return; }
  nav.style.display = 'flex';
  nav.innerHTML = `
    <button class="ai-hist-btn" id="aiHistPrev" ${aiHistoryIdx <= 0 ? 'disabled' : ''}>← 이전</button>
    <span class="ai-hist-info">${aiHistoryIdx + 1} / ${total}</span>
    <button class="ai-hist-btn" id="aiHistNext" ${aiHistoryIdx >= total - 1 ? 'disabled' : ''}>다음 →</button>
  `;
  document.getElementById('aiHistPrev')?.addEventListener('click', () => {
    if (aiHistoryIdx > 0) {
      aiHistoryIdx--;
      aiPendingSlides = JSON.parse(JSON.stringify(aiGenerationHistory[aiHistoryIdx]));
      renderAiPreview(aiPendingSlides, getTemplate(state.templateId));
      renderAiHistoryNav();
    }
  });
  document.getElementById('aiHistNext')?.addEventListener('click', () => {
    if (aiHistoryIdx < aiGenerationHistory.length - 1) {
      aiHistoryIdx++;
      aiPendingSlides = JSON.parse(JSON.stringify(aiGenerationHistory[aiHistoryIdx]));
      renderAiPreview(aiPendingSlides, getTemplate(state.templateId));
      renderAiHistoryNav();
    }
  });
}

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

  const ch = (state.channels || []).find(c => c.id === state.projectId) || {};
  const channelName = ch.name || '이 계정';

  const channelBase = ch.ai_system_prompt
    ? ch.ai_system_prompt
    : `당신은 ${channelName} 인스타그램 계정의 SNS 콘텐츠 전문가입니다. 슬라이드 카드 뉴스 형식으로 작성합니다.${ch.description ? '\n\n브랜드 컨텍스트:\n' + ch.description : ''}`;

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
- 2-3문장마다 빈 줄(\n\n)로 단락 구분해 시각적 호흡 제공
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
${AI_TONE_GUIDES[tone]}
${AI_SPEECH_GUIDES[speech] || AI_SPEECH_GUIDES.friendly}
${AI_TARGET_GUIDES[target] || AI_TARGET_GUIDES.all}`;

  const newsContext = (newsItems && newsItems.length > 0)
    ? `\n## 최신 뉴스 헤드라인 (관련 있으면 자연스럽게 반영, 무관하면 무시)\n${newsItems.slice(0, 5).map(n => `- ${n.title} (${n.date})`).join('\n')}\n`
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

## 응답 형식
JSON만 응답. 다른 텍스트 일절 없음.
반드시 ${slideCount}개의 슬라이드를 생성. 각 슬라이드 객체에 위 필드 키를 전부 포함. 생략·축소 불가.
{ "slides": [ { "필드키": "값", ... }, ... ] }`;

  return { systemMsg, userMsg };
}

function renderAiSlideTargetPicker() {
  const picker = document.getElementById('aiSlideTargetPicker');
  if (!picker) return;
  picker.innerHTML = state.slides.map((_, i) =>
    `<button class="ai-count-btn${i === state.slideIndex ? ' active' : ''}" data-slide-idx="${i}">${i + 1}번</button>`
  ).join('');
  picker.querySelectorAll('.ai-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      picker.querySelectorAll('.ai-count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
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
    pushAiHistory(aiPendingSlides);
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

async function runAiFeedbackSingleSlide(targetIdx, hint) {
  const template = getTemplate(state.templateId);
  const feedbackBtn = document.getElementById('aiFeedbackBtn');
  feedbackBtn.disabled = true;
  feedbackBtn.textContent = '수정 중...';
  const keys = (template.fieldsForSlide ? template.fieldsForSlide(targetIdx) : template.fields.map(f => f.key))
    .filter(k => k !== 'bgImage');
  const fieldDescs = keys.map(k => {
    const def = template.fields.find(f => f.key === k);
    return `- ${k}: ${def?.label || k}`;
  }).join('\n');
  const slides = aiPendingSlides || state.slides;
  const contextSlides = slides.map((s, i) => {
    const vals = keys.map(k => `${k}: ${s[k] || ''}`).join(', ');
    return `슬라이드 ${i + 1}: ${vals}`;
  }).join('\n');
  const systemMsg = getProjectSystemMsg();
  const userMsg = `수정 요청: ${hint}\n\n현재 카드뉴스 맥락:\n${contextSlides}\n\n슬라이드 ${targetIdx + 1}번만 재생성해주세요.\n\n필드 목록:\n${fieldDescs}\n\nJSON만 응답. { ${keys.map(k => `"${k}": "값"`).join(', ')} }`;
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
    if (!aiPendingSlides) aiPendingSlides = slides.map(s => ({ ...s }));
    keys.forEach(k => { if (parsed[k] !== undefined) aiPendingSlides[targetIdx][k] = parsed[k]; });
    pushAiHistory(aiPendingSlides);
    renderAiPreview(aiPendingSlides, template);
    document.getElementById('aiFeedback').value = '';
  } catch (err) {
    alert(`수정 실패: ${err.message}`);
  } finally {
    feedbackBtn.disabled = false;
    feedbackBtn.textContent = '수정하기';
  }
}

async function runAiFeedback() {
  const feedback = document.getElementById('aiFeedback').value.trim();
  if (!feedback) return;
  const slideTargetToggle = document.getElementById('aiSlideTargetToggle');
  if (slideTargetToggle?.checked) {
    const activeBtn = document.getElementById('aiSlideTargetPicker')?.querySelector('.ai-count-btn.active');
    const targetIdx = activeBtn ? parseInt(activeBtn.dataset.slideIdx) : 0;
    await runAiFeedbackSingleSlide(targetIdx, feedback);
    return;
  }
  if (!aiConversationHistory.length) return;
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
    pushAiHistory(aiPendingSlides);
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

async function applyAiSlides() {
  if (!aiPendingSlides) return;
  const template = getTemplate(state.templateId);
  const maxSlides = template.maxSlides || template.slides || 10;

  state.slides = aiPendingSlides.slice(0, maxSlides).map((slideData, i) => {
    const slide = {};
    template.fields.forEach(f => { slide[f.key] = f.default ?? ''; });
    const keys = (template.fieldsForSlide ? template.fieldsForSlide(i) : template.fields.map(f => f.key))
      .filter(k => k !== 'bgImage');
    keys.forEach(k => {
      if (slideData[k] === undefined) return;
      slide[k] = k === 'body' ? smartKoreanBreaks(slideData[k]) : slideData[k];
    });
    return slide;
  });

  state.slideIndex = 0;
  document.getElementById('aiModal').style.display = 'none';
  renderFilmstrip();
  renderEditor();
  renderCanvas();
  pushHistory();
  const titleName = aiPendingSlides[0]?.title;
  await savePreset(titleName || undefined);
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
  const slideTargetToggle = document.getElementById('aiSlideTargetToggle');
  if (slideTargetToggle) {
    slideTargetToggle.addEventListener('change', () => {
      document.getElementById('aiSlideTargetField').style.display = slideTargetToggle.checked ? '' : 'none';
    });
  }
}

// ── Presets ──────────────────────────────────────────────────────────────────

async function getPresets() {
  try { return await dbGetPresets(state.projectId); } catch { return []; }
}

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

async function loadPreset(id) {
  const presets = await getPresets();
  const preset = presets.find(p => p.id === id);
  if (!preset) return;
  state.templateId = preset.templateId || 'cardnews';
  state.slideIndex = 0;
  state.slides = preset.slides_json || preset.slides || [{}];
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

async function deletePreset(id) {
  if (!confirm('삭제할까요?')) return;
  try { await dbDeletePreset(id); } catch (e) { alert('삭제 실패: ' + e.message); return; }
  renderPresets();
}

async function renderPresets() {
  const list = document.getElementById('presetList');
  const presets = await getPresets();

  const newCanvasItem = `<div class="preset-item preset-item--new" id="newCanvasBtn"><span class="preset-item-icon">+</span> 새 캔버스</div>`;

  if (!presets.length) {
    list.innerHTML = newCanvasItem + `<div class="preset-empty">저장된 항목 없음</div>`;
  } else {
    list.innerHTML = newCanvasItem + presets.map(p => `
      <div class="preset-item ${p.id === state.activePresetId ? 'active' : ''}" data-id="${p.id}">
        <span class="preset-name">${escHtml(p.name)}</span>
        <button class="preset-delete" data-id="${p.id}">×</button>
      </div>
    `).join('');
  }

  document.getElementById('newCanvasBtn').addEventListener('click', () => {
    state.activePresetId = null;
    loadTemplate('cardnews');
    renderPresets();
  });

  list.querySelectorAll('.preset-item[data-id]').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.classList.contains('preset-delete')) return;
      item.classList.add('flash');
      item.addEventListener('animationend', () => item.classList.remove('flash'), { once: true });
      loadPreset(item.dataset.id);
    });
  });
  list.querySelectorAll('.preset-delete').forEach(btn => {
    btn.addEventListener('click', () => deletePreset(btn.dataset.id));
  });
}

// ── News Panel ───────────────────────────────────────────────────────────────

const newsCache = { items: [], sources: {}, fetchedAt: 0 };
const NEWS_CACHE_TTL = 30 * 60 * 1000;
const NEWS_PER_PAGE = 8;
let newsPage = 0;
let newsFilter = 'all';

const NEWS_SOURCE_LABELS = {
  news:    { label: 'News',    short: 'News',    desc: 'Google · Bing RSS — keyword search, last 90 days' },
  newsapi: { label: 'NewsAPI', short: 'NewsAPI', desc: 'NewsAPI.org — last 30 days (free plan)' },
  blog:    { label: 'Blog',    short: 'Blog',    desc: 'gymshark.com/blog — official content only' },
  youtube: { label: 'YouTube', short: 'YouTube', desc: 'Official Gymshark channel — latest 12 videos' },
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
    renderProjectSettings();
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
    const ch = (state.channels || []).find(c => c.id === state.projectId) || {};
    const keywords = (ch.news_keywords || []).join(',');
    const res = await fetch(`/api/news${keywords ? `?keywords=${encodeURIComponent(keywords)}` : ''}`);
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

function renderProjectSettings() {
  const view = document.getElementById('newsView');
  if (!view) return;
  const ch = (state.channels || []).find(c => c.id === state.projectId) || {};

  view.innerHTML = `
    <div class="proj-layout">
      <div class="proj-left">
        <div class="proj-left-header">
          <span class="proj-eyebrow">${escHtml((ch.name || 'CHANNEL').toUpperCase())}</span>
          <h2 class="proj-title">프로젝트 설정</h2>
        </div>
        <div class="proj-left-body">
          <div class="ch-field">
            <label class="ch-label">채널 이름</label>
            <input class="ch-input" id="projName" type="text" value="${escHtml(ch.name || '')}">
          </div>
          <div class="ch-field">
            <label class="ch-label">브랜드 컨텍스트</label>
            <p class="ch-hint">AI 포스트 생성 시 계정 특성을 반영합니다</p>
            <textarea class="ch-input ch-textarea" id="projDesc" rows="4">${escHtml(ch.description || '')}</textarea>
          </div>
          <div class="ch-field">
            <label class="ch-label">뉴스 키워드 <span class="ch-optional">영문 권장</span></label>
            <p class="ch-hint">쉼표로 구분. 뉴스 피드 및 AI 컨텍스트에 사용됩니다.</p>
            <input class="ch-input" id="projKeywords" type="text" value="${escHtml((ch.news_keywords || []).join(', '))}">
          </div>
          <div class="ch-field">
            <label class="ch-label">AI 시스템 프롬프트 <span class="ch-optional">선택</span></label>
            <p class="ch-hint">비워두면 기본 프롬프트 사용. 입력 시 완전 대체.</p>
            <textarea class="ch-input ch-textarea" id="projSystemPrompt" rows="5">${escHtml(ch.ai_system_prompt || '')}</textarea>
          </div>
          <div class="ch-field ch-field--row">
            <div class="ch-field-inner">
              <label class="ch-label">색상</label>
              <input class="ch-input ch-input--color" id="projColor" type="color" value="${escHtml(ch.color || '#ffffff')}">
            </div>
            <div class="ch-field-inner" style="flex:3">
              <label class="ch-label">HEX</label>
              <input class="ch-input" id="projColorHex" type="text" value="${escHtml(ch.color || '#ffffff')}">
            </div>
          </div>
        </div>
        <div class="proj-left-footer">
          <span class="proj-save-status" id="projSaveStatus"></span>
          <button class="ch-btn ch-btn--primary" id="projSaveBtn">저장</button>
        </div>
      </div>
      <div class="proj-right" id="projNewsPane">
        <div class="news-view-empty">불러오는 중...</div>
      </div>
    </div>`;

  const colorInput = document.getElementById('projColor');
  const colorHex = document.getElementById('projColorHex');
  colorInput.addEventListener('input', () => { colorHex.value = colorInput.value; });
  colorHex.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(colorHex.value)) colorInput.value = colorHex.value;
  });
  document.getElementById('projSaveBtn').addEventListener('click', saveProjectSettings);

  renderFullNewsPanel(newsCache.items.length ? undefined : 'loading');
  if (!newsCache.items.length || Date.now() - newsCache.fetchedAt > NEWS_CACHE_TTL) {
    fetchGymsharkNews();
  }
}

async function saveProjectSettings() {
  const ch = (state.channels || []).find(c => c.id === state.projectId);
  if (!ch) return;
  const saveBtn = document.getElementById('projSaveBtn');
  const statusEl = document.getElementById('projSaveStatus');
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';
  const keywords = document.getElementById('projKeywords').value
    .split(',').map(k => k.trim()).filter(Boolean);
  const updates = {
    id: ch.id,
    name: document.getElementById('projName').value.trim() || ch.name,
    description: document.getElementById('projDesc').value.trim(),
    color: document.getElementById('projColorHex').value.trim() || ch.color,
    news_keywords: keywords,
    ai_system_prompt: document.getElementById('projSystemPrompt').value.trim() || null,
  };
  try {
    await dbUpsertChannel(updates);
    state.channels = await dbGetChannels();
    if (typeof dashState !== 'undefined') dashState.channels = state.channels;
    newsCache = { items: [], sources: {}, fetchedAt: 0 };
    saveBtn.textContent = '저장';
    saveBtn.disabled = false;
    if (statusEl) { statusEl.textContent = '저장됨'; setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000); }
    renderProjectSettings();
  } catch (e) {
    saveBtn.textContent = '저장';
    saveBtn.disabled = false;
    if (statusEl) statusEl.textContent = '저장 실패';
    alert('저장 실패: ' + e.message);
  }
}

function renderFullNewsPanel(status) {
  const pane = document.getElementById('projNewsPane');
  if (!pane) return;

  const ch = (state.channels || []).find(c => c.id === state.projectId) || {};
  const header = `
    <div class="proj-news-header">
      <div>
        <span class="proj-news-eyebrow">${escHtml((ch.name || 'CHANNEL').toUpperCase())}</span>
        <h3 class="proj-news-title">뉴스 피드</h3>
      </div>
      <button class="news-refresh-btn" id="newsRefreshBtn">새로고침</button>
    </div>`;

  if (status === 'loading') {
    pane.innerHTML = header + `<div class="news-view-empty">불러오는 중...</div>`;
  } else if (status === 'error' || !newsCache.items.length) {
    pane.innerHTML = header + `<div class="news-view-empty">소스를 불러올 수 없습니다</div>`;
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
        <button class="news-filter-btn ${newsFilter === 'all' ? 'active' : ''}" data-filter="all">ALL (${newsCache.items.length})</button>
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

    pane.innerHTML = header + filterTabs + `
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
        }).join('') : `<div style="grid-column:1/-1;padding:40px 0;font-size:13px;color:#333;text-align:center;">No recent articles for this filter</div>`}
      </div>
      ${totalPages > 1 ? `
      <div class="news-pagination">
        <button class="news-page-btn" id="newsPrevBtn" ${newsPage === 0 ? 'disabled' : ''}>← 이전</button>
        <span class="news-page-info">${newsPage + 1} / ${totalPages}</span>
        <button class="news-page-btn" id="newsNextBtn" ${newsPage >= totalPages - 1 ? 'disabled' : ''}>다음 →</button>
      </div>` : ''}`;
  }

  pane.onclick = e => {
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

// ── MOODBOARD ────────────────────────────────────────────────────────────────

const moodboardState = {};
const moodboardSourceState = {};

function getActiveMoodboardName() {
  if (!state.channels) return null;
  const ch = state.channels.find(c => c.id === state.projectId);
  return ch ? ch.name : null;
}

function renderMoodboard() {
  const panel = document.getElementById('moodboardPanel');
  if (!panel) return;
  const activeName = getActiveMoodboardName();

  panel.innerHTML = Object.entries(MOODBOARD).map(([name, data]) => {
    if (moodboardState[name] === undefined) moodboardState[name] = (name === activeName);
    if (!moodboardSourceState[name]) moodboardSourceState[name] = data.sources[0];

    const isOpen = moodboardState[name];
    const selectedSource = moodboardSourceState[name];
    const isActive = name === activeName;

    const sourceBtns = data.sources.map(src =>
      `<button class="moodboard-source-btn${src === selectedSource ? ' moodboard-source-btn--active' : ''}" data-channel="${name}" data-source="${src}">${src}</button>`
    ).join('');

    const keywords = data.keywords.map(kw => {
      const urlFn = SOURCE_URLS[selectedSource];
      const url = urlFn ? urlFn(kw) : '#';
      return `<a class="keyword-btn" href="${url}" target="_blank" rel="noopener">${kw}</a>`;
    }).join('');

    return `
      <div class="moodboard-group${isActive ? ' moodboard-group--active' : ''}">
        <div class="moodboard-group-header" data-channel="${name}">
          <span class="moodboard-group-name">${name}</span>
          <button class="moodboard-group-toggle" data-channel="${name}">${isOpen ? '▾' : '▸'}</button>
        </div>
        <div class="moodboard-group-body" style="display:${isOpen ? '' : 'none'}">
          <div class="moodboard-sources">${sourceBtns}</div>
          <div class="moodboard-keywords">${keywords}</div>
        </div>
      </div>`;
  }).join('');

  panel.querySelectorAll('.moodboard-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const ch = header.dataset.channel;
      moodboardState[ch] = !moodboardState[ch];
      renderMoodboard();
    });
  });

  panel.querySelectorAll('.moodboard-source-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      moodboardSourceState[btn.dataset.channel] = btn.dataset.source;
      renderMoodboard();
    });
  });
}

// ── Task 11: PNG Export ──────────────────────────────────────────────────────

async function exportAllPng() {
  const template = getTemplate(state.templateId);
  const btn = document.getElementById('exportAllBtn');
  const canvas = document.getElementById('canvas');
  const totalSlides = state.slides.length;

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
      const s = state.slides[i] || {};
        canvas.style.backgroundImage = 'none';
        canvas.innerHTML = buildBgHtml(s) + template.render(s, i, state.slides.length);
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
    btn.textContent = '전체 내보내기';
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
    btn.textContent = 'PNG 내보내기';
  });
}

document.addEventListener('DOMContentLoaded', init);
