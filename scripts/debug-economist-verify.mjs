const res = await fetch('https://www.economist.com/finance-and-economics/rss.xml', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
});
const xml = await res.text();
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 3);
for (const m of items) {
  const block = m[1];
  const title = (
    block.match(/<title[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ||
    block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g, '').trim() || '(없음)'
  ).replace(/\s*[-|]\s*[^-|]{1,50}$/, '').trim();
  console.log('✓', title.slice(0, 80));
}
