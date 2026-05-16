const CUTOFF_MS = 90 * 24 * 60 * 60 * 1000;

function cutoff() { return Date.now() - CUTOFF_MS; }

function parseTitle(block) {
  return (
    block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
    block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ||
    ''
  ).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function parseMs(block) {
  const raw =
    block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ||
    block.match(/<published>(.*?)<\/published>/)?.[1] ||
    block.match(/<updated>(.*?)<\/updated>/)?.[1] || '';
  const ms = raw ? new Date(raw).getTime() : 0;
  return isNaN(ms) ? 0 : ms;
}

async function fetchRss(url, source, tag = 'item', limit = 12) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return [];
  const xml = await res.text();
  const cut = cutoff();
  const items = [];
  for (const m of xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g'))) {
    const title = parseTitle(m[1]);
    const ms = parseMs(m[1]);
    if (!title || ms < cut) continue;
    items.push({ title, date: new Date(ms).toISOString().slice(0, 10), source, ms });
    if (items.length >= limit) break;
  }
  return items;
}

let ytUploadsId = null;

async function fetchYoutube(apiKey) {
  if (!ytUploadsId) {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?forHandle=Gymshark&part=contentDetails&key=${apiKey}`
    );
    if (!r.ok) return [];
    const d = await r.json();
    ytUploadsId = d.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!ytUploadsId) return [];
  }
  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${ytUploadsId}&maxResults=12&part=snippet&key=${apiKey}`
  );
  if (!r.ok) return [];
  const d = await r.json();
  const cut = cutoff();
  return (d.items || []).flatMap(item => {
    const title = item.snippet?.title || '';
    const ms = new Date(item.snippet?.publishedAt || 0).getTime();
    if (!title || ms < cut) return [];
    return [{ title, date: new Date(ms).toISOString().slice(0, 10), source: 'youtube', ms }];
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const ytKey = process.env.YOUTUBE_API_KEY;

    const [blog, reddit, youtube] = await Promise.allSettled([
      fetchRss('https://www.gymshark.com/blogs/news.atom', 'blog', 'entry'),
      fetchRss('https://www.reddit.com/r/gymshark/.rss', 'reddit', 'entry'),
      ytKey ? fetchYoutube(ytKey) : Promise.resolve([]),
    ]);

    const items = [
      ...(blog.status === 'fulfilled' ? blog.value : []),
      ...(reddit.status === 'fulfilled' ? reddit.value : []),
      ...(youtube.status === 'fulfilled' ? youtube.value : []),
    ]
      .sort((a, b) => b.ms - a.ms)
      .map(({ ms, ...rest }) => rest);

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
