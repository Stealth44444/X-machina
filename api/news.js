const CUTOFF_MS = 90 * 24 * 60 * 60 * 1000;
function cutoff() { return Date.now() - CUTOFF_MS; }

function msToDate(ms) { return new Date(ms).toISOString().slice(0, 10); }

// ── Google News RSS ──────────────────────────────────────────────────────
async function fetchGoogleNews() {
  const url = 'https://news.google.com/rss/search?q=gymshark&hl=en-US&gl=US&ceid=US:en';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } });
  if (!res.ok) return [];
  const xml = await res.text();
  const cut = cutoff();
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = (
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
      block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''
    ).replace(/\s*-\s*[^-]{1,40}$/, '').trim();
    const ms = new Date(block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || 0).getTime();
    const link = block.match(/<link>(https?:\/\/[^<\s]+)/)?.[1] ||
                 block.match(/<guid[^>]*>(https?:\/\/[^<\s]+)/)?.[1] || '';
    if (!title || ms < cut) continue;
    items.push({ title, date: msToDate(ms), source: 'news', url: link, ms });
    if (items.length >= 24) break;
  }
  return items;
}

// ── Gymshark official blog (Next.js __NEXT_DATA__ parse) ─────────────────
const BLOG_URLS = [
  'https://www.gymshark.com/blog',
  'https://www.gymshark.com/blog/category/gymshark',
  'https://www.gymshark.com/blog/category/product-and-style',
  'https://www.gymshark.com/blog/category/fitness',
];

async function fetchBlogPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return [];
  const data = JSON.parse(m[1]);
  const cut = cutoff();
  const articles = [];
  function walk(obj, depth) {
    if (depth > 12 || !obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(v => walk(v, depth + 1)); return; }
    if (obj.publishDate && obj.title && obj.slug) {
      const ms = new Date(obj.publishDate).getTime();
      if (!isNaN(ms) && ms >= cut) {
        articles.push({
          title: obj.title,
          date: msToDate(ms),
          source: 'blog',
          url: `https://www.gymshark.com/blog/${obj.slug}`,
          ms,
        });
      }
      return;
    }
    Object.values(obj).forEach(v => walk(v, depth + 1));
  }
  walk(data, 0);
  return articles;
}

async function fetchBlog() {
  const results = await Promise.allSettled(BLOG_URLS.map(fetchBlogPage));
  const seen = new Set();
  const articles = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const a of r.value) {
      if (!seen.has(a.url)) { seen.add(a.url); articles.push(a); }
    }
  }
  return articles.sort((a, b) => b.ms - a.ms).slice(0, 20);
}

// ── Reddit r/gymshark ────────────────────────────────────────────────────
async function fetchReddit() {
  const res = await fetch('https://www.reddit.com/r/gymshark/new.json?limit=25&raw_json=1', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const cut = cutoff();
  return (data?.data?.children || []).flatMap(({ data: p }) => {
    const ms = p.created_utc * 1000;
    if (!p.title || ms < cut) return [];
    return [{ title: p.title, date: msToDate(ms), source: 'reddit', url: `https://www.reddit.com${p.permalink}`, ms }];
  }).slice(0, 12);
}

// ── YouTube Data API v3 ───────────────────────────────────────────────────
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
    const videoId = item.snippet?.resourceId?.videoId || '';
    if (!title || ms < cut) return [];
    return [{ title, date: msToDate(ms), source: 'youtube', url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '', ms }];
  });
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const ytKey = process.env.YOUTUBE_API_KEY;

    const [gnews, blog, reddit, youtube] = await Promise.allSettled([
      fetchGoogleNews(),
      fetchBlog(),
      fetchReddit(),
      ytKey ? fetchYoutube(ytKey) : Promise.resolve([]),
    ]);

    const sourceResults = {
      news:    gnews.status === 'fulfilled'   ? gnews.value   : [],
      blog:    blog.status === 'fulfilled'    ? blog.value    : [],
      reddit:  reddit.status === 'fulfilled'  ? reddit.value  : [],
      youtube: youtube.status === 'fulfilled' ? youtube.value : [],
    };
    const sourceStatus = Object.fromEntries(
      Object.entries(sourceResults).map(([k, v]) => [k, { ok: v.length > 0, count: v.length }])
    );

    const seen = new Set();
    let items = Object.values(sourceResults).flat()
      .sort((a, b) => b.ms - a.ms)
      .filter(item => {
        const key = item.title.toLowerCase().slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ ms, ...rest }) => rest);

    res.status(200).json({ items, sources: sourceStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
