let dashState = {
  channels: [],
  posts: [],
  editingChannel: null,
  hiddenChannels: new Set(),
};

async function showDashboard() {
  document.querySelector('.app').style.display = 'none';
  const screen = document.getElementById('dashboardScreen');
  screen.style.display = 'flex';
  screen.innerHTML = '<div class="dash-loading">불러오는 중...</div>';

  dashState.channels = (typeof state !== 'undefined' && state.channels) || await dbGetChannels();
  dashState.posts = await dbGetAllPosts();
  renderDashboard();
}

function hideDashboard() {
  document.getElementById('dashboardScreen').style.display = 'none';
  document.querySelector('.app').style.display = '';
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

function getDateLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(d, today)) return '오늘';
  if (isSameDay(d, tomorrow)) return '내일';
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function renderDashboard() {
  const screen = document.getElementById('dashboardScreen');
  const today = new Date();

  const todayScheduled = dashState.posts.filter(p =>
    p.status === 'scheduled' && p.scheduled_at && isSameDay(new Date(p.scheduled_at), today)
  );

  const dateLabel = today.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  });

  const visibleChannels = dashState.channels.filter(ch => !dashState.hiddenChannels.has(ch.id));

  screen.innerHTML = `
    <div class="dash-inner">
      <div class="dash-header">
        <div class="dash-header-left">
          <span class="dash-title">X MACHINA</span>
          <span class="dash-header-date">${dateLabel}</span>
          <span class="dash-header-sched${todayScheduled.length === 0 ? ' is-empty' : ''}">
            ${todayScheduled.length > 0
              ? `<span class="mac-dot mac-dot--scheduled"></span><span>${todayScheduled.length}건 오늘 예약</span>`
              : '오늘 예약 없음'}
          </span>
        </div>
        <button class="dash-close-btn" id="dashCloseBtn">편집으로</button>
      </div>
      <div class="dash-channel-filter">
        <span class="dash-filter-label">채널</span>
        ${dashState.channels.map(ch => {
          const isOff = dashState.hiddenChannels.has(ch.id);
          return `<button class="dash-ch-filter-btn${isOff ? ' is-off' : ''}" data-channel-id="${ch.id}">
            <span class="dash-ch-filter-dot" style="background:${isOff ? '#2a2a2a' : ch.color}"></span>
            ${escSafe(ch.name)}
          </button>`;
        }).join('')}
      </div>
      <div class="dash-columns" id="dashColumns">
        ${visibleChannels.length === 0
          ? '<div class="dash-no-channels">채널을 선택하세요</div>'
          : visibleChannels.map(ch => renderChannelColumn(ch)).join('')}
      </div>
    </div>
  `;

  bindDashboardEvents();
}

