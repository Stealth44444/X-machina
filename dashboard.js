let dashState = {
  channels: [],
  posts: [],
  editingChannel: null,
  hiddenChannels: new Set(),
  tab: 'queue',
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  calDay: null,
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
  const todayQueue = dashState.posts.filter(p =>
    p.status !== 'published' && p.scheduled_at && isSameDay(new Date(p.scheduled_at), today)
  );
  const dateLabel = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  screen.innerHTML = `
    <div class="dash-inner">
      <div class="dash-header">
        <div class="dash-header-left">
          <span class="dash-title">X MACHINA</span>
          <span class="dash-header-date">${dateLabel}</span>
          <span class="dash-header-sched${todayQueue.length === 0 ? ' is-empty' : ''}">
            ${todayQueue.length > 0
              ? `<span class="mac-dot mac-dot--scheduled"></span><span>오늘 ${todayQueue.length}건</span>`
              : '오늘 업로드 없음'}
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
      <div class="dash-tabs">
        <button class="dash-tab-btn${dashState.tab === 'queue' ? ' is-active' : ''}" data-tab="queue">큐</button>
        <button class="dash-tab-btn${dashState.tab === 'calendar' ? ' is-active' : ''}" data-tab="calendar">캘린더</button>
        <button class="dash-tab-btn${dashState.tab === 'history' ? ' is-active' : ''}" data-tab="history">기록</button>
      </div>
      <div class="dash-tab-content">
        ${dashState.tab === 'queue' ? renderQueueTab() : ''}
        ${dashState.tab === 'calendar' ? renderCalendarTab() : ''}
        ${dashState.tab === 'history' ? renderHistoryTab() : ''}
      </div>
    </div>
  `;
  bindDashboardEvents();
}

// ── Queue Tab ─────────────────────────────────────────────────────────────

