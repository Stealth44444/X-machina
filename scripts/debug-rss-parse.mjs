// 문제 피드의 첫 번째 item 구조를 출력해서 파서 문제 진단
const FEEDS = [
  { label: 'Hypebeast',     url: 'https://hypebeast.com/feed' },
  { label: '힙합엘이',        url: 'https://www.hiphople.com/rss' },
  { label: 'Rap Radar',     url: 'https://rapradar.com/feed/' },
  { label: 'The Economist', url: 'https://www.economist.com/finance-and-economics/rss.xml' },
  { label: 'WSJ Markets',   url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' },
  { label: '한국경제',         url: 'https://www.hankyung.com/feed/all-news' },
];

for (const feed of FEEDS) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[${feed.label}] ${feed.url}`);
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.log(`  HTTP ${res.status}`); continue; }

    // 인코딩 감지
    const contentType = res.headers.get('content-type') || '';
    console.log(`  Content-Type: ${contentType}`);

    const buf = await res.arrayBuffer();
    // EUC-KR 여부 확인
    let xml;
    try {
      xml = new TextDecoder('utf-8').decode(buf);
    } catch {
      xml = new TextDecoder('euc-kr').decode(buf);
    }

    // XML 선언의 encoding 확인
    const encMatch = xml.match(/encoding=["']([^"']+)["']/i);
    if (encMatch) {
      console.log(`  XML encoding: ${encMatch[1]}`);
      if (/euc-kr/i.test(encMatch[1])) {
        xml = new TextDecoder('euc-kr').decode(buf);
      }
    }

    // RSS <item> 또는 Atom <entry> 첫 번째 블록 추출
    const rssM = xml.match(/<item>([\s\S]*?)<\/item>/);
    const atomM = !rssM ? xml.match(/<entry>([\s\S]*?)<\/entry>/) : null;
    const block = rssM?.[1] || atomM?.[1];
    const format = rssM ? 'RSS' : atomM ? 'Atom' : null;

    if (!block) { console.log('  ⚠️  item/entry 블록 없음'); continue; }

    console.log(`  Format: ${format}`);
    // 각 필드 파싱 시도
    const title = (
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      block.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] || '(없음)'
    ).slice(0, 80);

    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ||
                    block.match(/<updated>(.*?)<\/updated>/)?.[1] ||
                    block.match(/<published>(.*?)<\/published>/)?.[1] || '(없음)';

    const ms = new Date(pubDate).getTime();

    const link = block.match(/<link>(https?:\/\/[^<\s]+)/)?.[1] ||
                 block.match(/<link[^>]+href="(https?:\/\/[^"]+)"/)?.[1] ||
                 block.match(/<guid[^>]*>(https?:\/\/[^<\s]+)/)?.[1] || '(없음)';

    console.log(`  title   : ${title}`);
    console.log(`  pubDate : ${pubDate}`);
    console.log(`  ms      : ${ms} → ${isNaN(ms) ? '❌ NaN (날짜 파싱 실패)' : ms === 0 ? '❌ 0' : '✓ ' + new Date(ms).toISOString().slice(0,10)}`);
    console.log(`  link    : ${link}`);

    // 90일 cutoff 확인
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    if (!isNaN(ms) && ms > 0 && ms < cutoff) {
      console.log(`  ⚠️  cutoff 90일 초과 — 최신 항목 날짜: ${new Date(ms).toISOString().slice(0,10)}`);
    }

    // link 태그 원문 확인
    const rawLink = block.match(/<link[\s\S]*?>/)?.[0]?.slice(0, 120) || '(없음)';
    console.log(`  <link> raw: ${rawLink}`);
    const rawGuid = block.match(/<guid[\s\S]*?>([\s\S]*?)<\/guid>/)?.[0]?.slice(0, 120) || '(없음)';
    console.log(`  <guid> raw: ${rawGuid}`);

  } catch (e) {
    console.log(`  ❌ 오류: ${e.message}`);
  }
}