function renderChannelColumn(ch) {
  const allPosts = dashState.posts
    .filter(p => p.channel_id === ch.id && p.status !== 'published')
    .sort((a, b) => {
      if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
      if (b.status === 'scheduled' && a.status !== 'scheduled') return 1;
      if (a.status === 'scheduled' && b.status === 'scheduled')
        return new Date(a.scheduled_at) - new Date(b.scheduled_at);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const scheduled = allPosts.filter(p => p.status === 'scheduled');
  const drafts = allPosts.filter(p => p.status !== 'scheduled');
  const today = new Date();
  const todayCount = scheduled.filter(p => isSameDay(new Date(p.scheduled_at), today)).length;

  const dateGroupMap = new Map();
  const dateGroupOrder = [];
  for (const post of scheduled) {
    const label = getDateLabel(post.scheduled_at);
    if (!dateGroupMap.has(label)) {
      dateGroupMap.set(label, []);
      dateGroupOrder.push(label);
    }
    dateGroupMap.get(label).push(post);
  }

  let bodyHtml = '';
  for (const label of dateGroupOrder) {
    const isToday = label === '오늘';
    bodyHtml += `
      <div class="dash-date-group">
        <div class="dash-date-divider${isToday ? ' is-today' : ''}">${label}</div>
        ${dateGroupMap.get(label).map(p => renderPostCard(p)).join('')}
      </div>
    `;
  }
  if (drafts.length > 0) {
    bodyHtml += `
      <div class="dash-date-group">
        <div class="dash-date-divider is-draft">초안</div>
        ${drafts.map(p => renderPostCard(p)).join('')}
      </div>
    `;
  }

  const statsHtml = [
    scheduled.length > 0 ? `예약 ${scheduled.length}건` : '',
    drafts.length > 0 ? `초안 ${drafts.length}건` : '',
  ].filter(Boolean).join(' · ');

  return `
    <div class="dash-col" data-channel-id="${ch.id}">
      <div class="dash-col-header" style="border-top-color:${ch.color}">
        <div class="dash-col-title-row">
          <div class="dash-col-name-wrap">
            <span class="dash-col-name">${escSafe(ch.name)}</span>
            ${todayCount > 0 ? `<span class="dash-col-today">${todayCount}</span>` : ''}
          </div>
          <button class="dash-col-settings" data-channel-id="${ch.id}">설정</button>
        </div>
        ${statsHtml ? `<div class="dash-col-stats">${statsHtml}</div>` : ''}
      </div>
      <div class="dash-col-body">
        ${bodyHtml || '<div class="dash-col-empty">대기 중인 포스트 없음</div>'}
      </div>
      <div class="dash-col-footer">
        <button class="dash-new-btn" data-channel-id="${ch.id}">새 포스트</button>
      </div>
    </div>
  `;
}

function renderPostCard(post) {
  const title = (post.presets && post.presets.name) || post.caption || '제목 없음';
  const isSched = post.status === 'scheduled';
  const timeStr = isSched && post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const safeTitle = escSafe(title);
  const EMPTY_THUMB = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="%23111"/><text x="50%25" y="50%25" fill="%23333" font-size="14" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">NO IMAGE</text></svg>';
  const thumbUrl = post.thumbnail_url || (post.slide_images && post.slide_images[0]) || EMPTY_THUMB;
  const slideCount = post.slide_images ? post.slide_images.length : 0;
  const safeCaption = escSafe(post.caption || '');

  return `
    <div class="dash-post-card">
      <div class="dash-post-top">
        <div class="dash-post-status-row">
          <span class="mac-dot ${isSched ? 'mac-dot--scheduled' : 'mac-dot--draft'}"></span>
          ${isSched && timeStr
            ? `<span class="dash-post-time">${timeStr}</span>`
            : `<span class="dash-post-draft-lbl">초안</span>`}
        </div>
        ${isSched
          ? `<button class="dash-cancel-btn" data-post-id="${post.id}">취소</button>`
          : ''}
      </div>
      <div class="dash-post-thumb-wrap" data-post-id="${post.id}" title="클릭하여 슬라이드 전체 보기">
        <img src="${thumbUrl}" alt="" class="dash-post-thumb">
        <div class="dash-post-thumb-overlay">
          <span>슬라이드 ${slideCount}장</span>
        </div>
      </div>
      <div class="dash-post-title">${safeTitle}</div>
      <div class="dash-post-caption-wrap">
        <textarea class="dash-post-caption-input" data-post-id="${post.id}" placeholder="캡션 입력..." rows="3">${safeCaption}</textarea>
        <span class="dash-caption-saved-hint" id="captionHint_${post.id}" style="display:none">✓ 저장됨</span>
      </div>
      <div class="dash-post-actions">
        <button class="dash-post-btn" data-post-id="${post.id}" data-channel-id="${post.channel_id}">편집</button>
        <button class="dash-post-btn dash-post-btn--preview" data-post-id="${post.id}">미리보기</button>
        <button class="dash-post-btn dash-post-btn--download" data-post-id="${post.id}">저장</button>
      </div>
    </div>
  `;
}

function bindDashboardEvents() {
  document.getElementById('dashCloseBtn').addEventListener('click', hideDashboard);

  document.querySelectorAll('.dash-ch-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.channelId;
      if (dashState.hiddenChannels.has(id)) {
        dashState.hiddenChannels.delete(id);
      } else {
        dashState.hiddenChannels.add(id);
      }
      renderDashboard();
    });
  });

  document.querySelectorAll('.dash-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => cancelSchedule(btn.dataset.postId, btn));
  });

  document.querySelectorAll('.dash-post-btn:not(.dash-post-btn--preview):not(.dash-post-btn--download)').forEach(btn => {
    btn.addEventListener('click', () => openPostInEditor(btn.dataset.postId, btn.dataset.channelId));
  });

  document.querySelectorAll('.dash-post-btn--preview, .dash-post-thumb-wrap').forEach(btn => {
    btn.addEventListener('click', () => openLightbox(btn.dataset.postId));
  });

  document.querySelectorAll('.dash-post-btn--download').forEach(btn => {
    btn.addEventListener('click', () => downloadPostImages(btn.dataset.postId));
  });

  document.querySelectorAll('.dash-post-caption-input').forEach(inp => {
    let timer = null;
    inp.addEventListener('input', () => {
      const hint = document.getElementById(`captionHint_${inp.dataset.postId}`);
      if (hint) {
        hint.textContent = '저장 중...';
        hint.style.display = 'inline';
        hint.style.color = '#888';
      }
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await dbUpdatePostCaption(inp.dataset.postId, inp.value);
          if (hint) {
            hint.textContent = '✓ 저장됨';
            hint.style.color = '#ffffff';
            setTimeout(() => { hint.style.display = 'none'; }, 2000);
          }
        } catch (e) {
          if (hint) { hint.textContent = '✗ 저장 실패'; hint.style.color = '#ff4444'; }
        }
      }, 1000);
    });

    inp.addEventListener('blur', async () => {
      clearTimeout(timer);
      const hint = document.getElementById(`captionHint_${inp.dataset.postId}`);
      try {
        await dbUpdatePostCaption(inp.dataset.postId, inp.value);
        if (hint) {
          hint.textContent = '✓ 저장됨';
          hint.style.display = 'inline';
          hint.style.color = '#ffffff';
          setTimeout(() => { hint.style.display = 'none'; }, 2000);
        }
      } catch (e) {
        if (hint) { hint.textContent = '✗ 저장 실패'; hint.style.color = '#ff4444'; }
      }
    });
  });

  document.querySelectorAll('.dash-new-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof loadChannel === 'function') loadChannel(btn.dataset.channelId);
      hideDashboard();
    });
  });

  document.querySelectorAll('.dash-col-settings').forEach(btn => {
    btn.addEventListener('click', () => openChannelSettings(btn.dataset.channelId));
  });
}

