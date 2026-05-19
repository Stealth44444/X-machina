// 현재 api/news.js의 fetchRssItems 로직과 동일하게 실행해서 실제로 뭘 파싱하는지 확인
const CUTOFF_MS = 90 * 24 * 60 * 60 * 1000;
function cutoff() { return Date.now() - CUTOFF_MS; }
function msToDate(ms) { return new Date(ms).toISOString().slice(0, 10); }

const FEEDS = [
  { label: 'Hypebeast',     url: 'https://hypebeast.com/feed' },
  { label: '힙합엘이',        url: 'https://www.hiphople.com/rss' },
  { label: 'The Economist', url: 'https://www.economist.com/finance-and-economics/rss.xml' },
  { label: '한국경제',         url: 'https://www.hankyung.com/feed/all-news' },
];

async function fetchRssItems(url, label) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { items: [], error: 'HTTP_' + res.status };
    const xml = await res.text();
    const cut = cutoff();
    const items = [];
    const skipped = [];

    const rssMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const atomMatches = rssMatches.length === 0
      ? [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)] : [];
    const blocks = rssMatches.length > 0
      ? rssMatches.map(m => ({ block: m[1], format: 'rss' }))
      : atomMatches.map(m => ({ block: m[1], format: 'atom' }));

    for (const { block, format } of blocks.slice(0, 5)) { // 최초 5개만 진단
      let title = '', ms = 0, link = '';

      if (format === 'rss') {
        title = (
          block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ||
          block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g, '').trim() || ''
        ).replace(/\s*[-|]\s*[^-|]{1,50}$/, '').trim();
        ms = new Date(block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || 0).getTime();
        link = block.match(/<link>\s*(https?:\/\/[^<\s]+)/)?.[1] ||
               block.match(/<link[^>]+href="(https?:\/\/[^"]+)"/)?.[1] ||
               block.match(/<guid[^>]*>\s*(https?:\/\/[^<\s]+)/)?.[1] || '';
      } else {
        title = (
          block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ||
          block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g, '').trim() || ''
        ).replace(/\s*[-|]\s*[^-|]{1,50}$/, '').trim();
        const dateStr = block.match(/<updated>(.*?)<\/updated>/)?.[1] ||
                        block.match(/<published>(.*?)<\/published>/)?.[1] || '';
        ms = new Date(dateStr).getTime();
        link = block.match(/<link[^>]+href="(https?:\/\/[^"]+)"/)?.[1] ||
               block.match(/<link>\s*(https?:\/\/[^<\s]+)/)?.[1] || '';
      }

      const reason = !title ? 'NO_TITLE' : !ms ? 'NO_DATE' : ms < cut ? `CUTOFF(${new Date(ms).toISOString().slice(0,10)})` : 'OK';
      skipped.push({ title: title.slice(0,60) || '(없음)', ms, link: link.slice(0,60) || '(없음)', reason });

      if (!title || !ms || ms < cut) continue;
      items.push({ title, date: msToDate(ms), source: label, url: link, ms });
      if (items.length >= 20) break;
    }
    return { items, skipped, blocks: blocks.length };
  } catch (e) {
    return { items: [], error: e.message };
  }
}

for (const f of FEEDS) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`[${f.label}]`);
  const { items, skipped, blocks, error } = await fetchRssItems(f.url, f.label);
  if (error) { console.log(`  오류: ${error}`); continue; }
  console.log(`  전체 블록: ${blocks}개 → 파싱 성공: ${items}개`);
  console.log(`  첫 5개 블록 진단:`);
  for (const s of skipped) {
    const icon = s.reason === 'OK' ? '✓' : '✗';
    console.log(`    ${icon} [${s.reason}] title="${s.title}"`);
    if (s.reason !== 'OK') {
      console.log(`         link="${s.link}"`);
    }
  }
}
