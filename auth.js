function renderAuthScreen() {
  const el = document.getElementById('authScreen');
  el.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo">X MACHINA</div>
        <p class="auth-sub">멀티채널 콘텐츠 자동화</p>
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
}

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.querySelector('.app').style.display = 'none';
  const dash = document.getElementById('dashboardScreen');
  if (dash) dash.style.display = 'none';
}

function hideAuthScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.querySelector('.app').style.display = '';
}