function renderQueueTab() {
  const visibleChannels = dashState.channels.filter(ch => !dashState.hiddenChannels.has(ch.id));
  if (visibleChannels.length === 0) {
    return '<div class="dash-canvas"><div class="dash-no-channels">채널을 선택하세요</div></div>';
  }
  const topRow = visibleChannels.slice(0, 3);
  const botRow = visibleChannels.slice(3);
  return `<div class="dash-canvas">
    <div class="dash-canvas-row">${topRow.map(ch => renderChannelColumn(ch)).join('')}</div>
    ${botRow.length > 0 ? `<div class="dash-canvas-row dash-canvas-row--center">${botRow.map(ch => renderChannelColumn(ch)).join('')}</div>` : ''}
  </div>`;
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

  const today = new Date();
  const todayCount = allPosts.filter(p => p.status === 'scheduled' && isSameDay(new Date(p.scheduled_at), today)).length;
  const nextPost = allPosts[0] || null;
  const extraCount = allPosts.length - 1;

  let inner = '';
  if (nextPost) {
    const isSched = nextPost.status === 'scheduled';
    const timeStr = isSched && nextPost.scheduled_at
      ? new Date(nextPost.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      : '';
    const EMPTY = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"><rect width="4" height="5" fill="%23111"/></svg>';
    const thumbUrl = nextPost.thumbnail_url || (nextPost.slide_images && nextPost.slide_images[0]) || EMPTY;
    const slideCount = (nextPost.slide_images && nextPost.slide_images.length) || 0;
    const hasStack = slideCount > 1;

    inner = `
      <div class="dash-thumb-stack" data-post-id="${nextPost.id}">
        ${hasStack ? '<div class="dash-thumb-layer dash-thumb-layer--back"></div><div class="dash-thumb-layer dash-thumb-layer--mid"></div>' : ''}
        <div class="dash-post-thumb-wrap">
          <img src="${thumbUrl}" alt="" class="dash-post-thumb">
        </div>
        <div class="dash-thumb-ui">
          <div class="dash-thumb-ui-top">
            <div class="dash-thumb-ui-status">
              <span class="mac-dot ${isSched ? 'mac-dot--scheduled' : 'mac-dot--draft'}"></span>
              ${isSched && timeStr ? `<span class="dash-post-time">${timeStr}</span>` : ''}
              ${extraCount > 0 ? `<span class="dash-frame-extra">+${extraCount}</span>` : ''}
            </div>
            ${isSched ? `<button class="dash-cancel-btn" data-post-id="${nextPost.id}">취소</button>` : ''}
          </div>
          <div class="dash-thumb-ui-bottom">
            ${slideCount > 1 ? `<span class="dash-slide-badge">${slideCount}장</span>` : ''}
            <div class="dash-thumb-ui-actions">
              <button class="dash-post-btn dash-post-btn--done" data-post-id="${nextPost.id}">업로드 완료</button>
              <button class="dash-post-btn dash-post-btn--edit" data-post-id="${nextPost.id}" data-channel-id="${nextPost.channel_id}">편집</button>
              <button class="dash-post-btn dash-post-btn--download" data-post-id="${nextPost.id}">저장</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    inner = '<div class="dash-frame-empty">대기 없음</div>';
  }

  return `
    <div class="dash-frame" data-channel-id="${ch.id}">
      <div class="dash-frame-label">
        <span class="dash-frame-dot" style="background:${ch.color}"></span>
        <span class="dash-frame-name">${escSafe(ch.name)}</span>
        <div class="dash-frame-meta">
          ${todayCount > 0 ? `<span class="dash-frame-today">${todayCount}</span>` : ''}
          <button class="dash-col-settings" data-channel-id="${ch.id}">설정</button>
        </div>
      </div>
      ${inner}
    </div>
  `;
}

function renderPostCard(post) {
  const isSched = post.status === 'scheduled';
  const timeStr = isSched && post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const EMPTY = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"><rect width="4" height="5" fill="%23111"/></svg>';
  const thumbUrl = post.thumbnail_url || (post.slide_images && post.slide_images[0]) || EMPTY;
  const slideCount = (post.slide_images && post.slide_images.length) || 0;
  const hasStack = slideCount > 1;

  return `
    <div class="dash-post-card">
      <div class="dash-post-top">
        <div class="dash-post-status-row">
          <span class="mac-dot ${isSched ? 'mac-dot--scheduled' : 'mac-dot--draft'}"></span>
          ${isSched && timeStr ? `<span class="dash-post-time">${timeStr}</span>` : ''}
        </div>
        ${isSched ? `<button class="dash-cancel-btn" data-post-id="${post.id}">취소</button>` : ''}
      </div>
      <div class="dash-thumb-stack" data-post-id="${post.id}">
        ${hasStack ? `<div class="dash-thumb-layer dash-thumb-layer--back"></div><div class="dash-thumb-layer dash-thumb-layer--mid"></div>` : ''}
        <div class="dash-post-thumb-wrap">
          <img src="${thumbUrl}" alt="" class="dash-post-thumb">
          ${slideCount > 1 ? `<span class="dash-slide-badge">${slideCount}장</span>` : ''}
        </div>
      </div>
      <div class="dash-post-actions">
        <button class="dash-post-btn dash-post-btn--done" data-post-id="${post.id}">업로드 완료</button>
        <button class="dash-post-btn dash-post-btn--edit" data-post-id="${post.id}" data-channel-id="${post.channel_id}">편집</button>
        <button class="dash-post-btn dash-post-btn--download" data-post-id="${post.id}">저장</button>
      </div>
    </div>
  `;
}

// ── Calendar Tab ──────────────────────────────────────────────────────────

function renderCalendarTab() {
  const year = dashState.calYear;
  const month = dashState.calMonth;
  const today = new Date();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayMap = new Map();
  for (const post of dashState.posts) {
    const ds = post.status === 'published' ? post.published_at : post.scheduled_at;
    if (!ds) continue;
    const d = new Date(ds);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day).push(post);
  }

  const monthLabel = new Date(year, month).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  const dows = ['일', '월', '화', '수', '목', '금', '토'];

  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += '<div class="dash-cal-cell is-empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const isSel = dashState.calDay === d;
    const posts = dayMap.get(d) || [];
    const colors = [];
    const seen = new Set();
    for (const p of posts) {
      if (!seen.has(p.channel_id)) {
        seen.add(p.channel_id);
        const ch = dashState.channels.find(c => c.id === p.channel_id);
        colors.push(ch ? ch.color : '#555');
        if (colors.length >= 4) break;
      }
    }
    cells += `<div class="dash-cal-cell${isToday ? ' is-today' : ''}${isSel ? ' is-selected' : ''}${posts.length > 0 ? ' has-posts' : ''}" data-cal-day="${d}">
      <span class="dash-cal-cell-num">${d}</span>
      ${colors.length > 0 ? `<div class="dash-cal-dots">${colors.map(c => `<span class="dash-cal-dot" style="background:${c}"></span>`).join('')}</div>` : ''}
    </div>`;
  }

  let detailInner = '<div class="dash-cal-detail-placeholder">날짜를 선택하세요</div>';
  if (dashState.calDay !== null) {
    const selPosts = dayMap.get(dashState.calDay) || [];
    const selLabel = new Date(year, month, dashState.calDay).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    });
    detailInner = `
      <div class="dash-cal-detail-header">${selLabel} — ${selPosts.length}건</div>
      <div class="dash-cal-detail-items">
        ${selPosts.length === 0 ? '<div class="dash-cal-detail-empty">게시물 없음</div>' : selPosts.map(p => {
          const ch = dashState.channels.find(c => c.id === p.channel_id);
          const ds = p.status === 'published' ? p.published_at : p.scheduled_at;
          const timeStr = ds ? new Date(ds).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '—';
          const isDone = p.status === 'published';
          const title = (p.presets && p.presets.name) || p.caption || '—';
          return `<div class="dash-cal-detail-item">
            <span class="mac-dot ${isDone ? 'mac-dot--published' : 'mac-dot--scheduled'}"></span>
            <span class="dash-cal-detail-ch" style="color:${ch ? ch.color : '#888'}">${ch ? escSafe(ch.name) : '—'}</span>
            <span class="dash-cal-detail-time">${timeStr}</span>
            <span class="dash-cal-detail-title">${escSafe(title)}</span>
            ${isDone
              ? '<span class="dash-cal-detail-done">완료</span>'
              : `<button class="dash-post-btn dash-post-btn--done" data-post-id="${p.id}">업로드 완료</button>`}
          </div>`;
        }).join('')}
      </div>`;
  }

  return `<div class="dash-cal-wrap">
    <div class="dash-cal">
      <div class="dash-cal-header">
        <button class="dash-cal-nav" data-cal-nav="-1">&#8249;</button>
        <span class="dash-cal-month">${monthLabel}</span>
        <button class="dash-cal-nav" data-cal-nav="1">&#8250;</button>
      </div>
      <div class="dash-cal-grid">
        ${dows.map(d => `<div class="dash-cal-dow">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>
    <div class="dash-cal-detail">
      ${detailInner}
    </div>
  </div>`;
}

// ── History Tab ───────────────────────────────────────────────────────────

function renderHistoryTab() {
  const published = dashState.posts
    .filter(p => p.status === 'published' && p.published_at)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  if (published.length === 0) {
    return '<div class="dash-history-empty">업로드 기록이 없습니다</div>';
  }

  const dayMap = new Map();
  const dayOrder = [];
  for (const post of published) {
    const dk = new Date(post.published_at).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    });
    if (!dayMap.has(dk)) { dayMap.set(dk, []); dayOrder.push(dk); }
    dayMap.get(dk).push(post);
  }

  let html = '<div class="dash-history">';
  for (const dk of dayOrder) {
    html += `<div class="dash-history-day-group"><div class="dash-history-date">${dk}</div>`;
    for (const post of dayMap.get(dk)) {
      const ch = dashState.channels.find(c => c.id === post.channel_id);
      const thumbUrl = post.thumbnail_url || (post.slide_images && post.slide_images[0]) || '';
      const title = (post.presets && post.presets.name) || post.caption || '—';
      const timeStr = new Date(post.published_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      html += `<div class="dash-history-item">
        ${thumbUrl ? `<img src="${thumbUrl}" alt="" class="dash-history-thumb">` : '<div class="dash-history-thumb dash-history-thumb--empty"></div>'}
        <div class="dash-history-info">
          <span class="dash-history-ch" style="color:${ch ? ch.color : '#555'}">${ch ? escSafe(ch.name) : '—'}</span>
          <span class="dash-history-title">${escSafe(title)}</span>
        </div>
        <span class="dash-history-time">${timeStr}</span>
        <span class="mac-dot mac-dot--published"></span>
      </div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

// ── Events ────────────────────────────────────────────────────────────────

function bindDashboardEvents() {
  document.getElementById('dashCloseBtn').addEventListener('click', hideDashboard);

  document.querySelectorAll('.dash-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => { dashState.tab = btn.dataset.tab; renderDashboard(); });
  });

  document.querySelectorAll('.dash-ch-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.channelId;
      if (dashState.hiddenChannels.has(id)) dashState.hiddenChannels.delete(id);
      else dashState.hiddenChannels.add(id);
      renderDashboard();
    });
  });

  document.querySelectorAll('.dash-post-btn--done').forEach(btn => {
    btn.addEventListener('click', () => markAsPublished(btn.dataset.postId, btn));
  });

  document.querySelectorAll('.dash-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => cancelSchedule(btn.dataset.postId, btn));
  });

  document.querySelectorAll('.dash-post-btn--edit').forEach(btn => {
    btn.addEventListener('click', () => openPostInEditor(btn.dataset.postId, btn.dataset.channelId));
  });

  document.querySelectorAll('.dash-post-thumb').forEach(img => {
    const stack = img.closest('.dash-thumb-stack');
    img.addEventListener('click', () => openLightbox(stack?.dataset.postId));
  });
  document.querySelectorAll('.dash-thumb-ui button').forEach(btn => {
    btn.addEventListener('click', e => e.stopPropagation());
  });

  document.querySelectorAll('.dash-post-btn--download').forEach(btn => {
    btn.addEventListener('click', () => downloadPostImages(btn.dataset.postId));
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

  document.querySelectorAll('.dash-cal-nav').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = parseInt(btn.dataset.calNav);
      dashState.calMonth += dir;
      if (dashState.calMonth > 11) { dashState.calMonth = 0; dashState.calYear++; }
      if (dashState.calMonth < 0) { dashState.calMonth = 11; dashState.calYear--; }
      dashState.calDay = null;
      renderDashboard();
    });
  });

  document.querySelectorAll('.dash-cal-cell[data-cal-day]').forEach(cell => {
    cell.addEventListener('click', () => {
      const day = parseInt(cell.dataset.calDay);
      dashState.calDay = dashState.calDay === day ? null : day;
      renderDashboard();
    });
  });
}

// ── Actions ───────────────────────────────────────────────────────────────

async function markAsPublished(postId, btn) {
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    await dbUpdatePostStatus(postId, 'published');
    const post = dashState.posts.find(p => p.id === postId);
    if (post) { post.status = 'published'; post.published_at = new Date().toISOString(); }
    renderDashboard();
  } catch (e) {
    alert('실패: ' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '업로드 완료'; }
  }
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
    try { await navigator.clipboard.writeText(caption); alert('캡션이 클립보드에 복사되었습니다!'); }
    catch (e) {}
  }
  post.slide_images.forEach((url, i) => {
    fetch(url).then(r => r.blob()).then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `post_${postId}_slide_${i+1}.jpg`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }).catch(err => console.error(err));
  });
}

// ── Channel Settings Modal ─────────────────────────────────────────────────

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
          <input class="ch-input" id="chKeywords" type="text" value="${escSafe((ch.news_keywords || []).join(', '))}">
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
  saveBtn.disabled = true; saveBtn.textContent = '저장 중...';
  const keywords = document.getElementById('chKeywords').value.split(',').map(k => k.trim()).filter(Boolean);
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
    saveBtn.disabled = false; saveBtn.textContent = '저장';
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
