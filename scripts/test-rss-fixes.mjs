// 실패한 피드 대체 URL 검증
const CANDIDATES = [
  // ── DC Inside (mgallery 패턴 시도) ──────────────────────────────────────
  { id: 'dc_mma',        label: 'DC Inside MMA (mgallery)',    url: 'https://gall.dcinside.com/mgallery/board/feeds/?id=mma' },
  { id: 'dc_ufc',        label: 'DC Inside UFC (mgallery)',    url: 'https://gall.dcinside.com/mgallery/board/feeds/?id=ufc_dc' },
  { id: 'dc_hiphop',     label: 'DC Inside 힙합 (mgallery)',   url: 'https://gall.dcinside.com/mgallery/board/feeds/?id=hiphop' },
  { id: 'dc_stock',      label: 'DC Inside 주식 (mgallery)',   url: 'https://gall.dcinside.com/mgallery/board/feeds/?id=stock_new1' },
  { id: 'dc_coin',       label: 'DC Inside 코인 (mgallery)',   url: 'https://gall.dcinside.com/mgallery/board/feeds/?id=bitcoins' },
  { id: 'dc_arch',       label: 'DC Inside 건축 (mgallery)',   url: 'https://gall.dcinside.com/mgallery/board/feeds/?id=architecture' },
  { id: 'dc_luxury',     label: 'DC Inside 명품 (mgallery)',   url: 'https://gall.dcinside.com/mgallery/board/feeds/?id=luxury' },

  // ── MMA 대체 ────────────────────────────────────────────────────────────
  { id: 'mmajunkie_alt', label: 'MMA Junkie (trailing slash)', url: 'https://mmajunkie.usatoday.com/feed/' },
  { id: 'mmamania',      label: 'MMA Mania',                  url: 'https://www.mmamania.com/rss/current.xml' },
  { id: 'fightful',      label: 'Fightful',                   url: 'https://www.fightful.com/feed' },
  { id: 'tapology',      label: 'Tapology',                   url: 'https://www.tapology.com/feed' },

  // ── 힙합 대체 ────────────────────────────────────────────────────────────
  { id: 'complex_main',  label: 'Complex (main feed)',        url: 'https://www.complex.com/feed/' },
  { id: 'pitchfork_alt', label: 'Pitchfork (alt 1)',          url: 'https://pitchfork.com/feed/pitchforkfull/rss' },
  { id: 'pitchfork_alt2',label: 'Pitchfork (alt 2)',          url: 'https://pitchfork.com/rss/news/feed.xml?' },
  { id: 'nme',           label: 'NME',                        url: 'https://www.nme.com/feed' },
  { id: 'rap_radar',     label: 'Rap Radar',                  url: 'https://rapradar.com/feed/' },
  { id: 'genius',        label: 'Genius News',                url: 'https://genius.com/feed.rss' },
  { id: 'stereogum',     label: 'Stereogum',                  url: 'https://www.stereogum.com/feed/' },
  { id: 'fader_alt',     label: 'The FADER (alt)',            url: 'https://www.thefader.com/rss/articles.xml' },
  { id: 'hhdx_alt',      label: 'HipHopDX (SoundCloud blog)',url: 'https://www.soundcloud.com/blog/rss.xml' },

  // ── 경제 대체 ────────────────────────────────────────────────────────────
  { id: 'reuters_alt',   label: 'Reuters (investing)',        url: 'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best' },
  { id: 'chosunbiz_alt', label: '조선비즈 (alt 1)',           url: 'https://biz.chosun.com/rss.htm' },
  { id: 'chosunbiz_alt2',label: '조선비즈 (alt 2)',           url: 'https://biz.chosun.com/feed/rss.htm' },
  { id: 'edaily_alt',    label: '이데일리 (alt)',             url: 'https://www.edaily.co.kr/rss/moneyandMarket.xml' },
  { id: 'sedaily_alt',   label: '서울경제 (alt 1)',           url: 'https://www.sedaily.com/rss' },
  { id: 'sedaily_alt2',  label: '서울경제 (alt 2)',           url: 'https://sedaily.com/RssFeed' },
  { id: 'investing',     label: 'Investing.com',              url: 'https://www.investing.com/rss/news.rss' },
  { id: 'wsj_markets',   label: 'WSJ Markets',                url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' },

  // ── 디자인/건축 대체 ──────────────────────────────────────────────────────
  { id: 'wallpaper_alt', label: 'Wallpaper* (alt)',           url: 'https://www.wallpaper.com/rss' },
  { id: 'frame_mag',     label: 'Frame Magazine',             url: 'https://www.frameweb.com/feed' },
  { id: 'domus_alt',     label: 'Domus (alt)',                url: 'https://www.domusweb.it/rss/en.xml' },
  { id: 'arch_record_alt',label:'Arch Record (alt)',          url: 'https://www.architecturalrecord.com/rss/news' },
  { id: 'metropolis_alt',label: 'Metropolis (alt)',           url: 'https://metropolismag.com/rss/' },
  { id: 'inhabitat',     label: 'Inhabitat',                  url: 'https://inhabitat.com/feed/' },
  { id: 'curbed',        label: 'Curbed',                     url: 'https://www.curbed.com/rss/index.xml' },

  // ── 패션 대체 ────────────────────────────────────────────────────────────
  { id: 'bof_alt',       label: 'Business of Fashion (alt)', url: 'https://www.businessoffashion.com/feed' },
  { id: 'voguebiz_alt',  label: 'Vogue Business (alt)',      url: 'https://www.voguebusiness.com/feed' },
  { id: 'ssense',        label: 'SSENSE',                    url: 'https://www.ssense.com/en-us/editorial/feed' },
  { id: 'i_d',           label: 'i-D',                       url: 'https://i-d.vice.com/en_us/rss' },
  { id: 'fashionista',   label: 'Fashionista',               url: 'https://fashionista.com/feed' },
  { id: 'elle',          label: 'Elle',                      url: 'https://www.elle.com/rss/all.xml/' },
  { id: 'harpers',       label: "Harper's Bazaar",           url: 'https://www.harpersbazaar.com/rss/all.xml/' },
];

const ITEM_RE = /<item>([\s\S]*?)<\/item>/g;
const ENTRY_RE = /<entry>([\s\S]*?)<\/entry>/g;

async function checkFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return { ...feed, status: 'HTTP_' + res.status, items: 0 };
    const xml = await res.text();
    const rssCount = [...xml.matchAll(ITEM_RE)].length;
    const atomCount = rssCount === 0 ? [...xml.matchAll(ENTRY_RE)].length : 0;
    const items = rssCount + atomCount;
    const format = rssCount > 0 ? 'RSS' : atomCount > 0 ? 'Atom' : 'EMPTY';
    return { ...feed, status: 'OK', items, format };
  } catch (e) {
    clearTimeout(timer);
    const reason = e.name === 'AbortError' ? 'TIMEOUT' : e.message.slice(0, 50);
    return { ...feed, status: reason, items: 0 };
  }
}

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';

const results = await Promise.all(CANDIDATES.map(checkFeed));
for (const r of results) {
  const ok = r.status === 'OK' && r.items > 0;
  const icon = ok ? PASS : FAIL;
  const info = ok ? `${r.items} items (${r.format})` : r.status;
  console.log(`${icon} ${r.label.padEnd(32)} ${info}`);
}
console.log('\n완료');
