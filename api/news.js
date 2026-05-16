export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const rssUrl = 'https://news.google.com/rss/search?q=gymshark&hl=en-US&gl=US&ceid=US:en';
    const rssRes = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    });
    if (!rssRes.ok) throw new Error(`RSS ${rssRes.status}`);
    const xml = await rssRes.text();

    const items = [];
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block = m[1];
      const rawTitle =
        block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
        block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
      const title = rawTitle.replace(/\s*-\s*[^-]{1,40}$/, '').trim();
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const date = pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '';
      if (title) items.push({ title, date });
      if (items.length >= 8) break;
    }

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
