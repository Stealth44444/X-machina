let dashState = {
  channels: [],
  posts: [],
  selectedChannelId: null,
  selectedDate: null,
  viewMode: 'week',
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

  dashState.channels = (typeof state !== 'undefined' && state.channels) || await dbGetChannels();
  dashState.posts = await dbGetAllPosts();
  dashState.currentWeekStart = getWeekStart(new Date());

  renderDashboard();
}

function hideDashboard() {
  document.getElementById('dashboardScreen').style.display = 'none';
  document.querySelector('.app').style.display = '';
}

function renderDashboard() {
  const screen = document.getElementById('dashboardScreen');
  screen.innerHTML = `
    <div class="dash-inner">
      <div class="dash-header">
        <span class="dash-title">X MACHINA</span>
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
    ? new Date(post.scheduled_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '미예약';
  const thumb = post.thumbnail_url
    ? `<div class="dash-card-thumb" style="background-image:url('${post.thumbnail_url}')"></div>`
    : `<div class="dash-card-thumb dash-card-thumb--empty">${ch?.emoji || '📷'}</div>`;
  const titleText = (post.presets && post.presets.name) || post.caption || '제목 없음';
  return `
    <div class="dash-card" data-id="${post.id}">
      ${thumb}
      <div class="dash-card-body">
        <div class="dash-card-ch" style="color:${ch?.color || '#ffffff'}">${ch?.emoji || ''} ${ch?.name || ''}</div>
        <div class="dash-card-name">${titleText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <div class="dash-card-date">${date}</div>
      </div>
    </div>
  `;
}

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
      ${days.map(d => {
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
          return `<span class="dash-cal-dot" style="background:${ch?.color || '#ffffff'}" title="${ch?.name || ''}"></span>`;
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
  newBtn.onclick = () => hideDashboard();
}

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
  if (typeof loadChannel === 'function') await loadChannel(post.channel_id);
  if (post.preset_id && typeof loadPreset === 'function') await loadPreset(post.preset_id);
  hideDashboard();
}
