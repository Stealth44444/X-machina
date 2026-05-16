// 허용할 도메인 — 실제 배포 도메인으로 교체하세요 (예: https://gymspire.vercel.app)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

// 단순 인메모리 rate limit (Vercel 서버리스는 인스턴스가 분산되므로 완전하지 않지만 기본 방어는 됨)
const rateMap = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

function checkRate(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}

export default async function handler(req, res) {
  // Origin 검증 — ALLOWED_ORIGINS가 설정된 경우에만 체크
  if (ALLOWED_ORIGINS.length > 0) {
    const origin = req.headers.origin || '';
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit (IP 기준, 분당 10회)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRate(ip)) {
    return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API 키가 서버에 설정되지 않았습니다.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'OpenAI 오류' });
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