async function cancelSchedule(postId, btn) {
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    await dbUpdatePostStatus(postId, 'draft');
    const post = dashState.posts.find(p => p.id === postId);
    if (post) { post.status = 'draft'; post.scheduled_at = null; }
    renderDashboard();
  } catch (e) {
    alert('예약 취소 실패: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '취소'; }
  }
}

async function openPostInEditor(postId, channelId) {
  const post = dashState.posts.find(p => p.id === postId);
  if (!post) return;
  if (typeof loadChannel === 'function') await loadChannel(channelId);
  if (post.preset_id && typeof loadPreset === 'function') await loadPreset(post.preset_id);
  hideDashboard();
}

function openLightbox(postId) {
  const post = dashState.posts.find(p => p.id === postId);
  if (!post || !post.slide_images || post.slide_images.length === 0) {
    alert('미리볼 슬라이드 이미지가 없습니다.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.id = 'lightboxOverlay';
  overlay.innerHTML = `
    <div class="lightbox-container">
      <div class="lightbox-header">
        <span class="lightbox-title">${escSafe(post.presets?.name || post.caption || '슬라이드 미리보기')} (${post.slide_images.length}장)</span>
        <button class="lightbox-close" id="lightboxClose">닫기</button>
      </div>
      <div class="lightbox-body">
        <div class="lightbox-slides">
          ${post.slide_images.map((url, i) => `
            <div class="lightbox-slide">
              <img src="${url}" alt="Slide ${i+1}">
              <span class="lightbox-slide-num">${i+1} / ${post.slide_images.length}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('lightboxClose').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function downloadPostImages(postId) {
  const post = dashState.posts.find(p => p.id === postId);
  if (!post || !post.slide_images || post.slide_images.length === 0) {
    alert('다운로드할 슬라이드 이미지가 없습니다.');
    return;
  }

  const caption = post.caption || '';
  if (caption) {
    try {
      await navigator.clipboard.writeText(caption);
      alert('캡션이 클립보드에 복사되었습니다!');
    } catch (e) {
      console.log('Clipboard copy failed:', e);
    }
  }

  post.slide_images.forEach((url, i) => {
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `post_${postId}_slide_${i+1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch(err => console.error('Download error:', err));
  });
}

// ── Channel Settings Modal ────────────────────────────────────────────────

function openChannelSettings(channelId) {
  const ch = dashState.channels.find(c => c.id === channelId);
  if (!ch) return;
  dashState.editingChannel = ch;

  const overlay = document.createElement('div');
  overlay.className = 'ch-settings-overlay';
  overlay.id = 'chSettingsOverlay';
  overlay.innerHTML = `
    <div class="ch-settings-panel">
      <div class="ch-settings-header">
        <span class="ch-settings-title">채널 설정</span>
        <button class="ch-settings-close" id="chSettingsClose">닫기</button>
      </div>

      <div class="ch-settings-body">
        <div class="ch-field">
          <label class="ch-label">채널 이름</label>
          <input class="ch-input" id="chName" type="text" value="${escSafe(ch.name)}">
        </div>

        <div class="ch-field">
          <label class="ch-label">브랜드 컨텍스트</label>
          <p class="ch-hint">AI 포스트 생성 시 계정 특성을 반영하는 데 사용됩니다.</p>
          <textarea class="ch-input ch-textarea" id="chDesc" rows="4">${escSafe(ch.description || '')}</textarea>
        </div>

        <div class="ch-field">
          <label class="ch-label">뉴스 키워드</label>
          <p class="ch-hint">쉼표로 구분. 채널 주제에 맞는 최신 뉴스를 검색합니다.</p>
          <input class="ch-input" id="chKeywords" type="text"
            value="${escSafe((ch.news_keywords || []).join(', '))}">
        </div>

        <div class="ch-field">
          <label class="ch-label">AI 시스템 프롬프트 <span class="ch-optional">선택</span></label>
          <p class="ch-hint">비워두면 기본 프롬프트가 사용됩니다. 직접 입력하면 완전히 대체됩니다.</p>
          <textarea class="ch-input ch-textarea" id="chSystemPrompt" rows="4">${escSafe(ch.ai_system_prompt || '')}</textarea>
        </div>

        <div class="ch-field ch-field--row">
          <div class="ch-field-inner">
            <label class="ch-label">채널 색상</label>
            <input class="ch-input ch-input--color" id="chColor" type="color" value="${ch.color || '#ffffff'}">
          </div>
          <div class="ch-field-inner" style="flex:3">
            <label class="ch-label">색상 HEX</label>
            <input class="ch-input" id="chColorHex" type="text" value="${escSafe(ch.color || '#ffffff')}">
          </div>
        </div>
      </div>

      <div class="ch-settings-footer">
        <button class="ch-btn ch-btn--danger" id="chDeleteBtn">채널 삭제</button>
        <button class="ch-btn ch-btn--primary" id="chSaveBtn">저장</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const colorInput = document.getElementById('chColor');
  const colorHex = document.getElementById('chColorHex');
  colorInput.addEventListener('input', () => { colorHex.value = colorInput.value; });
  colorHex.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(colorHex.value)) colorInput.value = colorHex.value;
  });

  document.getElementById('chSettingsClose').addEventListener('click', closeChannelSettings);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeChannelSettings(); });
  document.getElementById('chSaveBtn').addEventListener('click', saveChannelSettings);
  document.getElementById('chDeleteBtn').addEventListener('click', deleteChannel);
}

