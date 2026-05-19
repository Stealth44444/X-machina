const res = await fetch('https://www.economist.com/finance-and-economics/rss.xml', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
});
const xml = await res.text();

// 첫 번째 <item> 블록 원문 출력
const m = xml.match(/<item>([\s\S]*?)<\/item>/);
if (!m) { console.log('item 없음'); process.exit(); }

const block = m[1];
// <title> 태그 부분만 추출 (앞뒤 50자 포함)
const titleIdx = block.indexOf('<title');
console.log('=== <title> 주변 원문 (200자) ===');
console.log(JSON.stringify(block.slice(titleIdx, titleIdx + 200)));
console.log();

// 테스트: 여러 title 정규식
const regexes = [
  { name: 'CDATA 무속성',    re: /<title><!\[CDATA\[([\s\S]*?)\]\]>/ },
  { name: 'CDATA 속성포함',  re: /<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]>/ },
  { name: '일반 텍스트',      re: /<title[^>]*>([\s\S]*?)<\/title>/ },
  { name: 'CDATA 닫기 포함', re: /<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/ },
];
for (const { name, re } of regexes) {
  const hit = block.match(re)?.[1];
  console.log(`[${name}] → ${hit ? JSON.stringify(hit.slice(0, 80)) : '(없음)'}`);
}
