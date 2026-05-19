// Rap Radar, WSJ Markets 대체 소스 테스트
const CANDIDATES = [
  { label: 'The Source',        url: 'https://thesource.com/feed/' },
  { label: '2DopeBoyz',         url: 'https://2dopeboyz.com/feed/' },
  { label: 'Mass Appeal',       url: 'https://massappeal.com/feed/' },
  { label: 'Ones To Watch',     url: 'https://www.ones2watch.com/feed' },
  { label: 'HotNewHipHop',      url: 'https://www.hotnewhiphop.com/feed.rss' },
  { label: 'WSJ US Business',   url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml' },
  { label: 'WSJ World News',    url: 'https://feeds.a.dj.com/rss/RSSWSJD.xml' },
  { label: 'CNBC Markets',      url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258' },
  { label: 'CNBC Finance',      url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147' },
  { label: 'Yahoo Finance',     url: 'https://finance.yahoo.com/news/rssindex' },
  { label: 'Barrons',           url: 'https://www.barrons.com/xml/rss/3_7531.xml' },
];

const ITEM_RE = /<item>([\s\S]*?)<\/item>/g;
const ENTRY_RE = /<entry>([\s\S]*?)<\/entry>/g;
const CUTOFF = Date.now() - 90 * 24 * 60 * 60 * 1000;

async function check(feed) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return { ...feed, status: 'HTTP_' + res.status };
    const xml = await res.text();
    const rss = [...xml.matchAll(ITEM_RE)];
    const atom = rss.length === 0 ? [...xml.matchAll(ENTRY_RE)] : [];
    const blocks = rss.length > 0 ? rss : atom;
    if (!blocks.length) return { ...feed, status: 'EMPTY' };

    // 최신 날짜 확인
    let newest = 0;
    let recentCount = 0;
    for (const m of blocks) {
      const b = m[1];
      const dateStr = b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || b.match(/<updated>(.*?)<\/updated>/)?.[1] || '';
      const ms = new Date(dateStr).getTime();
      if (ms > newest) newest = ms;
      if (ms > CUTOFF) recentCount++;
    }
    return { ...feed, status: 'OK', total: blocks.length, recent: recentCount, newest: new Date(newest).toISOString().slice(0,10) };
  } catch (e) {
    clearTimeout(t);
    return { ...feed, status: e.name === 'AbortError' ? 'TIMEOUT' : e.message.slice(0, 40) };
  }
}

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';

const results = await Promise.all(CANDIDATES.map(check));
for (const r of results) {
  const ok = r.status === 'OK' && r.recent > 0;
  const icon = ok ? PASS : FAIL;
  const info = r.status === 'OK'
    ? `총 ${r.total}개, 90일내 ${r.recent}개 (최신: ${r.newest})`
    : r.status;
  console.log(`${icon} ${r.label.padEnd(22)} ${info}`);
}