function closeChannelSettings() {
  document.getElementById('chSettingsOverlay')?.remove();
  dashState.editingChannel = null;
}

async function saveChannelSettings() {
  const ch = dashState.editingChannel;
  if (!ch) return;

  const saveBtn = document.getElementById('chSaveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';

  const keywords = document.getElementById('chKeywords').value
    .split(',').map(k => k.trim()).filter(Boolean);

  const updates = {
    id: ch.id,
    name: document.getElementById('chName').value.trim() || ch.name,
    description: document.getElementById('chDesc').value.trim(),
    color: document.getElementById('chColorHex').value.trim() || ch.color,
    news_keywords: keywords,
    ai_system_prompt: document.getElementById('chSystemPrompt').value.trim() || null,
  };

  try {
    await dbUpsertChannel(updates);
    dashState.channels = await dbGetChannels();
    if (typeof state !== 'undefined') state.channels = dashState.channels;
    closeChannelSettings();
    renderDashboard();
  } catch (e) {
    alert('저장 실패: ' + e.message);
    saveBtn.disabled = false;
    saveBtn.textContent = '저장';
  }
}

async function deleteChannel() {
  const ch = dashState.editingChannel;
  if (!ch) return;
  if (!confirm(`"${ch.name}" 채널을 삭제하시겠습니까?\n연결된 프리셋과 포스트도 모두 삭제됩니다.`)) return;

  try {
    await dbDeleteChannel(ch.id);
    dashState.channels = await dbGetChannels();
    if (typeof state !== 'undefined') state.channels = dashState.channels;
    closeChannelSettings();
    renderDashboard();
  } catch (e) {
    alert('삭제 실패: ' + e.message);
  }
}

function escSafe(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
