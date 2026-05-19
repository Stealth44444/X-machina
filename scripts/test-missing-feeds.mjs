const MISSING = {
  'mma_seoul': [
    { label: 'Bloody Elbow',        url: 'https://www.bloodyelbow.com/rss/current.xml' },
    { label: 'Bloody Elbow (alt)',  url: 'https://www.bloodyelbow.com/feed/' },
    { label: '스포츠조선 격투기',     url: 'https://sports.chosun.com/rss/rss.htm' },
    { label: '스포츠조선 (alt)',      url: 'https://sports.chosun.com/rss.htm' },
    { label: 'OSEN 격투기',          url: 'https://osen.mt.co.kr/rss.xml' },
    { label: 'OSEN (alt)',           url: 'https://osen.mt.co.kr/rss/sports.xml' },
    { label: '스포츠동아',            url: 'https://sports.donga.com/rss/rss.xml' },
    { label: '스포츠동아 (alt)',       url: 'https://sports.donga.com/rss.xml' },
    { label: '연합뉴스 스포츠',        url: 'https://www.yna.co.kr/rss/sports.xml' },
  ],
  'Nightcall.audio': [
    { label: 'Pitchfork (alt1)',     url: 'https://pitchfork.com/rss/' },
    { label: 'Pitchfork (alt2)',     url: 'https://pitchfork.com/feed/' },
    { label: 'Pitchfork (alt3)',     url: 'https://pitchfork.com/rss/news/' },
    { label: 'Complex (alt1)',       url: 'https://www.complex.com/rss.xml' },
    { label: 'Complex (alt2)',       url: 'https://feeds.feedburner.com/complex/all' },
    { label: 'The FADER (alt)',      url: 'https://www.thefader.com/feed/rss' },
    { label: 'Rhythmer',            url: 'https://www.rhythmer.net/rss' },
    { label: 'IZM (alt1)',           url: 'https://izm.co.kr/rss.xml' },
    { label: 'IZM (alt2)',           url: 'https://izm.co.kr/feed/rss' },
    { label: 'IZM (alt3)',           url: 'https://izm.co.kr/rss/latest' },
    { label: 'Consequence of Sound', url: 'https://consequenceofsound.net/feed/' },
    { label: 'Clash Music',         url: 'https://www.clashmusic.com/feeds/all' },
  ],
  'CAPITALFLOW': [
    { label: 'Forbes (alt1)',        url: 'https://www.forbes.com/real-time/feed2/' },
    { label: 'Forbes (alt2)',        url: 'https://www.forbes.com/investing/feed2/' },
    { label: 'Seeking Alpha',        url: 'https://seekingalpha.com/feed.xml' },
    { label: '조선비즈 (alt1)',        url: 'https://biz.chosun.com/svc/rss/rss.html' },
    { label: '조선비즈 (alt2)',        url: 'https://biz.chosun.com/rss/rss.html' },
    { label: '조선비즈 (alt3)',        url: 'https://chosun.com/rss/biz.xml' },
    { label: '머니투데이 (alt1)',       url: 'https://www.mt.co.kr/rss/news/economy.xml' },
    { label: '머니투데이 (alt2)',       url: 'https://news.mt.co.kr/rss/economy.xml' },
    { label: '머니투데이 (alt3)',       url: 'https://www.mt.co.kr/rss.xml' },
    { label: '헤럴드경제 (alt1)',       url: 'https://biz.heraldcorp.com/rss.php' },
    { label: '헤럴드경제 (alt2)',       url: 'https://heraldbiz.com/rss.php' },
    { label: '헤럴드경제 (alt3)',       url: 'https://www.heraldcorp.com/rss.php' },
    { label: '서울경제 (alt1)',         url: 'https://www.sedaily.com/rss/finance.xml' },
    { label: '서울경제 (alt2)',         url: 'https://sedaily.com/rss/all.xml' },
    { label: '이데일리 (alt1)',         url: 'https://www.edaily.co.kr/rss/rss.xml' },
    { label: '이데일리 (alt2)',         url: 'https://www.edaily.co.kr/rss/newsticker.xml' },
    { label: '파이낸셜뉴스 (alt1)',      url: 'https://www.fnnews.com/rss/fn_economy.xml' },
    { label: '파이낸셜뉴스 (alt2)',      url: 'https://www.fnnews.com/rss.xml' },
    { label: '뉴스핌',                 url: 'https://www.newspim.com/rss/economy.xml' },
  ],
  'spacelog': [
    { label: 'Frame Magazine',       url: 'https://www.frameweb.com/feed' },
    { label: 'Frame (alt)',          url: 'https://www.frameweb.com/rss' },
    { label: 'Domus (alt1)',         url: 'https://www.domusweb.it/en/rss.html' },
    { label: 'Domus (alt2)',         url: 'https://www.domusweb.it/rss/en/home.xml' },
    { label: 'Arch Record (alt1)',   url: 'https://www.architecturalrecord.com/rss/news.xml' },
    { label: 'Arch Record (alt2)',   url: 'https://www.architecturalrecord.com/rss' },
    { label: 'Metropolis (alt1)',    url: 'https://metropolismag.com/rss' },
    { label: 'Metropolis (alt2)',    url: 'https://www.metropolismag.com/feed/' },
    { label: 'Dwell',               url: 'https://www.dwell.com/article/rss.xml' },
    { label: 'Dwell (alt)',         url: 'https://feeds.feedburner.com/dwell' },
    { label: 'Interior Design',     url: 'https://interiordesign.net/feed/' },
  ],
  'obscurelife.kr': [
    { label: '매거진 B (alt1)',        url: 'https://magazineb.co.kr/rss' },
    { label: '매거진 B (alt2)',        url: 'https://magazineb.co.kr/feed' },
    { label: 'Esquire Korea (alt1)', url: 'https://www.esquirekorea.co.kr/rss' },
    { label: 'Esquire Korea (alt2)', url: 'https://www.esquirekorea.co.kr/feed' },
    { label: '아레나 옴므 (alt1)',      url: 'https://www.arenahomme.com/rss' },
    { label: '아레나 옴므 (alt2)',      url: 'https://www.arena.co.kr/rss' },
    { label: 'Dazed Korea (alt1)',   url: 'https://www.dazedkorea.com/rss' },
    { label: 'Dazed Korea (alt2)',   url: 'https://www.dazedkorea.com/feed' },
    { label: 'Esquire (global)',     url: 'https://www.esquire.com/rss/all.xml/' },
    { label: 'CR Fashion Book',     url: 'https://www.crfashionbook.com/rss' },
    { label: 'AnOther Magazine',    url: 'https://www.anothermag.com/feed/rss' },
    { label: 'i-D (alt)',           url: 'https://i-d.vice.com/en/rss' },
    { label: 'Document Journal',    url: 'https://www.documentjournal.com/feed/' },
    { label: 'System Magazine',     url: 'https://system-magazine.com/feed' },
  ],
};

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
    if (!res.ok) return { ...feed, ok: false, info: 'HTTP_' + res.status };
    const xml = await res.text();
    const rss = [...xml.matchAll(ITEM_RE)];
    const atom = rss.length === 0 ? [...xml.matchAll(ENTRY_RE)] : [];
    const blocks = rss.length > 0 ? rss : atom;
    if (!blocks.length) return { ...feed, ok: false, info: 'EMPTY' };
    let recent = 0;
    for (const m of blocks) {
      const b = m[1];
      const ds = b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || b.match(/<updated>(.*?)<\/updated>/)?.[1] || '';
      if (new Date(ds).getTime() > CUTOFF) recent++;
    }
    return { ...feed, ok: recent > 0, info: `총${blocks.length} 90일내${recent}` };
  } catch (e) {
    clearTimeout(t);
    return { ...feed, ok: false, info: e.name === 'AbortError' ? 'TIMEOUT' : e.message.slice(0,30) };
  }
}

const P = '\x1b[32m✓\x1b[0m', F = '\x1b[31m✗\x1b[0m';
for (const [ch, feeds] of Object.entries(MISSING)) {
  console.log(`\n── ${ch} ─────────────────────────────`);
  const results = await Promise.all(feeds.map(check));
  for (const r of results)
    console.log(`  ${r.ok ? P : F} ${r.label.padEnd(28)} ${r.info}`);
}
